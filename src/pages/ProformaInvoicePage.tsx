import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Pencil, Printer, X } from 'lucide-react';
import { MainLayout } from '@/components/layouts/MainLayout';
import {
  getProformaInvoices, getProformaInvoiceById, createProformaInvoice,
  updateProformaInvoice, deleteProformaInvoice, getCustomers, getProducts
} from '@/lib/api';
import type { ProformaInvoice, Customer, Product } from '@/types/types';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const inp = 'w-full rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 placeholder:text-gray-600 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring';
const lbl = 'mb-1 block text-xs font-medium text-muted-foreground';

interface LineItem {
  product_id: string | null;
  item_code: string;
  item_name: string;
  qty: number;
  rate: number;
  gst_percent: number;
  gst_amount: number;
  amount: number;
}

const emptyLine = (): LineItem => ({ product_id: null, item_code: '', item_name: '', qty: 1, rate: 0, gst_percent: 0, gst_amount: 0, amount: 0 });

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cls: Record<string, string> = {
    draft: 'status-badge-neutral', sent: 'status-badge-info',
    accepted: 'status-badge-success', rejected: 'status-badge-danger', cancelled: 'status-badge-danger',
  };
  return <span className={cls[status] || 'status-badge-neutral'}>{status}</span>;
};

const ProformaForm: React.FC<{
  initial?: ProformaInvoice | null;
  customers: Customer[];
  products: Product[];
  onSave: (inv: Partial<ProformaInvoice>, items: LineItem[]) => Promise<void>;
  onClose: () => void;
}> = ({ initial, customers, products, onSave, onClose }) => {
  const nextNo = `PI-${Date.now().toString().slice(-6)}`;
  const [hdr, setHdr] = useState({
    proforma_no: initial?.proforma_no || nextNo,
    proforma_date: initial?.proforma_date || new Date().toISOString().slice(0, 10),
    customer_id: initial?.customer_id || '',
    status: initial?.status || 'draft',
    terms_conditions: initial?.terms_conditions || 'Payment due within 30 days.\nAll prices are inclusive of GST unless stated.',
    notes: initial?.notes || '',
  });
  const [lines, setLines] = useState<LineItem[]>(
    initial?.proforma_invoice_items?.map(i => ({
      product_id: i.product_id, item_code: i.item_code || '', item_name: i.item_name,
      qty: i.qty, rate: i.rate, gst_percent: i.gst_percent, gst_amount: i.gst_amount, amount: i.amount,
    })) || [emptyLine()]
  );
  const [saving, setSaving] = useState(false);

  const recalc = (ls: LineItem[]): LineItem[] =>
    ls.map(l => {
      const base = l.qty * l.rate;
      const gst = +(base * (l.gst_percent / 100)).toFixed(2);
      return { ...l, gst_amount: gst, amount: +(base + gst).toFixed(2) };
    });

  const setLine = (i: number, k: keyof LineItem, v: unknown) => {
    const next = lines.map((l, idx) => idx === i ? { ...l, [k]: v } : l);
    setLines(recalc(next));
  };

  const pickProduct = (i: number, pid: string) => {
    const p = products.find(x => x.id === pid);
    if (!p) return;
    const next = lines.map((l, idx) => idx === i ? { ...l, product_id: pid, item_code: p.sku, item_name: p.name, rate: p.selling_price, gst_percent: p.gst_percent || 0 } : l);
    setLines(recalc(next));
  };

  const subtotal = lines.reduce((s, l) => s + l.qty * l.rate, 0);
  const taxAmount = lines.reduce((s, l) => s + l.gst_amount, 0);
  const total = subtotal + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lines.every(l => !l.item_name.trim())) { toast.error('Add at least one item'); return; }
    setSaving(true);
    await onSave({ ...hdr, customer_id: hdr.customer_id || null, subtotal, tax_amount: taxAmount, total },
      lines.filter(l => l.item_name.trim()));
    setSaving(false);
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div>
          <label className={lbl}>Proforma No</label>
          <input value={hdr.proforma_no} onChange={e => setHdr(h => ({ ...h, proforma_no: e.target.value }))} className={inp} />
        </div>
        <div>
          <label className={lbl}>Date</label>
          <input type="date" value={hdr.proforma_date} onChange={e => setHdr(h => ({ ...h, proforma_date: e.target.value }))} className={inp} />
        </div>
        <div className="col-span-2">
          <label className={lbl}>Customer</label>
          <select value={hdr.customer_id} onChange={e => setHdr(h => ({ ...h, customer_id: e.target.value }))} className={inp}>
            <option value="">Select customer…</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Line Items */}
      <div className="rounded border border-border overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {['Item', 'Code', 'Qty', 'Rate', 'GST%', 'GST Amt', 'Amount', ''].map(h => (
                <th key={h} className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-b border-border">
                <td className="px-2 py-1.5 min-w-[160px]">
                  <select value={l.product_id || ''} onChange={e => e.target.value ? pickProduct(i, e.target.value) : setLine(i, 'product_id', null)} className={inp}>
                    <option value="">Custom…</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  {!l.product_id && (
                    <input value={l.item_name} onChange={e => setLine(i, 'item_name', e.target.value)}
                      placeholder="Item name" className={cn(inp, 'mt-1')} />
                  )}
                </td>
                <td className="px-2 py-1.5 w-24"><input value={l.item_code} onChange={e => setLine(i, 'item_code', e.target.value)} className={inp} /></td>
                <td className="px-2 py-1.5 w-20"><input type="number" min={0.001} step={0.001} value={l.qty} onChange={e => setLine(i, 'qty', parseFloat(e.target.value) || 0)} className={inp} /></td>
                <td className="px-2 py-1.5 w-24"><input type="number" min={0} step={0.01} value={l.rate} onChange={e => setLine(i, 'rate', parseFloat(e.target.value) || 0)} className={inp} /></td>
                <td className="px-2 py-1.5 w-20"><input type="number" min={0} max={100} step={0.01} value={l.gst_percent} onChange={e => setLine(i, 'gst_percent', parseFloat(e.target.value) || 0)} className={inp} /></td>
                <td className="px-2 py-1.5 text-xs tabular-nums text-right w-20">{fmt(l.gst_amount)}</td>
                <td className="px-2 py-1.5 text-xs tabular-nums text-right font-semibold w-24">{fmt(l.amount)}</td>
                <td className="px-2 py-1.5">
                  <button type="button" onClick={() => setLines(ls => recalc(ls.filter((_, idx) => idx !== i)))} className="rounded p-1 text-muted-foreground hover:text-destructive">
                    <X size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={() => setLines(ls => [...ls, emptyLine()])}
        className="flex items-center gap-1 text-xs text-primary hover:underline">
        <Plus size={13} /> Add Line
      </button>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-64 space-y-1 rounded border border-border bg-muted/30 p-3">
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">{fmt(subtotal)}</span></div>
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">GST</span><span className="tabular-nums">{fmt(taxAmount)}</span></div>
          <div className="flex justify-between text-sm font-bold border-t border-border pt-1 mt-1"><span>Total</span><span className="tabular-nums">{fmt(total)}</span></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Terms & Conditions</label>
          <textarea value={hdr.terms_conditions || ''} onChange={e => setHdr(h => ({ ...h, terms_conditions: e.target.value }))} rows={3}
            className="w-full rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
        </div>
        <div>
          <label className={lbl}>Notes</label>
          <textarea value={hdr.notes || ''} onChange={e => setHdr(h => ({ ...h, notes: e.target.value }))} rows={3}
            className="w-full rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-border pt-3">
        <button type="button" onClick={onClose} className="rounded border border-border bg-background px-4 py-2 text-sm hover:bg-muted">Cancel</button>
        <button type="submit" disabled={saving} className="rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
          {saving ? 'Saving…' : 'Save Proforma'}
        </button>
      </div>
    </form>
  );
};

export const ProformaInvoicePage: React.FC = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<ProformaInvoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editInvoice, setEditInvoice] = useState<ProformaInvoice | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const [invRes, custRes, prodRes] = await Promise.all([
      getProformaInvoices(page, PAGE_SIZE),
      getCustomers(1, 500),
      getProducts(1, 500),
    ]);
    setInvoices(invRes.data);
    setTotal(invRes.count);
    setCustomers(custRes.data);
    setProducts(prodRes.data);
    setLoading(false);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handleEdit = async (id: string) => {
    const { data } = await getProformaInvoiceById(id);
    setEditInvoice(data);
    setFormOpen(true);
  };

  const handleSave = async (inv: Partial<ProformaInvoice>, items: LineItem[]) => {
    const payload = { ...inv, created_by: user?.id };
    let error;
    if (editInvoice?.id) {
      ({ error } = await updateProformaInvoice(editInvoice.id, payload, items));
    } else {
      ({ error } = await createProformaInvoice(payload, items));
    }
    if (error) { toast.error(error.message); return; }
    toast.success(editInvoice ? 'Proforma updated' : 'Proforma created');
    setFormOpen(false); setEditInvoice(null); load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await deleteProformaInvoice(deleteId);
    if (error) { toast.error(error.message); return; }
    toast.success('Proforma deleted'); setDeleteId(null); load();
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Proforma Invoice</h2>
            <p className="text-sm text-muted-foreground">{total} proforma invoice{total !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => { setEditInvoice(null); setFormOpen(true); }}
            className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
            <Plus size={16} /> New Proforma
          </button>
        </div>

        <div className="rounded border border-border bg-card shadow-card overflow-x-auto">
          <table className="w-full min-w-max">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {['Proforma No', 'Date', 'Customer', 'Subtotal', 'GST', 'Total', 'Status', 'Actions'].map(h => (
                  <th key={h} className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {[...Array(8)].map((_, j) => <td key={j} className="px-4 py-2.5"><div className="h-4 w-20 animate-pulse rounded bg-muted" /></td>)}
                  </tr>
                ))
              ) : invoices.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">No proforma invoices found</td></tr>
              ) : invoices.map(inv => (
                <tr key={inv.id} className="border-b border-border erp-table-row">
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-primary">{inv.proforma_no}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs">{inv.proforma_date}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs">{inv.customers?.name || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-right tabular-nums">{fmt(inv.subtotal)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-right tabular-nums">{fmt(inv.tax_amount)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-right tabular-nums font-semibold">{fmt(inv.total)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5"><StatusBadge status={inv.status} /></td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleEdit(inv.id)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => window.print()} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" title="Print">
                        <Printer size={14} />
                      </button>
                      <button onClick={() => setDeleteId(inv.id)} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="rounded border border-border px-3 py-1.5 hover:bg-muted disabled:opacity-40">Prev</button>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="rounded border border-border px-3 py-1.5 hover:bg-muted disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={open => { if (!open) { setFormOpen(false); setEditInvoice(null); } }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-5xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editInvoice ? 'Edit Proforma Invoice' : 'New Proforma Invoice'}</DialogTitle>
          </DialogHeader>
          <ProformaForm initial={editInvoice} customers={customers} products={products}
            onSave={handleSave} onClose={() => { setFormOpen(false); setEditInvoice(null); }} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Proforma</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this proforma invoice and all its line items.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};


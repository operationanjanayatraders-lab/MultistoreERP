import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Pencil, Printer, X } from 'lucide-react';
import { MainLayout } from '@/components/layouts/MainLayout';
import {
  getQuotations, getQuotationById, createQuotation,
  updateQuotation, deleteQuotation, getCustomers, getProducts
} from '@/lib/api';
import type { Quotation, Customer, Product } from '@/types/types';
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
  discount_percent: number;
  discount_amount: number;
  gst_percent: number;
  gst_amount: number;
  amount: number;
}

const emptyLine = (): LineItem => ({ product_id: null, item_code: '', item_name: '', qty: 1, rate: 0, discount_percent: 0, discount_amount: 0, gst_percent: 0, gst_amount: 0, amount: 0 });

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cls: Record<string, string> = {
    draft: 'status-badge-neutral', sent: 'status-badge-info',
    accepted: 'status-badge-success', rejected: 'status-badge-danger', expired: 'status-badge-neutral',
  };
  return <span className={cls[status] || 'status-badge-neutral'}>{status}</span>;
};

const QuotationForm: React.FC<{
  initial?: Quotation | null;
  customers: Customer[];
  products: Product[];
  onSave: (q: Partial<Quotation>, items: LineItem[]) => Promise<void>;
  onClose: () => void;
}> = ({ initial, customers, products, onSave, onClose }) => {
  const nextNo = `QT-${Date.now().toString().slice(-6)}`;
  const [hdr, setHdr] = useState({
    quotation_no: initial?.quotation_no || nextNo,
    quotation_date: initial?.quotation_date || new Date().toISOString().slice(0, 10),
    valid_until: initial?.valid_until || (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10); })(),
    customer_id: initial?.customer_id || '',
    status: initial?.status || 'draft',
    notes: initial?.notes || '',
  });
  const [lines, setLines] = useState<LineItem[]>(
    initial?.quotation_items?.map(i => ({
      product_id: i.product_id, item_code: i.item_code || '', item_name: i.item_name,
      qty: i.qty, rate: i.rate, discount_percent: i.discount_percent,
      discount_amount: i.discount_amount, gst_percent: i.gst_percent, gst_amount: i.gst_amount, amount: i.amount,
    })) || [emptyLine()]
  );
  const [saving, setSaving] = useState(false);

  const recalc = (ls: LineItem[]): LineItem[] =>
    ls.map(l => {
      const base = l.qty * l.rate;
      const disc = +(base * (l.discount_percent / 100)).toFixed(2);
      const afterDisc = base - disc;
      const gst = +(afterDisc * (l.gst_percent / 100)).toFixed(2);
      return { ...l, discount_amount: disc, gst_amount: gst, amount: +(afterDisc + gst).toFixed(2) };
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
  const totalDiscount = lines.reduce((s, l) => s + l.discount_amount, 0);
  const taxAmount = lines.reduce((s, l) => s + l.gst_amount, 0);
  const total = subtotal - totalDiscount + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lines.every(l => !l.item_name.trim())) { toast.error('Add at least one item'); return; }
    setSaving(true);
    await onSave({ ...hdr, customer_id: hdr.customer_id || null, subtotal, discount_amount: totalDiscount, tax_amount: taxAmount, total },
      lines.filter(l => l.item_name.trim()));
    setSaving(false);
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div>
          <label className={lbl}>Quotation No</label>
          <input value={hdr.quotation_no} onChange={e => setHdr(h => ({ ...h, quotation_no: e.target.value }))} className={inp} />
        </div>
        <div>
          <label className={lbl}>Date</label>
          <input type="date" value={hdr.quotation_date} onChange={e => setHdr(h => ({ ...h, quotation_date: e.target.value }))} className={inp} />
        </div>
        <div>
          <label className={lbl}>Valid Until</label>
          <input type="date" value={hdr.valid_until} onChange={e => setHdr(h => ({ ...h, valid_until: e.target.value }))} className={inp} />
        </div>
        <div>
          <label className={lbl}>Customer</label>
          <select value={hdr.customer_id} onChange={e => setHdr(h => ({ ...h, customer_id: e.target.value }))} className={inp}>
            <option value="">Select customer…</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Line Items */}
      <div className="rounded border border-border overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {['Item', 'Code', 'Qty', 'Rate', 'Disc%', 'Disc Amt', 'GST%', 'GST Amt', 'Amount', ''].map(h => (
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
                    <input value={l.item_name} onChange={e => setLine(i, 'item_name', e.target.value)} placeholder="Item name" className={cn(inp, 'mt-1')} />
                  )}
                </td>
                <td className="px-2 py-1.5 w-20"><input value={l.item_code} onChange={e => setLine(i, 'item_code', e.target.value)} className={inp} /></td>
                <td className="px-2 py-1.5 w-16"><input type="number" min={0.001} step={0.001} value={l.qty} onChange={e => setLine(i, 'qty', parseFloat(e.target.value) || 0)} className={inp} /></td>
                <td className="px-2 py-1.5 w-20"><input type="number" min={0} step={0.01} value={l.rate} onChange={e => setLine(i, 'rate', parseFloat(e.target.value) || 0)} className={inp} /></td>
                <td className="px-2 py-1.5 w-16"><input type="number" min={0} max={100} step={0.01} value={l.discount_percent} onChange={e => setLine(i, 'discount_percent', parseFloat(e.target.value) || 0)} className={inp} /></td>
                <td className="px-2 py-1.5 text-xs tabular-nums text-right w-20">{fmt(l.discount_amount)}</td>
                <td className="px-2 py-1.5 w-16"><input type="number" min={0} max={100} step={0.01} value={l.gst_percent} onChange={e => setLine(i, 'gst_percent', parseFloat(e.target.value) || 0)} className={inp} /></td>
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
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Discount</span><span className="tabular-nums text-destructive">-{fmt(totalDiscount)}</span></div>
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">GST</span><span className="tabular-nums">{fmt(taxAmount)}</span></div>
          <div className="flex justify-between text-sm font-bold border-t border-border pt-1 mt-1"><span>Total</span><span className="tabular-nums">{fmt(total)}</span></div>
        </div>
      </div>

      <div>
        <label className={lbl}>Notes</label>
        <textarea value={hdr.notes || ''} onChange={e => setHdr(h => ({ ...h, notes: e.target.value }))} rows={2}
          className="w-full rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
      </div>

      <div className="flex justify-end gap-2 border-t border-border pt-3">
        <button type="button" onClick={onClose} className="rounded border border-border bg-background px-4 py-2 text-sm hover:bg-muted">Cancel</button>
        <button type="submit" disabled={saving} className="rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
          {saving ? 'Saving…' : 'Save Quotation'}
        </button>
      </div>
    </form>
  );
};

export const QuotationPage: React.FC = () => {
  const { user } = useAuth();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editQuotation, setEditQuotation] = useState<Quotation | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const [qRes, custRes, prodRes] = await Promise.all([
      getQuotations(page, PAGE_SIZE),
      getCustomers(1, 500),
      getProducts(1, 500),
    ]);
    setQuotations(qRes.data);
    setTotal(qRes.count);
    setCustomers(custRes.data);
    setProducts(prodRes.data);
    setLoading(false);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handleEdit = async (id: string) => {
    const { data } = await getQuotationById(id);
    setEditQuotation(data);
    setFormOpen(true);
  };

  const handleSave = async (q: Partial<Quotation>, items: LineItem[]) => {
    const payload = { ...q, created_by: user?.id };
    let error;
    if (editQuotation?.id) {
      ({ error } = await updateQuotation(editQuotation.id, payload, items));
    } else {
      ({ error } = await createQuotation(payload, items));
    }
    if (error) { toast.error(error.message); return; }
    toast.success(editQuotation ? 'Quotation updated' : 'Quotation created');
    setFormOpen(false); setEditQuotation(null); load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await deleteQuotation(deleteId);
    if (error) { toast.error(error.message); return; }
    toast.success('Quotation deleted'); setDeleteId(null); load();
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Quotation</h2>
            <p className="text-sm text-muted-foreground">{total} quotation{total !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => { setEditQuotation(null); setFormOpen(true); }}
            className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
            <Plus size={16} /> New Quotation
          </button>
        </div>

        <div className="rounded border border-border bg-card shadow-card overflow-x-auto">
          <table className="w-full min-w-max">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {['Quotation No', 'Date', 'Valid Until', 'Customer', 'Subtotal', 'Discount', 'Total', 'Status', 'Actions'].map(h => (
                  <th key={h} className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {[...Array(9)].map((_, j) => <td key={j} className="px-4 py-2.5"><div className="h-4 w-20 animate-pulse rounded bg-muted" /></td>)}
                  </tr>
                ))
              ) : quotations.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">No quotations found</td></tr>
              ) : quotations.map(q => (
                <tr key={q.id} className="border-b border-border erp-table-row">
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-primary">{q.quotation_no}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs">{q.quotation_date}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">{q.valid_until || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs">{q.customers?.name || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-right tabular-nums">{fmt(q.subtotal)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-right tabular-nums text-destructive">-{fmt(q.discount_amount)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-right tabular-nums font-semibold">{fmt(q.total)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5"><StatusBadge status={q.status} /></td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleEdit(q.id)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => window.print()} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" title="Print">
                        <Printer size={14} />
                      </button>
                      <button onClick={() => setDeleteId(q.id)} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Delete">
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

      <Dialog open={formOpen} onOpenChange={open => { if (!open) { setFormOpen(false); setEditQuotation(null); } }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-6xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editQuotation ? 'Edit Quotation' : 'New Quotation'}</DialogTitle>
          </DialogHeader>
          <QuotationForm initial={editQuotation} customers={customers} products={products}
            onSave={handleSave} onClose={() => { setFormOpen(false); setEditQuotation(null); }} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quotation</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this quotation and all its line items.</AlertDialogDescription>
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


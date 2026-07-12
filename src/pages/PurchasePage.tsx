import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { MainLayout } from '@/components/layouts/MainLayout';
import { getPurchaseOrders, createPurchaseOrder, deletePurchaseOrder, updatePurchaseOrderStatus, getSuppliers, getProducts } from '@/lib/api';
import type { PurchaseOrder, Supplier, Product } from '@/types/types';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';

interface LineItem { product_id: string; quantity: number; unit_price: number; total: number; }
const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

const PurchaseForm: React.FC<{
  suppliers: Supplier[];
  products: Product[];
  userId: string;
  onSave: (o: Parameters<typeof createPurchaseOrder>[0], items: Parameters<typeof createPurchaseOrder>[1]) => Promise<void>;
  onClose: () => void;
}> = ({ suppliers, products, userId, onSave, onClose }) => {
  const [supplierId, setSupplierId] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineItem[]>([{ product_id: '', quantity: 1, unit_price: 0, total: 0 }]);
  const [saving, setSaving] = useState(false);

  const subtotal = lines.reduce((s, l) => s + l.total, 0);

  const setLine = (i: number, k: keyof LineItem, v: string | number) => {
    setLines(prev => {
      const updated = [...prev];
      const line = { ...updated[i], [k]: v };
      if (k === 'product_id') {
        const prod = products.find(p => p.id === v);
        line.unit_price = prod?.purchase_price ?? 0;
        line.total = line.quantity * line.unit_price;
      } else if (k === 'quantity' || k === 'unit_price') {
        line.total = (k === 'quantity' ? Number(v) : line.quantity) * (k === 'unit_price' ? Number(v) : line.unit_price);
      }
      updated[i] = line;
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) { toast.error('Select a supplier'); return; }
    const validLines = lines.filter(l => l.product_id && l.quantity > 0);
    if (validLines.length === 0) { toast.error('Add at least one line item'); return; }
    setSaving(true);
    const num = `PO-${Date.now()}`;
    await onSave(
      { order_number: num, supplier_id: supplierId, order_date: orderDate, notes: notes || null, subtotal, discount: 0, total: subtotal, status: 'draft', created_by: userId },
      validLines.map(l => ({ product_id: l.product_id, quantity: l.quantity, unit_price: l.unit_price, total: l.total }))
    );
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-normal">Supplier *</label>
          <select value={supplierId} onChange={e => setSupplierId(e.target.value)}
            className="w-full rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="">Select supplier</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-normal">Order Date</label>
          <input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)}
            className="w-full rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
      </div>
      <div className="rounded border border-border overflow-x-auto">
        <table className="w-full min-w-max">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {['Product', 'Qty', 'Unit Price', 'Total', ''].map(h => (
                <th key={h} className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className="border-b border-border">
                <td className="px-3 py-1.5">
                  <select value={line.product_id} onChange={e => setLine(i, 'product_id', e.target.value)}
                    className="w-full rounded border border-input bg-input px-2 py-1.5 text-sm focus:border-primary focus:outline-none">
                    <option value="">Select</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </td>
                <td className="px-3 py-1.5">
                  <input type="number" min={1} value={line.quantity} onChange={e => setLine(i, 'quantity', parseInt(e.target.value) || 1)}
                    className="w-16 rounded border border-input bg-input px-2 py-1.5 text-sm tabular-nums focus:border-primary focus:outline-none" />
                </td>
                <td className="px-3 py-1.5">
                  <input type="number" min={0} step={0.01} value={line.unit_price} onChange={e => setLine(i, 'unit_price', parseFloat(e.target.value) || 0)}
                    className="w-24 rounded border border-input bg-input px-2 py-1.5 text-sm tabular-nums focus:border-primary focus:outline-none" />
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-sm tabular-nums">{fmt(line.total)}</td>
                <td className="px-3 py-1.5">
                  {lines.length > 1 && (
                    <button type="button" onClick={() => setLines(prev => prev.filter((_, j) => j !== i))}
                      className="text-muted-foreground hover:text-destructive">✕</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={() => setLines(prev => [...prev, { product_id: '', quantity: 1, unit_price: 0, total: 0 }])}
        className="text-sm text-primary hover:underline">+ Add line</button>
      <div className="flex justify-end">
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-xl font-bold tabular-nums">{fmt(subtotal)}</p>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-normal">Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          className="w-full rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 focus:border-primary focus:outline-none resize-none" />
      </div>
      <DialogFooter>
        <button type="button" onClick={onClose} className="rounded border border-border bg-background px-4 py-2 text-sm hover:bg-muted">Cancel</button>
        <button type="submit" disabled={saving} className="rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
          {saving ? 'Saving…' : 'Create Purchase Order'}
        </button>
      </DialogFooter>
    </form>
  );
};

export const PurchasePage: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const [ordRes, supRes, prodRes] = await Promise.all([
      getPurchaseOrders(page, PAGE_SIZE),
      getSuppliers(1, 100),
      getProducts(1, 200),
    ]);
    setOrders(ordRes.data);
    setTotal(ordRes.count);
    setSuppliers(supRes.data);
    setProducts(prodRes.data);
    setLoading(false);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (o: Parameters<typeof createPurchaseOrder>[0], items: Parameters<typeof createPurchaseOrder>[1]) => {
    const { error } = await createPurchaseOrder(o, items);
    if (error) { toast.error(error.message); return; }
    toast.success('Purchase order created');
    setFormOpen(false); load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await deletePurchaseOrder(deleteId);
    if (error) { toast.error(error.message); return; }
    toast.success('Deleted'); setDeleteId(null); load();
  };

  const handleStatusChange = async (id: string, status: PurchaseOrder['status']) => {
    await updatePurchaseOrderStatus(id, status);
    toast.success('Status updated'); load();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Purchase Orders</h2>
            <p className="text-sm text-muted-foreground">{total} orders total</p>
          </div>
          <button onClick={() => setFormOpen(true)}
            className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
            <Plus size={16} /> New Purchase Order
          </button>
        </div>

        <div className="rounded border border-border bg-card shadow-card overflow-x-auto">
          <table className="w-full min-w-max">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {['Order #', 'Supplier', 'Date', 'Total', 'Status', 'Actions'].map(h => (
                  <th key={h} className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => <tr key={i} className="border-b border-border">{[...Array(6)].map((_, j) => <td key={j} className="px-4 py-2.5"><div className="h-4 w-20 animate-pulse rounded bg-muted" /></td>)}</tr>)
              ) : orders.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">No purchase orders yet</td></tr>
              ) : orders.map(o => (
                <tr key={o.id} className="border-b border-border erp-table-row">
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs font-bold text-primary">{o.order_number}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-sm">{o.suppliers?.name || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">{o.order_date}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-sm font-semibold tabular-nums">{fmt(o.total)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <select value={o.status} onChange={e => handleStatusChange(o.id, e.target.value as PurchaseOrder['status'])}
                      className="rounded border border-input bg-input px-2 py-1 text-xs focus:border-primary focus:outline-none">
                      <option value="draft">draft</option>
                      <option value="confirmed">confirmed</option>
                      <option value="received">received</option>
                      <option value="cancelled">cancelled</option>
                    </select>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <button onClick={() => setDeleteId(o.id)} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 size={14} /></button>
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

      <Dialog open={formOpen} onOpenChange={open => { if (!open) setFormOpen(false); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-3xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Purchase Order</DialogTitle></DialogHeader>
          <PurchaseForm suppliers={suppliers} products={products} userId={user?.id || ''} onSave={handleSave} onClose={() => setFormOpen(false)} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader><AlertDialogTitle>Delete Purchase Order</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};


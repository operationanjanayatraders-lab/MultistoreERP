import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { MainLayout } from '@/components/layouts/MainLayout';
import { getPurchaseReturns, createPurchaseReturn, deletePurchaseReturn, getSuppliers, getProducts, getPurchaseOrders } from '@/lib/api';
import type { PurchaseReturn, Supplier, Product, PurchaseOrder } from '@/types/types';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

const PurchaseReturnForm: React.FC<{
  suppliers: Supplier[];
  products: Product[];
  orders: PurchaseOrder[];
  userId: string;
  onSave: (r: Parameters<typeof createPurchaseReturn>[0], items: Parameters<typeof createPurchaseReturn>[1]) => Promise<void>;
  onClose: () => void;
}> = ({ suppliers, products, orders, userId, onSave, onClose }) => {
  const [supplierId, setSupplierId] = useState('');
  const [orderId, setOrderId] = useState('');
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [lines, setLines] = useState([{ product_id: '', quantity: 1, unit_price: 0, total: 0 }]);
  const [saving, setSaving] = useState(false);

  const totalAmount = lines.reduce((s, l) => s + l.total, 0);

  const setLine = (i: number, k: string, v: string | number) => {
    setLines(prev => {
      const u = [...prev];
      const line = { ...u[i], [k]: v };
      if (k === 'product_id') {
        const p = products.find(x => x.id === v);
        line.unit_price = p?.purchase_price ?? 0;
        line.total = line.quantity * line.unit_price;
      } else if (k === 'quantity' || k === 'unit_price') {
        const qty = k === 'quantity' ? Number(v) : line.quantity;
        const price = k === 'unit_price' ? Number(v) : line.unit_price;
        line.total = qty * price;
      }
      u[i] = line;
      return u;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validLines = lines.filter(l => l.product_id && l.quantity > 0);
    if (validLines.length === 0) { toast.error('Add at least one line'); return; }
    setSaving(true);
    await onSave(
      { return_number: `PR-${Date.now()}`, supplier_id: supplierId || null, purchase_order_id: orderId || null, return_date: returnDate, total: totalAmount, reason: reason || null, status: 'draft', created_by: userId },
      validLines.map(l => ({ product_id: l.product_id, quantity: l.quantity, unit_price: l.unit_price, total: l.total }))
    );
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-normal">Supplier</label>
          <select value={supplierId} onChange={e => setSupplierId(e.target.value)}
            className="w-full rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="">Select supplier</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-normal">Original Purchase Order</label>
          <select value={orderId} onChange={e => setOrderId(e.target.value)}
            className="w-full rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="">Select order (optional)</option>
            {orders.map(o => <option key={o.id} value={o.id}>{o.order_number}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-normal">Return Date</label>
          <input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)}
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
                  {lines.length > 1 && <button type="button" onClick={() => setLines(prev => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">✕</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={() => setLines(prev => [...prev, { product_id: '', quantity: 1, unit_price: 0, total: 0 }])} className="text-sm text-primary hover:underline">+ Add line</button>

      <div className="flex justify-end">
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Total Return Amount</p>
          <p className="text-xl font-bold tabular-nums">{fmt(totalAmount)}</p>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-normal">Reason</label>
        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
          className="w-full rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 focus:border-primary focus:outline-none resize-none" />
      </div>

      <DialogFooter>
        <button type="button" onClick={onClose} className="rounded border border-border bg-background px-4 py-2 text-sm hover:bg-muted">Cancel</button>
        <button type="submit" disabled={saving} className="rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
          {saving ? 'Saving…' : 'Create Purchase Return'}
        </button>
      </DialogFooter>
    </form>
  );
};

export const PurchaseReturnPage: React.FC = () => {
  const { user } = useAuth();
  const [returns, setReturns] = useState<PurchaseReturn[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const [rRes, sRes, pRes, oRes] = await Promise.all([getPurchaseReturns(page, PAGE_SIZE), getSuppliers(1, 100), getProducts(1, 200), getPurchaseOrders(1, 100)]);
    setReturns(rRes.data); setTotal(rRes.count); setSuppliers(sRes.data); setProducts(pRes.data); setOrders(oRes.data);
    setLoading(false);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (r: Parameters<typeof createPurchaseReturn>[0], items: Parameters<typeof createPurchaseReturn>[1]) => {
    const { error } = await createPurchaseReturn(r, items);
    if (error) { toast.error(error.message); return; }
    toast.success('Purchase return created'); setFormOpen(false); load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await deletePurchaseReturn(deleteId);
    if (error) { toast.error(error.message); return; }
    toast.success('Deleted'); setDeleteId(null); load();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Purchase Returns</h2>
            <p className="text-sm text-muted-foreground">{total} return records</p>
          </div>
          <button onClick={() => setFormOpen(true)} className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
            <Plus size={16} /> New Purchase Return
          </button>
        </div>

        <div className="rounded border border-border bg-card shadow-card overflow-x-auto">
          <table className="w-full min-w-max">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {['Return #', 'Supplier', 'Date', 'Total', 'Status', 'Actions'].map(h => (
                  <th key={h} className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(4)].map((_, i) => <tr key={i} className="border-b border-border">{[...Array(6)].map((_, j) => <td key={j} className="px-4 py-2.5"><div className="h-4 w-20 animate-pulse rounded bg-muted" /></td>)}</tr>)
              ) : returns.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">No purchase returns yet</td></tr>
              ) : returns.map(r => (
                <tr key={r.id} className="border-b border-border erp-table-row">
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs font-bold text-primary">{r.return_number}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-sm">{r.suppliers?.name || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">{r.return_date}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-sm font-semibold tabular-nums">{fmt(r.total)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <span className={r.status === 'completed' ? 'status-badge-success' : r.status === 'cancelled' ? 'status-badge-danger' : 'status-badge-neutral'}>{r.status}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <button onClick={() => setDeleteId(r.id)} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 size={14} /></button>
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
          <DialogHeader><DialogTitle>New Purchase Return</DialogTitle></DialogHeader>
          <PurchaseReturnForm suppliers={suppliers} products={products} orders={orders} userId={user?.id || ''} onSave={handleSave} onClose={() => setFormOpen(false)} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader><AlertDialogTitle>Delete Return</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};


import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Eye } from 'lucide-react';
import { MainLayout } from '@/components/layouts/MainLayout';
import { getSalesOrders, createSalesOrder, deleteSalesOrder, updateSalesOrderStatus, getCustomers, getProducts } from '@/lib/api';
import type { SalesOrder, Customer, Product } from '@/types/types';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';

interface LineItem { product_id: string; quantity: number; unit_price: number; total: number; }

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

const statusClass = (s: string) => {
  if (s === 'completed') return 'status-badge-success';
  if (s === 'confirmed') return 'status-badge-info';
  if (s === 'cancelled') return 'status-badge-danger';
  return 'status-badge-neutral';
};

const SalesForm: React.FC<{
  customers: Customer[];
  products: Product[];
  userId: string;
  onSave: (o: Parameters<typeof createSalesOrder>[0], items: Parameters<typeof createSalesOrder>[1]) => Promise<void>;
  onClose: () => void;
}> = ({ customers, products, userId, onSave, onClose }) => {
  const [customerId, setCustomerId] = useState('');
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
        line.unit_price = prod?.selling_price ?? 0;
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
    if (!customerId) { toast.error('Select a customer'); return; }
    const validLines = lines.filter(l => l.product_id && l.quantity > 0);
    if (validLines.length === 0) { toast.error('Add at least one line item'); return; }
    setSaving(true);
    const num = `SO-${Date.now()}`;
    await onSave(
      { order_number: num, customer_id: customerId, order_date: orderDate, notes: notes || null, subtotal, discount: 0, total: subtotal, status: 'draft', created_by: userId },
      validLines.map(l => ({ product_id: l.product_id, quantity: l.quantity, unit_price: l.unit_price, total: l.total }))
    );
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-normal">Customer *</label>
          <select value={customerId} onChange={e => setCustomerId(e.target.value)}
            className="w-full rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="">Select customer</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-normal">Order Date</label>
          <input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)}
            className="w-full rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
      </div>

      {/* Line items */}
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
                    className="w-full rounded border border-input bg-input px-2 py-1.5 text-sm !text-gray-900 focus:border-primary focus:outline-none">
                    <option value="">Select</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </td>
                <td className="px-3 py-1.5">
                  <input type="number" min={1} value={line.quantity} onChange={e => setLine(i, 'quantity', parseInt(e.target.value) || 1)}
                    className="w-16 rounded border border-input bg-input px-2 py-1.5 text-sm tabular-nums !text-gray-900 focus:border-primary focus:outline-none" />
                </td>
                <td className="px-3 py-1.5">
                  <input type="number" min={0} step={0.01} value={line.unit_price} onChange={e => setLine(i, 'unit_price', parseFloat(e.target.value) || 0)}
                    className="w-24 rounded border border-input bg-input px-2 py-1.5 text-sm tabular-nums !text-gray-900 focus:border-primary focus:outline-none" />
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
          <p className="text-sm text-muted-foreground">Subtotal</p>
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
          {saving ? 'Saving…' : 'Create Sales Order'}
        </button>
      </DialogFooter>
    </form>
  );
};

export const SalesPage: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewOrder, setViewOrder] = useState<SalesOrder | null>(null);
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const [ordRes, custRes, prodRes] = await Promise.all([
      getSalesOrders(page, PAGE_SIZE),
      getCustomers(1, 100),
      getProducts(1, 200),
    ]);
    setOrders(ordRes.data);
    setTotal(ordRes.count);
    setCustomers(custRes.data);
    setProducts(prodRes.data);
    setLoading(false);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (o: Parameters<typeof createSalesOrder>[0], items: Parameters<typeof createSalesOrder>[1]) => {
    const { error } = await createSalesOrder(o, items);
    if (error) { toast.error(error.message); return; }
    toast.success('Sales order created');
    setFormOpen(false); load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await deleteSalesOrder(deleteId);
    if (error) { toast.error(error.message); return; }
    toast.success('Deleted'); setDeleteId(null); load();
  };

  const handleStatusChange = async (id: string, status: SalesOrder['status']) => {
    await updateSalesOrderStatus(id, status);
    toast.success('Status updated'); load();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Sales Orders</h2>
            <p className="text-sm text-muted-foreground">{total} orders total</p>
          </div>
          <button onClick={() => setFormOpen(true)}
            className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
            <Plus size={16} /> New Sales Order
          </button>
        </div>

        <div className="rounded border border-border bg-card shadow-card overflow-x-auto">
          <table className="w-full min-w-max">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {['Order #', 'Customer', 'Date', 'Total', 'Status', 'Actions'].map(h => (
                  <th key={h} className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => <tr key={i} className="border-b border-border">{[...Array(6)].map((_, j) => <td key={j} className="px-4 py-2.5"><div className="h-4 w-20 animate-pulse rounded bg-muted" /></td>)}</tr>)
              ) : orders.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">No sales orders yet</td></tr>
              ) : orders.map(o => (
                <tr key={o.id} className="border-b border-border erp-table-row">
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs font-bold text-primary">{o.order_number}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-sm">{o.customers?.name || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">{o.order_date}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-sm font-semibold tabular-nums">{fmt(o.total)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <select value={o.status} onChange={e => handleStatusChange(o.id, e.target.value as SalesOrder['status'])}
                      className="rounded border border-input bg-input px-2 py-1 text-xs focus:border-primary focus:outline-none">
                      <option value="draft">draft</option>
                      <option value="confirmed">confirmed</option>
                      <option value="completed">completed</option>
                      <option value="cancelled">cancelled</option>
                    </select>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <div className="flex gap-1">
                      <button onClick={() => setDeleteId(o.id)} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 size={14} /></button>
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

      <Dialog open={formOpen} onOpenChange={open => { if (!open) setFormOpen(false); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-3xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Sales Order</DialogTitle></DialogHeader>
          <SalesForm customers={customers} products={products} userId={user?.id || ''} onSave={handleSave} onClose={() => setFormOpen(false)} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader><AlertDialogTitle>Delete Sales Order</AlertDialogTitle>
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


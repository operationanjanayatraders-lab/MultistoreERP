import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { MainLayout } from '@/components/layouts/MainLayout';
import { getStockTransfers, createStockTransfer, deleteStockTransfer, getWarehouses, getProducts } from '@/lib/api';
import type { StockTransfer, Warehouse, Product } from '@/types/types';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';

const TransferForm: React.FC<{
  warehouses: Warehouse[];
  products: Product[];
  userId: string;
  onSave: (t: Parameters<typeof createStockTransfer>[0], items: Parameters<typeof createStockTransfer>[1]) => Promise<void>;
  onClose: () => void;
}> = ({ warehouses, products, userId, onSave, onClose }) => {
  const [fromWh, setFromWh] = useState('');
  const [toWh, setToWh] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([{ product_id: '', quantity: 1 }]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromWh || !toWh) { toast.error('Select both warehouses'); return; }
    if (fromWh === toWh) { toast.error('Source and destination must be different'); return; }
    const validLines = lines.filter(l => l.product_id && l.quantity > 0);
    if (validLines.length === 0) { toast.error('Add at least one product'); return; }
    setSaving(true);
    await onSave(
      { transfer_number: `ST-${Date.now()}`, from_warehouse_id: fromWh, to_warehouse_id: toWh, transfer_date: date, notes: notes || null, status: 'draft', created_by: userId },
      validLines
    );
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-normal">From Warehouse *</label>
          <select value={fromWh} onChange={e => setFromWh(e.target.value)}
            className="w-full rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="">Select source</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-normal">To Warehouse *</label>
          <select value={toWh} onChange={e => setToWh(e.target.value)}
            className="w-full rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="">Select destination</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-normal">Transfer Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Products to Transfer</p>
        {lines.map((line, i) => (
          <div key={i} className="flex items-center gap-2">
            <select value={line.product_id} onChange={e => setLines(prev => { const u = [...prev]; u[i] = { ...u[i], product_id: e.target.value }; return u; })}
              className="flex-1 rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 focus:border-primary focus:outline-none">
              <option value="">Select product</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="number" min={1} value={line.quantity} onChange={e => setLines(prev => { const u = [...prev]; u[i] = { ...u[i], quantity: parseInt(e.target.value) || 1 }; return u; })}
              className="w-20 rounded border border-input bg-input px-3 py-2 text-sm tabular-nums !text-gray-900 focus:border-primary focus:outline-none" />
            {lines.length > 1 && (
              <button type="button" onClick={() => setLines(prev => prev.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-destructive">✕</button>
            )}
          </div>
        ))}
        <button type="button" onClick={() => setLines(prev => [...prev, { product_id: '', quantity: 1 }])}
          className="text-sm text-primary hover:underline">+ Add product</button>
      </div>

      <div>
        <label className="mb-1 block text-sm font-normal">Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          className="w-full rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 focus:border-primary focus:outline-none resize-none" />
      </div>

      <DialogFooter>
        <button type="button" onClick={onClose} className="rounded border border-border bg-background px-4 py-2 text-sm hover:bg-muted">Cancel</button>
        <button type="submit" disabled={saving} className="rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
          {saving ? 'Saving…' : 'Create Transfer'}
        </button>
      </DialogFooter>
    </form>
  );
};

export const StockTransferPage: React.FC = () => {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const [tRes, wRes, pRes] = await Promise.all([
      getStockTransfers(page, PAGE_SIZE),
      getWarehouses(),
      getProducts(1, 200),
    ]);
    setTransfers(tRes.data);
    setTotal(tRes.count);
    setWarehouses(wRes.data);
    setProducts(pRes.data);
    setLoading(false);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (t: Parameters<typeof createStockTransfer>[0], items: Parameters<typeof createStockTransfer>[1]) => {
    const { error } = await createStockTransfer(t, items);
    if (error) { toast.error(error.message); return; }
    toast.success('Transfer created'); setFormOpen(false); load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await deleteStockTransfer(deleteId);
    if (error) { toast.error(error.message); return; }
    toast.success('Deleted'); setDeleteId(null); load();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Inter Stock Transfer</h2>
            <p className="text-sm text-muted-foreground">Transfer stock between warehouses</p>
          </div>
          <button onClick={() => setFormOpen(true)} className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
            <Plus size={16} /> New Transfer
          </button>
        </div>

        <div className="rounded border border-border bg-card shadow-card overflow-x-auto">
          <table className="w-full min-w-max">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {['Transfer #', 'From', 'To', 'Date', 'Status', 'Actions'].map(h => (
                  <th key={h} className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => <tr key={i} className="border-b border-border">{[...Array(6)].map((_, j) => <td key={j} className="px-4 py-2.5"><div className="h-4 w-20 animate-pulse rounded bg-muted" /></td>)}</tr>)
              ) : transfers.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">No transfers yet</td></tr>
              ) : transfers.map(t => (
                <tr key={t.id} className="border-b border-border erp-table-row">
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs font-bold text-primary">{t.transfer_number}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-sm">{t.from_warehouse?.name || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-sm">{t.to_warehouse?.name || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">{t.transfer_date}</td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <span className={t.status === 'completed' ? 'status-badge-success' : t.status === 'cancelled' ? 'status-badge-danger' : 'status-badge-neutral'}>{t.status}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <button onClick={() => setDeleteId(t.id)} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 size={14} /></button>
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
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Stock Transfer</DialogTitle></DialogHeader>
          <TransferForm warehouses={warehouses} products={products} userId={user?.id || ''} onSave={handleSave} onClose={() => setFormOpen(false)} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader><AlertDialogTitle>Delete Transfer</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};


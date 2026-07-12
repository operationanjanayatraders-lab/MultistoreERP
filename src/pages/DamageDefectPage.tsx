import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { MainLayout } from '@/components/layouts/MainLayout';
import { getDamageRecords, createDamageRecord, deleteDamageRecord, updateDamageStatus, getProducts, getWarehouses } from '@/lib/api';
import type { DamageRecord, Product, Warehouse } from '@/types/types';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';

const DamageForm: React.FC<{
  products: Product[];
  warehouses: Warehouse[];
  userId: string;
  onSave: (r: Partial<DamageRecord>) => Promise<void>;
  onClose: () => void;
}> = ({ products, warehouses, userId, onSave, onClose }) => {
  const [form, setForm] = useState({ product_id: '', warehouse_id: '', quantity: 1, reason: '', damage_date: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.product_id) { toast.error('Select a product'); return; }
    if (form.quantity <= 0) { toast.error('Quantity must be > 0'); return; }
    setSaving(true);
    await onSave({ ...form, record_number: `DMG-${Date.now()}`, status: 'reported', created_by: userId, warehouse_id: form.warehouse_id || null });
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-normal">Product *</label>
          <select value={form.product_id} onChange={e => set('product_id', e.target.value)}
            className="w-full rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="">Select product</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-normal">Warehouse</label>
          <select value={form.warehouse_id} onChange={e => set('warehouse_id', e.target.value)}
            className="w-full rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="">Select warehouse</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-normal">Quantity *</label>
          <input type="number" min={1} value={form.quantity} onChange={e => set('quantity', parseInt(e.target.value) || 1)}
            className="w-full rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-normal">Damage Date</label>
          <input type="date" value={form.damage_date} onChange={e => set('damage_date', e.target.value)}
            className="w-full rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-normal">Reason</label>
        <textarea value={form.reason} onChange={e => set('reason', e.target.value)} rows={3}
          className="w-full rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 focus:border-primary focus:outline-none resize-none" />
      </div>
      <DialogFooter>
        <button type="button" onClick={onClose} className="rounded border border-border bg-background px-4 py-2 text-sm hover:bg-muted">Cancel</button>
        <button type="submit" disabled={saving} className="rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
          {saving ? 'Saving…' : 'Record Damage'}
        </button>
      </DialogFooter>
    </form>
  );
};

export const DamageDefectPage: React.FC = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<DamageRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const [rRes, pRes, wRes] = await Promise.all([getDamageRecords(page, PAGE_SIZE), getProducts(1, 200), getWarehouses()]);
    setRecords(rRes.data); setTotal(rRes.count); setProducts(pRes.data); setWarehouses(wRes.data);
    setLoading(false);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (r: Partial<DamageRecord>) => {
    const { error } = await createDamageRecord(r);
    if (error) { toast.error(error.message); return; }
    toast.success('Damage recorded'); setFormOpen(false); load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await deleteDamageRecord(deleteId);
    if (error) { toast.error(error.message); return; }
    toast.success('Deleted'); setDeleteId(null); load();
  };

  const handleWriteOff = async (id: string) => {
    await updateDamageStatus(id, 'written_off');
    toast.success('Written off'); load();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Damage & Defect Products</h2>
            <p className="text-sm text-muted-foreground">Track and write off damaged or defective items</p>
          </div>
          <button onClick={() => setFormOpen(true)} className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
            <Plus size={16} /> Record Damage
          </button>
        </div>

        <div className="rounded border border-border bg-card shadow-card overflow-x-auto">
          <table className="w-full min-w-max">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {['Record #', 'Product', 'Warehouse', 'Qty', 'Date', 'Status', 'Actions'].map(h => (
                  <th key={h} className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(4)].map((_, i) => <tr key={i} className="border-b border-border">{[...Array(7)].map((_, j) => <td key={j} className="px-4 py-2.5"><div className="h-4 w-20 animate-pulse rounded bg-muted" /></td>)}</tr>)
              ) : records.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">No damage records</td></tr>
              ) : records.map(r => (
                <tr key={r.id} className="border-b border-border erp-table-row">
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs font-bold text-primary">{r.record_number}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-sm">{r.products?.name || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">{r.warehouses?.name || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-sm tabular-nums font-semibold text-destructive">{r.quantity}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">{r.damage_date}</td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <span className={r.status === 'written_off' ? 'status-badge-neutral' : 'status-badge-warning'}>{r.status.replace('_', ' ')}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <div className="flex gap-1">
                      {r.status === 'reported' && (
                        <button onClick={() => handleWriteOff(r.id)}
                          className="rounded border border-border px-2 py-1 text-xs hover:bg-muted">Write Off</button>
                      )}
                      <button onClick={() => setDeleteId(r.id)} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 size={14} /></button>
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
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Record Damage / Defect</DialogTitle></DialogHeader>
          <DamageForm products={products} warehouses={warehouses} userId={user?.id || ''} onSave={handleSave} onClose={() => setFormOpen(false)} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader><AlertDialogTitle>Delete Record</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};


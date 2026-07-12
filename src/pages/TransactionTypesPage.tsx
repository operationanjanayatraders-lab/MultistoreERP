import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { MainLayout } from '@/components/layouts/MainLayout';
import { getTransactionTypes, upsertTransactionType, deleteTransactionType } from '@/lib/api';
import type { TransactionType } from '@/types/types';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const TTypeForm: React.FC<{
  initial?: Partial<TransactionType>;
  onSave: (t: Partial<TransactionType>) => Promise<void>;
  onClose: () => void;
}> = ({ initial, onSave, onClose }) => {
  const [form, setForm] = useState<Partial<TransactionType>>({
    name: '', code: '', description: '', affects_stock: 'none', is_active: true, ...initial,
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof TransactionType, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim()) { toast.error('Name is required'); return; }
    if (!form.code?.trim()) { toast.error('Code is required'); return; }
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-normal">Name *</label>
          <input value={form.name || ''} onChange={e => set('name', e.target.value)}
            className="w-full rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-normal">Code *</label>
          <input value={form.code || ''} onChange={e => set('code', e.target.value.toUpperCase())}
            className="w-full rounded border border-input bg-input px-3 py-2 text-sm font-mono uppercase !text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-normal">Affects Stock</label>
          <select value={form.affects_stock || 'none'} onChange={e => set('affects_stock', e.target.value)}
            className="w-full rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="none">None</option>
            <option value="increase">Increase</option>
            <option value="decrease">Decrease</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-normal">Description</label>
          <input value={form.description || ''} onChange={e => set('description', e.target.value)}
            className="w-full rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="tt_active" checked={form.is_active ?? true} onChange={e => set('is_active', e.target.checked)} className="h-4 w-4" />
        <label htmlFor="tt_active" className="text-sm">Active</label>
      </div>
      <DialogFooter>
        <button type="button" onClick={onClose} className="rounded border border-border bg-background px-4 py-2 text-sm hover:bg-muted">Cancel</button>
        <button type="submit" disabled={saving} className="rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </DialogFooter>
    </form>
  );
};

export const TransactionTypesPage: React.FC = () => {
  const [items, setItems] = useState<TransactionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<TransactionType | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await getTransactionTypes();
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (t: Partial<TransactionType>) => {
    const { error } = await upsertTransactionType(t);
    if (error) { toast.error(error.message); return; }
    toast.success(t.id ? 'Updated' : 'Created');
    setFormOpen(false); setEditItem(undefined); load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await deleteTransactionType(deleteId);
    if (error) { toast.error(error.message); return; }
    toast.success('Deleted'); setDeleteId(null); load();
  };

  const stockBadge = (s: string) => {
    if (s === 'increase') return <span className="status-badge-success">Increase</span>;
    if (s === 'decrease') return <span className="status-badge-danger">Decrease</span>;
    return <span className="status-badge-neutral">None</span>;
  };

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Transaction Types</h2>
            <p className="text-sm text-muted-foreground">Define transaction categories and stock effects</p>
          </div>
          <button onClick={() => { setEditItem(undefined); setFormOpen(true); }}
            className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
            <Plus size={16} /> Add Type
          </button>
        </div>

        <div className="rounded border border-border bg-card shadow-card overflow-x-auto">
          <table className="w-full min-w-max">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {['Code', 'Name', 'Affects Stock', 'Description', 'Status', 'Actions'].map(h => (
                  <th key={h} className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(4)].map((_, i) => <tr key={i} className="border-b border-border">{[...Array(6)].map((_, j) => <td key={j} className="px-4 py-2.5"><div className="h-4 w-20 animate-pulse rounded bg-muted" /></td>)}</tr>)
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">No transaction types</td></tr>
              ) : items.map(t => (
                <tr key={t.id} className="border-b border-border erp-table-row">
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs font-bold text-primary">{t.code}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-sm font-medium">{t.name}</td>
                  <td className="whitespace-nowrap px-4 py-2.5">{stockBadge(t.affects_stock)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground max-w-xs truncate">{t.description || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <span className={t.is_active ? 'status-badge-success' : 'status-badge-neutral'}>{t.is_active ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <div className="flex gap-1">
                      <button onClick={() => { setEditItem(t); setFormOpen(true); }} className="rounded p-1 text-muted-foreground hover:bg-muted"><Pencil size={14} /></button>
                      <button onClick={() => setDeleteId(t.id)} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={open => { if (!open) { setFormOpen(false); setEditItem(undefined); } }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader><DialogTitle>{editItem ? 'Edit Transaction Type' : 'Add Transaction Type'}</DialogTitle></DialogHeader>
          <TTypeForm initial={editItem} onSave={handleSave} onClose={() => { setFormOpen(false); setEditItem(undefined); }} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader><AlertDialogTitle>Delete Transaction Type</AlertDialogTitle>
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


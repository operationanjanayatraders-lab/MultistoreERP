import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Search, X, Phone, Mail, MapPin, ToggleLeft, ToggleRight } from 'lucide-react';
import { MainLayout } from '@/components/layouts/MainLayout';
import { getSuppliers, upsertSupplier, deleteSupplier, getCustomers, upsertCustomer, deleteCustomer } from '@/lib/api';
import type { Supplier, Customer } from '@/types/types';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type LedgerType = 'suppliers' | 'customers';
type LedgerRow = Supplier | Customer;

const inp = 'w-full rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 placeholder:text-gray-600 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring';
const lbl = 'mb-1 block text-xs font-medium text-muted-foreground';

const emptyForm = (): Partial<LedgerRow> => ({
  name: '', email: '', phone: '', address: '', is_active: true,
});

const LedgerForm: React.FC<{
  type: LedgerType;
  initial?: Partial<LedgerRow>;
  onSave: (data: Partial<LedgerRow>) => Promise<void>;
  onCancel: () => void;
}> = ({ type, initial, onSave, onCancel }) => {
  const [form, setForm] = useState<Partial<LedgerRow>>(initial ?? emptyForm());
  const [saving, setSaving] = useState(false);

  const set = (k: keyof LedgerRow, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={lbl}>{type === 'suppliers' ? 'Supplier' : 'Customer'} Name *</label>
        <Input className={inp} value={form.name ?? ''} onChange={e => set('name', e.target.value)} placeholder="Full name or company name" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Phone</label>
          <Input className={inp} value={form.phone ?? ''} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" />
        </div>
        <div>
          <label className={lbl}>Email</label>
          <Input className={inp} type="email" value={form.email ?? ''} onChange={e => set('email', e.target.value)} placeholder="email@example.com" />
        </div>
      </div>
      <div>
        <label className={lbl}>Address</label>
        <Textarea className={inp} rows={2} value={form.address ?? ''} onChange={e => set('address', e.target.value)} placeholder="Full address" />
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => set('is_active', !form.is_active)} className="text-primary">
          {form.is_active ? <ToggleRight size={22} /> : <ToggleLeft size={22} className="text-muted-foreground" />}
        </button>
        <span className="text-sm text-muted-foreground">Active</span>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
      </DialogFooter>
    </form>
  );
};

export const LedgerMasterPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Derive active tab from route path
  const activeTab: LedgerType = location.pathname.includes('customers') ? 'customers' : 'suppliers';

  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LedgerRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LedgerRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const fn = activeTab === 'suppliers' ? getSuppliers : getCustomers;
    const { data, count } = await fn(page, pageSize);
    const filtered = search
      ? data.filter(r =>
          r.name.toLowerCase().includes(search.toLowerCase()) ||
          (r.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (r.phone ?? '').includes(search)
        )
      : data;
    setRows(filtered);
    setTotal(count);
    setLoading(false);
  }, [activeTab, page, search]);

  useEffect(() => { load(); }, [load]);

  // Reset page when tab or search changes
  useEffect(() => { setPage(1); }, [activeTab, search]);

  const handleSave = async (data: Partial<LedgerRow>) => {
    const fn = activeTab === 'suppliers' ? upsertSupplier : upsertCustomer;
    const payload = editing ? { ...data, id: editing.id } : data;
    const { error } = await (fn as (d: Partial<LedgerRow>) => Promise<{ error: unknown }>)(payload);
    if (error) { toast.error('Failed to save'); return; }
    toast.success(editing ? 'Updated successfully' : 'Added successfully');
    setFormOpen(false);
    setEditing(null);
    load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const fn = activeTab === 'suppliers' ? deleteSupplier : deleteCustomer;
    const { error } = await fn(deleteTarget.id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Deleted');
    setDeleteTarget(null);
    load();
  };

  const switchTab = (tab: LedgerType) => {
    navigate(`/ledger/${tab}`);
  };

  const label = activeTab === 'suppliers' ? 'Supplier' : 'Customer';
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <MainLayout>
      <div className="flex flex-col gap-4 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Ledger Master</h1>
            <p className="text-sm text-muted-foreground">Manage suppliers and customers</p>
          </div>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }} size="sm" className="gap-1.5 self-start md:self-auto">
            <Plus size={15} /> Add {label}
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg border border-border bg-muted p-1 w-fit">
          {(['suppliers', 'customers'] as LedgerType[]).map(tab => (
            <button
              key={tab}
              onClick={() => switchTab(tab)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full rounded border border-input bg-input pl-8 pr-8 py-2 text-sm !text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder={`Search ${activeTab}…`}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-muted-foreground">Phone</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-muted-foreground">Address</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Loading…</td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      No {activeTab} found. Click <strong>Add {label}</strong> to create one.
                    </td>
                  </tr>
                ) : rows.map(row => (
                  <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{row.name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {row.phone ? (
                        <span className="flex items-center gap-1"><Phone size={12} />{row.phone}</span>
                      ) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {row.email ? (
                        <span className="flex items-center gap-1"><Mail size={12} />{row.email}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">
                      {row.address ? (
                        <span className="flex items-center gap-1"><MapPin size={12} /><span className="truncate">{row.address}</span></span>
                      ) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Badge variant={row.is_active ? 'default' : 'secondary'} className="text-xs">
                        {row.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setEditing(row); setFormOpen(true); }}
                          className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(row)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages} · {total} total
              </span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={open => { if (!open) { setFormOpen(false); setEditing(null); } }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${label}` : `Add ${label}`}</DialogTitle>
          </DialogHeader>
          <LedgerForm
            type={activeTab}
            initial={editing ?? emptyForm()}
            onSave={handleSave}
            onCancel={() => { setFormOpen(false); setEditing(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {label}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};


import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { MainLayout } from '@/components/layouts/MainLayout';
import {
  getProductCategories, upsertProductCategory, deleteProductCategory,
  getUnits, upsertUnit, deleteUnit,
  getBrandsMaster, upsertBrandMaster, deleteBrandMaster,
  getSubBrands, upsertSubBrand, deleteSubBrand,
  getGroups, upsertGroup, deleteGroup,
} from '@/lib/api';
import type { ProductCategory, Unit, BrandMaster, SubBrand, Group } from '@/types/types';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const inp = 'w-full rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 placeholder:text-gray-600 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring';
const lbl = 'mb-1 block text-xs font-medium text-muted-foreground';

type TabName = 'category' | 'unit' | 'brand' | 'subbrand' | 'group';

interface TabConfig {
  key: TabName;
  label: string;
}

const TABS: TabConfig[] = [
  { key: 'category', label: 'Category' },
  { key: 'unit', label: 'Unit' },
  { key: 'brand', label: 'Brand' },
  { key: 'subbrand', label: 'Sub Brand' },
  { key: 'group', label: 'Group' },
];

export const ItemMastersPage: React.FC = () => {
  const [tab, setTab] = useState<TabName>('category');

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [brands, setBrands] = useState<BrandMaster[]>([]);
  const [subBrands, setSubBrands] = useState<SubBrand[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [formValue, setFormValue] = useState('');
  const [formBrandId, setFormBrandId] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [catR, uniR, braR, subR, grpR] = await Promise.all([
      getProductCategories(),
      getUnits(),
      getBrandsMaster(),
      getSubBrands(),
      getGroups(),
    ]);
    setCategories(catR.data);
    setUnits(uniR.data);
    setBrands(braR.data);
    setSubBrands(subR.data);
    setGroups(grpR.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setFormValue(''); setFormBrandId(''); setEditId(null); setFormOpen(true); };
  const openEdit = (name: string, id: string, brandId?: string | null) => { setFormValue(name); setFormBrandId(brandId || ''); setEditId(id); setFormOpen(true); };

  const handleSave = async () => {
    if (!formValue.trim()) { toast.error('Name is required'); return; }
    let error: unknown = null;
    if (tab === 'category') {
      const r = await upsertProductCategory(editId ? { id: editId, name: formValue.trim() } : { name: formValue.trim() });
      error = r.error;
    } else if (tab === 'unit') {
      const r = await upsertUnit(editId ? { id: editId, name: formValue.trim() } : { name: formValue.trim() });
      error = r.error;
    } else if (tab === 'brand') {
      const r = await upsertBrandMaster(editId ? { id: editId, name: formValue.trim() } : { name: formValue.trim() });
      error = r.error;
    } else if (tab === 'subbrand') {
      if (!formBrandId) { toast.error('Please select a parent brand'); return; }
      const r = await upsertSubBrand(editId ? { id: editId, name: formValue.trim(), brand_id: formBrandId } : { name: formValue.trim(), brand_id: formBrandId });
      error = r.error;
    } else if (tab === 'group') {
      const r = await upsertGroup(editId ? { id: editId, name: formValue.trim() } : { name: formValue.trim() });
      error = r.error;
    }
    if (error) { toast.error(String(error)); return; }
    toast.success(editId ? 'Updated' : 'Created');
    setFormOpen(false); load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    let error: unknown = null;
    if (tab === 'category') { const r = await deleteProductCategory(deleteId); error = r.error; }
    else if (tab === 'unit') { const r = await deleteUnit(deleteId); error = r.error; }
    else if (tab === 'brand') { const r = await deleteBrandMaster(deleteId); error = r.error; }
    else if (tab === 'subbrand') { const r = await deleteSubBrand(deleteId); error = r.error; }
    else if (tab === 'group') { const r = await deleteGroup(deleteId); error = r.error; }
    if (error) { toast.error(String(error)); return; }
    toast.success('Deleted'); setDeleteId(null); load();
  };

  const dataForTab = (): { name: string; id: string; extra?: string }[] => {
    switch (tab) {
      case 'category': return categories.map(c => ({ name: c.name, id: c.id }));
      case 'unit': return units.map(u => ({ name: u.name, id: u.id }));
      case 'brand': return brands.map(b => ({ name: b.name, id: b.id }));
      case 'subbrand': return subBrands.map(s => ({
        name: s.name, id: s.id,
        extra: brands.find(b => b.id === s.brand_id)?.name || '—',
      }));
      case 'group': return groups.map(g => ({ name: g.name, id: g.id }));
    }
  };

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Item Masters</h2>
          <button onClick={openAdd}
            className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
            <Plus size={16} /> Add
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-1">
          {TABS.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setDeleteId(null); }}
              className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === t.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="rounded border border-border bg-card shadow-card overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
          ) : (
            <table className="w-full min-w-max">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">#</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Name</th>
                  {tab === 'subbrand' && <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Parent Brand</th>}
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {dataForTab().length === 0 ? (
                  <tr><td colSpan={tab === 'subbrand' ? 4 : 3} className="px-4 py-10 text-center text-sm text-muted-foreground">No records found</td></tr>
                ) : dataForTab().map((item, i) => (
                  <tr key={item.id} className="border-b border-border erp-table-row">
                    <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">{i + 1}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-sm font-medium">{item.name}</td>
                    {tab === 'subbrand' && <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">{item.extra}</td>}
                    <td className="whitespace-nowrap px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(item.name, item.id, tab === 'subbrand' ? subBrands.find(s => s.id === item.id)?.brand_id : undefined)}
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setDeleteId(item.id)}
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={o => { if (!o) { setFormOpen(false); } }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit' : 'Add'} {TABS.find(t => t.key === tab)?.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className={lbl}>Name</label>
              <input value={formValue} onChange={e => setFormValue(e.target.value)}
                className={inp} placeholder="Enter name" autoFocus />
            </div>
            {tab === 'subbrand' && (
              <div>
                <label className={lbl}>Parent Brand</label>
                <select value={formBrandId} onChange={e => setFormBrandId(e.target.value)} className={inp}>
                  <option value="">Select brand…</option>
                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            )}
            <DialogFooter>
              <button type="button" onClick={() => setFormOpen(false)}
                className="rounded border border-border bg-background px-4 py-2 text-sm hover:bg-muted">Cancel</button>
              <button onClick={handleSave}
                className="rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
                {editId ? 'Update' : 'Save'}
              </button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={o => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Record</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this record. This action cannot be undone.</AlertDialogDescription>
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

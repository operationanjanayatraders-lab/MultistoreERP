import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import { MainLayout } from '@/components/layouts/MainLayout';
import { getProducts, deleteProduct, upsertProduct, getProductCategories, getUnits, getBrandsMaster, getSubBrands, getGroups } from '@/lib/api';
import type { Product, ProductCategory, Unit, BrandMaster, SubBrand, Group } from '@/types/types';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const inp = 'w-full rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 placeholder:text-gray-600 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring';
const lbl = 'mb-1 block text-xs font-medium text-muted-foreground';

const ProductForm: React.FC<{
  initial?: Partial<Product>;
  categories: ProductCategory[];
  units: Unit[];
  brands: BrandMaster[];
  subBrands: SubBrand[];
  groups: Group[];
  onSave: (p: Partial<Product>) => Promise<void>;
  onClose: () => void;
}> = ({ initial, categories, units, brands, subBrands, groups, onSave, onClose }) => {
  const [form, setForm] = useState<Partial<Product>>({
    name: '', sku: '', barcode: '', unit: '',
    purchase_price: 0, selling_price: 0, reorder_level: 0,
    is_active: true, description: '', category_id: '',
    brand: '', sub_brand: '', group_name: '',
    hsn_code: '', gst_percent: 0, opening_stock: 0,
    ...initial,
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof Product, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const filteredSubBrands = subBrands.filter(s => !form.brand || s.brand_id === brands.find(b => b.name === form.brand)?.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim()) { toast.error('Item name is required'); return; }
    if (!form.sku?.trim()) { toast.error('Item code is required'); return; }
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Basic Info */}
      <div className="rounded border border-border bg-muted/20 p-3">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Basic Information</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <div className="col-span-2 md:col-span-1">
            <label className={lbl}>Item Name *</label>
            <input value={form.name || ''} onChange={e => set('name', e.target.value)} className={inp} />
          </div>
          <div>
            <label className={lbl}>Item Code (SKU) *</label>
            <input value={form.sku || ''} onChange={e => set('sku', e.target.value)} className={inp} />
          </div>
          <div>
            <label className={lbl}>Barcode</label>
            <input value={form.barcode || ''} onChange={e => set('barcode', e.target.value)} className={inp} />
          </div>
          <div>
            <label className={lbl}>Category</label>
            <select value={form.category_id || ''} onChange={e => set('category_id', e.target.value || null)} className={inp}>
              <option value="">Select…</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Unit</label>
            <select value={form.unit || ''} onChange={e => set('unit', e.target.value)} className={inp}>
              <option value="">Select…</option>
              {units.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Brand & Classification */}
      <div className="rounded border border-border bg-muted/20 p-3">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Classification</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <div>
            <label className={lbl}>Brand</label>
            <select value={form.brand || ''} onChange={e => { set('brand', e.target.value); set('sub_brand', ''); }} className={inp}>
              <option value="">Select…</option>
              {brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Sub-Brand</label>
            <select value={form.sub_brand || ''} onChange={e => set('sub_brand', e.target.value)} className={inp}>
              <option value="">Select…</option>
              {filteredSubBrands.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Group</label>
            <select value={form.group_name || ''} onChange={e => set('group_name', e.target.value)} className={inp}>
              <option value="">Select…</option>
              {groups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>HSN Code</label>
            <input value={form.hsn_code || ''} onChange={e => set('hsn_code', e.target.value)} className={inp} />
          </div>
          <div>
            <label className={lbl}>GST %</label>
            <input type="number" min={0} max={100} step={0.01} value={form.gst_percent ?? 0}
              onChange={e => set('gst_percent', parseFloat(e.target.value) || 0)} className={inp} />
          </div>
        </div>
      </div>

      {/* Pricing & Stock */}
      <div className="rounded border border-border bg-muted/20 p-3">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pricing & Stock</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div>
            <label className={lbl}>Purchase Price</label>
            <input type="number" min={0} step={0.01} value={form.purchase_price ?? 0}
              onChange={e => set('purchase_price', parseFloat(e.target.value) || 0)} className={inp} />
          </div>
          <div>
            <label className={lbl}>Selling Price</label>
            <input type="number" min={0} step={0.01} value={form.selling_price ?? 0}
              onChange={e => set('selling_price', parseFloat(e.target.value) || 0)} className={inp} />
          </div>
          <div>
            <label className={lbl}>Reorder Level</label>
            <input type="number" min={0} value={form.reorder_level ?? 0}
              onChange={e => set('reorder_level', parseInt(e.target.value) || 0)} className={inp} />
          </div>
          <div>
            <label className={lbl}>Opening Stock</label>
            <input type="number" min={0} step={0.001} value={form.opening_stock ?? 0}
              onChange={e => set('opening_stock', parseFloat(e.target.value) || 0)} className={inp} />
          </div>
        </div>
      </div>

      <div>
        <label className={lbl}>Description</label>
        <textarea value={form.description || ''} onChange={e => set('description', e.target.value)} rows={2}
          className="w-full rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="is_active" checked={form.is_active ?? true}
          onChange={e => set('is_active', e.target.checked)} className="h-4 w-4 rounded border-input" />
        <label htmlFor="is_active" className="text-sm">Active</label>
      </div>
      <DialogFooter>
        <button type="button" onClick={onClose} className="rounded border border-border bg-background px-4 py-2 text-sm hover:bg-muted">Cancel</button>
        <button type="submit" disabled={saving} className="rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
          {saving ? 'Saving…' : 'Save Item'}
        </button>
      </DialogFooter>
    </form>
  );
};

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [brands, setBrands] = useState<BrandMaster[]>([]);
  const [subBrands, setSubBrands] = useState<SubBrand[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const [prodRes, catRes, uniRes, braRes, subRes, grpRes] = await Promise.all([
      getProducts(page, PAGE_SIZE, search), getProductCategories(),
      getUnits(), getBrandsMaster(), getSubBrands(), getGroups(),
    ]);
    setProducts(prodRes.data);
    setTotal(prodRes.count);
    setCategories(catRes.data);
    setUnits(uniRes.data);
    setBrands(braRes.data);
    setSubBrands(subRes.data);
    setGroups(grpRes.data);
    setLoading(false);
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (p: Partial<Product>) => {
    const { error } = await upsertProduct(p);
    if (error) { toast.error(error.message); return; }
    toast.success(p.id ? 'Item updated' : 'Item created');
    setFormOpen(false); setEditProduct(undefined); load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await deleteProduct(deleteId);
    if (error) { toast.error(error.message); return; }
    toast.success('Item deleted'); setDeleteId(null); load();
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Item Master</h2>
            <p className="text-sm text-muted-foreground">{total} item{total !== 1 ? 's' : ''} total</p>
          </div>
          <button onClick={() => { setEditProduct(undefined); setFormOpen(true); }}
            className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
            <Plus size={16} /> Add Item
          </button>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1); } }}
              placeholder="Search items…"
              className="w-full rounded border border-input bg-input py-2 pl-9 pr-3 text-sm !text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <button onClick={() => { setSearch(searchInput); setPage(1); }}
            className="rounded border border-border bg-background px-3 py-2 text-sm hover:bg-muted">Search</button>
          {search && (
            <button onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}
              className="flex items-center gap-1 rounded border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
              <X size={14} /> Clear
            </button>
          )}
        </div>

        <div className="rounded border border-border bg-card shadow-card overflow-x-auto">
          <table className="w-full min-w-max">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {['Item Code', 'Item Name', 'Brand', 'Sub-Brand', 'Group', 'Category', 'HSN', 'GST%', 'Opening Stock', 'Unit', 'Sell Price', 'Status', 'Actions'].map(h => (
                  <th key={h} className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {[...Array(13)].map((_, j) => <td key={j} className="px-3 py-2.5"><div className="h-4 w-16 animate-pulse rounded bg-muted" /></td>)}
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr><td colSpan={13} className="px-4 py-10 text-center text-sm text-muted-foreground">No items found</td></tr>
              ) : products.map(p => (
                <tr key={p.id} className="border-b border-border erp-table-row">
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs font-medium text-primary">{p.sku}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-sm font-medium max-w-[180px] truncate">{p.name}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-muted-foreground">{p.brand || '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-muted-foreground">{p.sub_brand || '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-muted-foreground">{p.group_name || '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-muted-foreground">{p.product_categories?.name || '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-muted-foreground">{p.hsn_code || '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-right tabular-nums">{p.gst_percent ?? 0}%</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-right tabular-nums">{p.opening_stock ?? 0}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs">{p.unit}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs tabular-nums text-right">{fmt(p.selling_price)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <span className={p.is_active ? 'status-badge-success' : 'status-badge-neutral'}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditProduct(p); setFormOpen(true); }}
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setDeleteId(p.id)}
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
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
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="rounded border border-border px-3 py-1.5 hover:bg-muted disabled:opacity-40">Prev</button>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                className="rounded border border-border px-3 py-1.5 hover:bg-muted disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={open => { if (!open) { setFormOpen(false); setEditProduct(undefined); } }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-3xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editProduct ? 'Modify Item' : 'Add Item'}</DialogTitle>
          </DialogHeader>
          <ProductForm initial={editProduct} categories={categories} units={units} brands={brands} subBrands={subBrands} groups={groups}
            onSave={handleSave} onClose={() => { setFormOpen(false); setEditProduct(undefined); }} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the item. This action cannot be undone.</AlertDialogDescription>
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



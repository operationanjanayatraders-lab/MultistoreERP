import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown, Minus, Filter, MapPin, Building2, Layers, Warehouse as WarehouseIcon, Search } from 'lucide-react';
import { MainLayout } from '@/components/layouts/MainLayout';
import { getPhysicalStockInventory, createPhysicalStockRecord, deletePhysicalStockRecord, getProducts, getWarehouses, getBranches, getCompanies } from '@/lib/api';
import type { PhysicalStockInventory, Product, Warehouse, Branch, Company } from '@/types/types';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';

const inp = 'w-full rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 placeholder:text-gray-600 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring';
const lbl = 'mb-1 block text-xs font-medium text-muted-foreground';

export const PhysicalStockPage: React.FC = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<PhysicalStockInventory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const PAGE_SIZE = 20;

  // ── Filters ──
  const [companyId, setCompanyId] = useState('all');
  const [branchId, setBranchId] = useState('all');
  const [warehouseId, setWarehouseId] = useState('all');

  const filteredBranches = useMemo(() =>
    companyId === 'all' ? branches : branches.filter(b => b.company_id === companyId),
    [branches, companyId]
  );
  const filteredWarehouses = useMemo(() =>
    branchId === 'all' ? warehouses : warehouses.filter(w => w.branch_id === branchId),
    [warehouses, branchId]
  );

  const [form, setForm] = useState({
    inventory_date: new Date().toISOString().slice(0, 10),
    warehouse_id: '',
    product_id: '',
    location_code: '',
    system_qty: 0,
    physical_qty: 0,
    notes: '',
  });

  const [productLocations, setProductLocations] = useState<{ location_code: string; warehouse_name: string }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [recRes, prodRes, whRes, brRes, coRes] = await Promise.all([
      getPhysicalStockInventory(page, PAGE_SIZE),
      getProducts(1, 500),
      getWarehouses(),
      getBranches(),
      getCompanies(),
    ]);
    setRecords(recRes.data);
    setTotal(recRes.count);
    setProducts(prodRes.data);
    setWarehouses(whRes.data);
    setBranches(brRes.data);
    setCompanies(coRes.data);
    setLoading(false);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handleProductChange = useCallback(async (productId: string) => {
    setForm(f => ({ ...f, product_id: productId, location_code: '' }));
    if (productId) {
      const { data } = await supabase.from('product_locations').select('location_code, warehouses(id,name)')
        .eq('product_id', productId).order('location_code');
      setProductLocations(
        (data || []).map(l => ({
          location_code: (l as Record<string, unknown>).location_code as string,
          warehouse_name: ((l as Record<string, unknown>).warehouses as Record<string, unknown>)?.name as string || '',
        }))
      );
    } else {
      setProductLocations([]);
    }
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.product_id) { toast.error('Please select a product'); return; }
    const { error } = await createPhysicalStockRecord({
      inventory_date: form.inventory_date,
      warehouse_id: form.warehouse_id || null,
      product_id: form.product_id,
      system_qty: form.system_qty,
      physical_qty: form.physical_qty,
      notes: form.location_code ? `${form.location_code}: ${form.notes}`.replace(/: $/, '') : form.notes,
      created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Stock record saved');
    setFormOpen(false);
    setForm({ inventory_date: new Date().toISOString().slice(0, 10), warehouse_id: '', product_id: '', location_code: '', system_qty: 0, physical_qty: 0, notes: '' });
    setProductLocations([]);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await deletePhysicalStockRecord(deleteId);
    if (error) { toast.error(error.message); return; }
    toast.success('Record deleted'); setDeleteId(null); load();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const varianceIcon = (v: number) => {
    if (v > 0) return <TrendingUp size={13} className="text-chart-1" />;
    if (v < 0) return <TrendingDown size={13} className="text-destructive" />;
    return <Minus size={13} className="text-muted-foreground" />;
  };
  const varianceClass = (v: number) => v > 0 ? 'text-chart-1 font-semibold' : v < 0 ? 'text-destructive font-semibold' : 'text-muted-foreground';

  const filteredProducts = useMemo(() => {
    if (!productSearch) return products;
    const q = productSearch.toLowerCase();
    return products.filter(p => p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.toLowerCase().includes(q)));
  }, [products, productSearch]);

  const companyOptions = useMemo(() => [{ value: 'all', label: 'All Companies' }, ...companies.map(c => ({ value: c.id, label: c.name }))], [companies]);
  const branchOptions = useMemo(() => [{ value: 'all', label: 'All Branches' }, ...filteredBranches.map(b => ({ value: b.id, label: b.name }))], [filteredBranches]);
  const warehouseOptions = useMemo(() => [{ value: 'all', label: 'All Warehouses' }, ...filteredWarehouses.map(w => ({ value: w.id, label: w.name }))], [filteredWarehouses]);

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Physical Stock Inventory</h2>
            <p className="text-sm text-muted-foreground">Record and compare physical vs system stock counts</p>
          </div>
          <button onClick={() => setFormOpen(true)}
            className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
            <Plus size={16} /> New Stock Count
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <select value={companyId} onChange={e => { setCompanyId(e.target.value); setBranchId('all'); setWarehouseId('all'); }}
            className="rounded border border-input bg-input px-3 py-1.5 text-xs">
            {companyOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={branchId} onChange={e => { setBranchId(e.target.value); setWarehouseId('all'); }}
            className="rounded border border-input bg-input px-3 py-1.5 text-xs">
            {branchOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)}
            className="rounded border border-input bg-input px-3 py-1.5 text-xs">
            {warehouseOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="rounded border border-border bg-card shadow-card overflow-x-auto">
          <table className="w-full min-w-max">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {['Date', 'Warehouse', 'Location', 'Item Code', 'Item Name', 'System Qty', 'Physical Qty', 'Variance', 'Notes', 'Actions'].map(h => (
                  <th key={h} className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {[...Array(10)].map((_, j) => <td key={j} className="px-4 py-2.5"><div className="h-4 w-20 animate-pulse rounded bg-muted" /></td>)}
                  </tr>
                ))
              ) : records.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-sm text-muted-foreground">No stock inventory records found</td></tr>
              ) : records.map(r => (
                <tr key={r.id} className="border-b border-border erp-table-row">
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs">{r.inventory_date}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">{r.warehouses?.name || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">
                    {r.notes && (r.notes.includes(': ') ? r.notes.split(': ')[0] : '—')}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-primary">{r.products?.sku || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-sm font-medium max-w-[160px] truncate">{r.products?.name || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-right tabular-nums">{r.system_qty}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-right tabular-nums">{r.physical_qty}</td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <div className={`flex items-center justify-end gap-1 text-xs tabular-nums ${varianceClass(r.variance)}`}>
                      {varianceIcon(r.variance)}
                      {r.variance > 0 ? '+' : ''}{r.variance}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground max-w-[150px] truncate">
                    {r.notes && r.notes.includes(': ') ? r.notes.split(': ').slice(1).join(': ') : r.notes || '—'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <button onClick={() => setDeleteId(r.id)}
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 size={14} />
                    </button>
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
          <DialogHeader>
            <DialogTitle>New Physical Stock Count</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Date</label>
                <input type="date" value={form.inventory_date}
                  onChange={e => setForm(f => ({ ...f, inventory_date: e.target.value }))} className={inp} />
              </div>
              <div>
                <label className={lbl}>Warehouse</label>
                <select value={form.warehouse_id} onChange={e => setForm(f => ({ ...f, warehouse_id: e.target.value }))} className={inp}>
                  <option value="">All / None</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className={lbl}>Item *</label>
                <div className="flex gap-2 mb-1">
                  <div className="relative flex-1">
                    <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input value={productSearch} onChange={e => setProductSearch(e.target.value)}
                      placeholder="Search products..." className="w-full rounded border border-input bg-input pl-7 pr-3 py-1.5 text-xs" />
                  </div>
                </div>
                <select value={form.product_id} onChange={e => handleProductChange(e.target.value)} className={inp} required>
                  <option value="">Select item…</option>
                  {filteredProducts.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
                </select>
              </div>
              {productLocations.length > 0 && (
                <div className="col-span-2">
                  <label className={lbl}>Location</label>
                  <select value={form.location_code} onChange={e => setForm(f => ({ ...f, location_code: e.target.value }))} className={inp}>
                    <option value="">None</option>
                    {productLocations.map(l => (
                      <option key={l.location_code} value={l.location_code}>{l.location_code} ({l.warehouse_name})</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className={lbl}>System Qty</label>
                <input type="number" min={0} step={0.001} value={form.system_qty}
                  onChange={e => setForm(f => ({ ...f, system_qty: parseFloat(e.target.value) || 0 }))} className={inp} />
              </div>
              <div>
                <label className={lbl}>Physical Qty</label>
                <input type="number" min={0} step={0.001} value={form.physical_qty}
                  onChange={e => setForm(f => ({ ...f, physical_qty: parseFloat(e.target.value) || 0 }))} className={inp} />
              </div>
              <div className="col-span-2 rounded border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Variance</p>
                <p className={`text-lg font-bold tabular-nums ${form.physical_qty - form.system_qty > 0 ? 'text-chart-1' : form.physical_qty - form.system_qty < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {form.physical_qty - form.system_qty > 0 ? '+' : ''}{(form.physical_qty - form.system_qty).toFixed(3)}
                </p>
              </div>
              <div className="col-span-2">
                <label className={lbl}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  className="w-full rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
              </div>
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setFormOpen(false)} className="rounded border border-border bg-background px-4 py-2 text-sm hover:bg-muted">Cancel</button>
              <button type="submit" className="rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">Save Record</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Record</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this stock count record.</AlertDialogDescription>
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


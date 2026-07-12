import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus, Pencil, Trash2, Building2, Warehouse as WarehouseIcon,
  MapPin, Phone, User, X, Search, Hash, RefreshCw
} from 'lucide-react';
import { MainLayout } from '@/components/layouts/MainLayout';
import {
  getBranches, upsertBranch, deleteBranch,
  getWarehouses, upsertWarehouse, deleteWarehouse,
} from '@/lib/api';
import type { Branch, Warehouse } from '@/types/types';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

const inp = 'w-full rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 placeholder:text-gray-600 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring';
const lbl = 'mb-1 block text-xs font-medium text-muted-foreground';
const lblReq = 'mb-1 block text-xs font-medium text-muted-foreground after:content-["*"] after:text-destructive after:ml-0.5';

const fmt = (n: number) => String(n).padStart(3, '0');

// Generate next branch ID
const genBranchId = (branches: Branch[], location: string): string => {
  const prefix = location ? location.substring(0, 2).toUpperCase() : 'BR';
  const nums = branches
    .filter(b => (b.branch_id || '').startsWith(prefix))
    .map(b => parseInt((b.branch_id || prefix + '000').replace(prefix, ''), 10) || 0);
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return prefix + fmt(max + 1);
};

// Generate next warehouse ID
const genWhId = (warehouses: Warehouse[], branchPrefix: string): string => {
  const prefix = branchPrefix ? branchPrefix + '-' : 'WH-';
  const nums = warehouses
    .filter(w => (w.warehouse_id || '').startsWith(prefix))
    .map(w => parseInt((w.warehouse_id || prefix + '000').replace(prefix, ''), 10) || 0);
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return prefix + fmt(max + 1);
};

const emptyBranch = (): Partial<Branch> => ({
  branch_id: '', name: '', contact_person: '', contact_number: '', location: '', is_active: true,
});

const emptyWarehouse = (): Partial<Warehouse> => ({
  warehouse_id: '', name: '', location: '', contact_person: '', contact_number: '', branch_id: null, is_active: true,
});

export const BranchesPage: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [activeTab, setActiveTab] = useState<'branches' | 'warehouses'>('branches');
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Branch form
  const [branchFormOpen, setBranchFormOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [branchForm, setBranchForm] = useState<Partial<Branch>>(emptyBranch());
  const [savingBranch, setSavingBranch] = useState(false);
  const [deleteBranchTarget, setDeleteBranchTarget] = useState<Branch | null>(null);

  // Warehouse form
  const [whFormOpen, setWhFormOpen] = useState(false);
  const [editingWh, setEditingWh] = useState<Warehouse | null>(null);
  const [whForm, setWhForm] = useState<Partial<Warehouse>>(emptyWarehouse());
  const [savingWh, setSavingWh] = useState(false);
  const [deleteWhTarget, setDeleteWhTarget] = useState<Warehouse | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [bRes, wRes] = await Promise.all([getBranches(), getWarehouses()]);
    setBranches(bRes.data);
    setWarehouses(wRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Branch handlers ────────────────────────────────
  const openBranchForm = (b?: Branch) => {
    if (b) { setEditingBranch(b); setBranchForm({ ...b }); }
    else {
      setEditingBranch(null);
      const loc = '';
      const code = genBranchId(branches, loc);
      setBranchForm({ ...emptyBranch(), branch_id: code });
    }
    setBranchFormOpen(true);
  };

  const autoBranchId = () => {
    const loc = branchForm.location || branchForm.name || '';
    setBranchForm(f => ({ ...f, branch_id: genBranchId(branches, loc) }));
  };

  const saveBranch = async () => {
    if (!branchForm.name?.trim()) { toast.error('Branch name is required'); return; }
    setSavingBranch(true);
    const { error } = await upsertBranch(branchForm);
    setSavingBranch(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editingBranch ? 'Branch updated' : 'Branch created');
    setBranchFormOpen(false);
    setEditingBranch(null);
    load();
  };

  const confirmDeleteBranch = async () => {
    if (!deleteBranchTarget) return;
    const linked = warehouses.filter(w => w.branch_id === deleteBranchTarget.id);
    if (linked.length > 0) {
      toast.error(`Cannot delete: ${linked.length} warehouse(s) linked to this branch`);
      return;
    }
    const { error } = await deleteBranch(deleteBranchTarget.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Branch deleted');
    setDeleteBranchTarget(null);
    load();
  };

  // ── Warehouse handlers ─────────────────────────────
  const openWhForm = (w?: Warehouse) => {
    if (w) { setEditingWh(w); setWhForm({ ...w }); }
    else {
      setEditingWh(null);
      const branch = branches.find(b => b.id === selectedBranch);
      const prefix = branch?.branch_id || 'WH';
      const code = genWhId(warehouses, prefix);
      setWhForm({ ...emptyWarehouse(), warehouse_id: code, branch_id: selectedBranch });
    }
    setWhFormOpen(true);
  };

  const autoWhId = () => {
    const branch = branches.find(b => b.id === whForm.branch_id);
    const prefix = branch?.branch_id || 'WH';
    setWhForm(f => ({ ...f, warehouse_id: genWhId(warehouses, prefix) }));
  };

  const saveWarehouse = async () => {
    if (!whForm.name?.trim()) { toast.error('Warehouse name is required'); return; }
    setSavingWh(true);
    const { error } = await upsertWarehouse(whForm);
    setSavingWh(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editingWh ? 'Warehouse updated' : 'Warehouse created');
    setWhFormOpen(false);
    setEditingWh(null);
    load();
  };

  const confirmDeleteWh = async () => {
    if (!deleteWhTarget) return;
    const { error } = await deleteWarehouse(deleteWhTarget.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Warehouse deleted');
    setDeleteWhTarget(null);
    load();
  };

  const filteredBranches = search
    ? branches.filter(b =>
        (b.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (b.branch_id || '').toLowerCase().includes(search.toLowerCase()) ||
        (b.contact_person || '').toLowerCase().includes(search.toLowerCase()) ||
        (b.contact_number || '').toLowerCase().includes(search.toLowerCase())
      )
    : branches;

  const filteredWh = selectedBranch
    ? warehouses.filter(w => w.branch_id === selectedBranch)
    : warehouses;

  return (
    <MainLayout>
      <div className="flex flex-col gap-4 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <Building2 size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Branches & Warehouses</h1>
              <p className="text-sm text-muted-foreground">Manage business locations and stock storage</p>
            </div>
          </div>
          <Button size="sm" onClick={() => activeTab === 'branches' ? openBranchForm() : openWhForm()} className="gap-1.5">
            <Plus size={15} /> Add {activeTab === 'branches' ? 'Branch' : 'Warehouse'}
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg border border-border bg-muted p-1 w-fit">
          {(['branches', 'warehouses'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                activeTab === tab ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}>{tab}</button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-10 text-muted-foreground">Loading...</div>
        ) : activeTab === 'branches' ? (
          /* ═══════ BRANCHES ═══════ */
          <div className="space-y-4">
            {/* Search */}
            <div className="relative max-w-xs">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input className={`${inp} pl-8`} placeholder="Search branches..." value={search} onChange={e => setSearch(e.target.value)} />
              {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"><X size={13} /></button>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBranches.length === 0 ? (
                <div className="col-span-full text-center py-10 text-muted-foreground">No branches found</div>
              ) : filteredBranches.map(b => {
                const whCount = warehouses.filter(w => w.branch_id === b.id).length;
                return (
                  <div key={b.id} className="rounded-lg border border-border bg-card p-4 shadow-card hover:shadow-hover transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="rounded-lg bg-primary/10 p-2">
                          <Building2 size={16} className="text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{b.name}</p>
                          <p className="text-[10px] font-mono text-primary">{b.branch_id || '—'}</p>
                        </div>
                      </div>
                      <Badge variant={b.is_active ? 'default' : 'secondary'} className="text-[10px]">{b.is_active ? 'Active' : 'Inactive'}</Badge>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground mb-3">
                      {b.contact_person && <p className="flex items-center gap-1"><User size={11} /> {b.contact_person}</p>}
                      {b.contact_number && <p className="flex items-center gap-1"><Phone size={11} /> {b.contact_number}</p>}
                      {b.location && <p className="flex items-center gap-1"><MapPin size={11} /> {b.location}</p>}
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <WarehouseIcon size={12} /> {whCount} warehouse{whCount !== 1 ? 's' : ''}
                      </span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setSelectedBranch(b.id); openWhForm(); }}
                          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground" title="Add warehouse">
                          <Plus size={13} />
                        </button>
                        <button onClick={() => openBranchForm(b)}
                          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground" title="Edit">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => setDeleteBranchTarget(b)}
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Delete">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ═══════ WAREHOUSES ═══════ */
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Filter by branch:</span>
              <button onClick={() => setSelectedBranch(null)}
                className={`rounded px-3 py-1 text-xs font-medium transition-colors ${!selectedBranch ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>All</button>
              {branches.map(b => (
                <button key={b.id} onClick={() => setSelectedBranch(b.id)}
                  className={`rounded px-3 py-1 text-xs font-medium transition-colors ${selectedBranch === b.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
                  {b.name}
                </button>
              ))}
            </div>

            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="whitespace-nowrap px-3 py-2.5 text-left font-medium text-muted-foreground text-xs">Wh ID</th>
                      <th className="whitespace-nowrap px-3 py-2.5 text-left font-medium text-muted-foreground text-xs">Warehouse Name</th>
                      <th className="whitespace-nowrap px-3 py-2.5 text-left font-medium text-muted-foreground text-xs">Branch</th>
                      <th className="whitespace-nowrap px-3 py-2.5 text-left font-medium text-muted-foreground text-xs">Contact Person</th>
                      <th className="whitespace-nowrap px-3 py-2.5 text-left font-medium text-muted-foreground text-xs">Contact No</th>
                      <th className="whitespace-nowrap px-3 py-2.5 text-left font-medium text-muted-foreground text-xs">Location</th>
                      <th className="whitespace-nowrap px-3 py-2.5 text-center font-medium text-muted-foreground text-xs">Status</th>
                      <th className="whitespace-nowrap px-3 py-2.5 text-right font-medium text-muted-foreground text-xs">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWh.length === 0 ? (
                      <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">No warehouses found</td></tr>
                    ) : filteredWh.map(w => {
                      const branch = branches.find(b => b.id === w.branch_id);
                      return (
                        <tr key={w.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-primary">{w.warehouse_id || '—'}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 font-medium text-foreground">{w.name}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-xs text-muted-foreground">{branch?.name || '—'}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-xs text-muted-foreground">{w.contact_person || '—'}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-xs text-muted-foreground">{w.contact_number || '—'}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><MapPin size={11} />{w.location || '—'}</span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-center">
                            <Badge variant={w.is_active ? 'default' : 'secondary'} className="text-[10px]">{w.is_active ? 'Active' : 'Inactive'}</Badge>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => openWhForm(w)}
                                className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" title="Edit">
                                <Pencil size={13} />
                              </button>
                              <button onClick={() => setDeleteWhTarget(w)}
                                className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Delete">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════ BRANCH FORM ═══════ */}
      <Dialog open={branchFormOpen} onOpenChange={o => { if (!o) { setBranchFormOpen(false); setEditingBranch(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Building2 size={16} className="text-primary" /> {editingBranch ? 'Edit Branch' : 'Add Branch'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className={lbl}>Branch ID</label>
              <div className="flex gap-2">
                <Input className={inp} value={branchForm.branch_id || ''}
                  onChange={e => setBranchForm(f => ({ ...f, branch_id: e.target.value }))}
                  placeholder="Auto-generated" />
                <button type="button" onClick={autoBranchId}
                  className="rounded border border-border px-2.5 text-xs text-muted-foreground hover:bg-muted shrink-0 flex items-center gap-1">
                  <RefreshCw size={12} /> Auto
                </button>
              </div>
            </div>
            <div>
              <label className={lblReq}>Branch Name</label>
              <Input className={inp} value={branchForm.name || ''}
                onChange={e => setBranchForm(f => ({ ...f, name: e.target.value }))} placeholder="Head Office, Branch 1..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Contact Person</label>
                <Input className={inp} value={branchForm.contact_person || ''}
                  onChange={e => setBranchForm(f => ({ ...f, contact_person: e.target.value }))} placeholder="Person name" />
              </div>
              <div>
                <label className={lbl}>Contact Number</label>
                <Input className={inp} value={branchForm.contact_number || ''}
                  onChange={e => setBranchForm(f => ({ ...f, contact_number: e.target.value }))} placeholder="+91 98765 43210" />
              </div>
            </div>
            <div>
              <label className={lbl}>Location</label>
              <Input className={inp} value={branchForm.location || ''}
                onChange={e => setBranchForm(f => ({ ...f, location: e.target.value }))} placeholder="City / address" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={branchForm.is_active ?? true} onCheckedChange={v => setBranchForm(f => ({ ...f, is_active: v }))} id="branchStatus" />
              <label htmlFor="branchStatus" className="text-sm cursor-pointer">Active</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setBranchFormOpen(false); setEditingBranch(null); }}>Cancel</Button>
            <Button onClick={saveBranch} disabled={savingBranch}>{savingBranch ? 'Saving...' : 'Save Branch'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════ WAREHOUSE FORM ═══════ */}
      <Dialog open={whFormOpen} onOpenChange={o => { if (!o) { setWhFormOpen(false); setEditingWh(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><WarehouseIcon size={16} className="text-primary" /> {editingWh ? 'Edit Warehouse' : 'Add Warehouse'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className={lbl}>Warehouse ID</label>
              <div className="flex gap-2">
                <Input className={inp} value={whForm.warehouse_id || ''}
                  onChange={e => setWhForm(f => ({ ...f, warehouse_id: e.target.value }))}
                  placeholder="Auto-generated" />
                <button type="button" onClick={autoWhId}
                  className="rounded border border-border px-2.5 text-xs text-muted-foreground hover:bg-muted shrink-0 flex items-center gap-1">
                  <RefreshCw size={12} /> Auto
                </button>
              </div>
            </div>
            <div>
              <label className={lblReq}>Warehouse Name</label>
              <Input className={inp} value={whForm.name || ''}
                onChange={e => setWhForm(f => ({ ...f, name: e.target.value }))} placeholder="Main Warehouse..." />
            </div>
            <div>
              <label className={lblReq}>Linked Branch</label>
              <select className={inp} value={whForm.branch_id || ''}
                onChange={e => setWhForm(f => ({ ...f, branch_id: e.target.value || null }))}>
                <option value="">Select branch / HO...</option>
                {branches.filter(b => b.is_active).map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.branch_id || '—'})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Contact Person</label>
                <Input className={inp} value={whForm.contact_person || ''}
                  onChange={e => setWhForm(f => ({ ...f, contact_person: e.target.value }))} placeholder="Person name" />
              </div>
              <div>
                <label className={lbl}>Contact Number</label>
                <Input className={inp} value={whForm.contact_number || ''}
                  onChange={e => setWhForm(f => ({ ...f, contact_number: e.target.value }))} placeholder="+91 98765 43210" />
              </div>
            </div>
            <div>
              <label className={lbl}>Location</label>
              <Input className={inp} value={whForm.location || ''}
                onChange={e => setWhForm(f => ({ ...f, location: e.target.value }))} placeholder="Warehouse location" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={whForm.is_active ?? true} onCheckedChange={v => setWhForm(f => ({ ...f, is_active: v }))} id="whStatus" />
              <label htmlFor="whStatus" className="text-sm cursor-pointer">Active</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setWhFormOpen(false); setEditingWh(null); }}>Cancel</Button>
            <Button onClick={saveWarehouse} disabled={savingWh}>{savingWh ? 'Saving...' : 'Save Warehouse'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Branch Confirm */}
      <AlertDialog open={!!deleteBranchTarget} onOpenChange={o => !o && setDeleteBranchTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Branch?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteBranchTarget?.name}</strong> ({deleteBranchTarget?.branch_id})?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteBranch} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Warehouse Confirm */}
      <AlertDialog open={!!deleteWhTarget} onOpenChange={o => !o && setDeleteWhTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Warehouse?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete <strong>{deleteWhTarget?.name}</strong>?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteWh} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

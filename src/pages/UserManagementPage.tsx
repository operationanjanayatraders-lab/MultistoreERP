import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Plus, Pencil, Trash2, Save, Check, Shield } from 'lucide-react';
import { MainLayout } from '@/components/layouts/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { getProfiles, getDesignations, upsertDesignation, deleteDesignation, getDepartments, upsertDepartment, deleteDepartment } from '@/lib/api';
import type { Profile } from '@/types/types';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type UserTab = 'create' | 'manage' | 'rights';

const MODULES = [
  'Dashboard', 'Inventory', 'Item Master', 'Sales', 'Purchase',
  'Stock Transfer', 'Damage & Defect', 'Sales Return', 'Purchase Return',
  'Physical Stock', 'Proforma Invoice', 'Quotation', 'Accounts',
  'Ledger Master', 'App Settings', 'Daily Tasks',
];

const inp = 'w-full rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 placeholder:text-gray-600 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring';
const lbl = 'mb-1 block text-sm font-normal text-muted-foreground';

export const UserManagementPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const location = useLocation();

  // Derive tab from URL path
  const activeTab: UserTab = location.pathname.endsWith('manage')
    ? 'manage'
    : location.pathname.endsWith('rights')
    ? 'rights'
    : 'create';

  // Shared state
  const [users, setUsers] = useState<Profile[]>([]);
  const [designations, setDesignations] = useState<{ id: string; name: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);

  // Create User
  const [newUser, setNewUser] = useState({ email: '', password: '', full_name: '', designation: '', department_id: '', role: 'user' });
  const [creatingUser, setCreatingUser] = useState(false);

  // Manage Users
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Profile>>({});

  // Designations (sub-section of manage)
  const [newDesig, setNewDesig] = useState('');
  const [editDesigId, setEditDesigId] = useState<string | null>(null);
  const [editDesigName, setEditDesigName] = useState('');

  // Departments (sub-section of manage)
  const [newDept, setNewDept] = useState('');
  const [editDeptId, setEditDeptId] = useState<string | null>(null);
  const [editDeptName, setEditDeptName] = useState('');

  // Rights
  const [rightsUser, setRightsUser] = useState('');
  const [rights, setRights] = useState<Record<string, boolean>>({});
  const [savingRights, setSavingRights] = useState(false);

  const loadUsers = async () => {
    const { data } = await getProfiles();
    setUsers(data);
  };
  const loadDesignations = async () => {
    const { data } = await getDesignations();
    setDesignations(data);
  };
  const loadDepartments = async () => {
    const { data } = await getDepartments();
    setDepartments(data);
  };

  useEffect(() => {
    loadUsers();
    loadDesignations();
    loadDepartments();
  }, []);

  const getDeptName = (id: string | null) => {
    if (!id) return '—';
    return departments.find(d => d.id === id)?.name || '—';
  };

  const loadUserRights = (uid: string) => {
    setRightsUser(uid);
    const u = users.find(x => x.id === uid);
    const existing = (u?.permissions as Record<string, boolean>) || {};
    const r: Record<string, boolean> = {};
    MODULES.forEach(m => (r[m] = existing[m] !== false));
    setRights(r);
  };

  // ── Create User ──────────────────────────────────────────
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.password) { toast.error('Email and password required'); return; }
    setCreatingUser(true);

    const session = await supabase.auth.getSession();
    const accessToken = session?.data?.session?.access_token;
    if (!accessToken) { toast.error('Not authenticated'); setCreatingUser(false); return; }

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          email: newUser.email,
          password: newUser.password,
          full_name: newUser.full_name,
          designation: newUser.designation || undefined,
          department_id: newUser.department_id || undefined,
          role: newUser.role,
        }),
      }
    );

    const result = await res.json();
    if (!res.ok) {
      toast.error(result.error || 'Failed to create user');
      setCreatingUser(false);
      return;
    }

    toast.success('User created successfully');
    setNewUser({ email: '', password: '', full_name: '', designation: '', department_id: '', role: 'user' });
    setCreatingUser(false);
    loadUsers();
  };

  // ── Edit User ─────────────────────────────────────────────
  const openEdit = (u: Profile) => { setEditUser(u); setEditForm({ full_name: u.full_name, designation: u.designation, department_id: u.department_id, role: u.role }); setEditOpen(true); };
  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    const { error } = await supabase.from('profiles').update(editForm).eq('id', editUser.id);
    if (error) { toast.error(error.message); return; }
    toast.success('User updated');
    setEditOpen(false);
    loadUsers();
  };

  // ── Save Rights ───────────────────────────────────────────
  const handleSaveRights = async () => {
    if (!rightsUser) return;
    setSavingRights(true);
    const { error } = await supabase.from('profiles').update({ permissions: rights }).eq('id', rightsUser);
    setSavingRights(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Permissions saved');
  };

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Shield size={48} className="text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Access restricted to administrators only.</p>
        </div>
      </MainLayout>
    );
  }

  const tabs: { id: UserTab; label: string; path: string }[] = [
    { id: 'create', label: 'Create User', path: '/users/create' },
    { id: 'manage', label: 'Manage Users', path: '/users/manage' },
    { id: 'rights', label: 'User Rights', path: '/users/rights' },
  ];

  return (
    <MainLayout>
      <div className="space-y-5 p-4 md:p-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">User Settings</h2>
          <p className="text-sm text-muted-foreground">Manage application users and their permissions</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <div className="flex overflow-x-auto whitespace-nowrap gap-1">
            {tabs.map(t => (
              <Link key={t.id} to={t.path}
                className={cn('px-4 py-2 text-sm font-medium transition-colors shrink-0',
                  activeTab === t.id
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}>
                {t.label}
              </Link>
            ))}
          </div>
        </div>

        {/* ── Create User ── */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreateUser} className="space-y-5 max-w-2xl">
            <div className="rounded border border-border bg-card p-5 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-foreground">New User Details</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={lbl}>Full Name</label>
                  <input className={inp} value={newUser.full_name}
                    onChange={e => setNewUser(u => ({ ...u, full_name: e.target.value }))}
                    placeholder="John Doe" />
                </div>
                <div>
                  <label className={lbl}>Email Address *</label>
                  <input className={inp} type="email" value={newUser.email}
                    onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))}
                    placeholder="john@company.com" required />
                </div>
                <div>
                  <label className={lbl}>Password *</label>
                  <input className={inp} type="password" value={newUser.password}
                    onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))}
                    placeholder="Min 6 characters" required />
                </div>
                <div>
                  <label className={lbl}>Designation</label>
                  <select className={inp} value={newUser.designation}
                    onChange={e => setNewUser(u => ({ ...u, designation: e.target.value }))}>
                    <option value="">Select designation</option>
                    {designations.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Department</label>
                  <select className={inp} value={newUser.department_id}
                    onChange={e => setNewUser(u => ({ ...u, department_id: e.target.value }))}>
                    <option value="">Select department</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Role</label>
                  <select className={inp} value={newUser.role}
                    onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))}>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <button type="submit" disabled={creatingUser}
                  className="inline-flex items-center gap-2 rounded bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
                  <Plus size={15} /> {creatingUser ? 'Creating…' : 'Create User'}
                </button>
              </div>
            </div>

            {/* Designations management */}
            <div className="rounded border border-border bg-card p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Manage Designations</h3>
              <div className="flex gap-2 mb-3">
                <input className={inp} value={newDesig} onChange={e => setNewDesig(e.target.value)}
                  placeholder="New designation name" />
                <button type="button"
                  onClick={async () => {
                    if (!newDesig.trim()) return;
                    const { error } = await upsertDesignation({ name: newDesig.trim() });
                    if (error) { toast.error(error.message); return; }
                    toast.success('Designation added');
                    setNewDesig('');
                    loadDesignations();
                  }}
                  className="shrink-0 inline-flex items-center gap-1 rounded bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
                  <Plus size={14} /> Add
                </button>
              </div>
              <div className="rounded border border-border divide-y divide-border">
                {designations.length === 0 ? (
                  <p className="px-4 py-5 text-center text-sm text-muted-foreground">No designations yet</p>
                ) : designations.map(d => (
                  <div key={d.id} className="flex items-center justify-between px-4 py-2.5">
                    {editDesigId === d.id ? (
                      <input value={editDesigName} onChange={e => setEditDesigName(e.target.value)}
                        className="flex-1 rounded border border-input bg-input px-2 py-1 text-sm focus:border-primary focus:outline-none mr-2" />
                    ) : (
                      <span className="text-sm">{d.name}</span>
                    )}
                    <div className="flex gap-1 shrink-0">
                      {editDesigId === d.id ? (
                        <button type="button" onClick={async () => {
                          await upsertDesignation({ id: d.id, name: editDesigName });
                          setEditDesigId(null); loadDesignations();
                        }} className="rounded p-1 text-primary hover:bg-muted"><Check size={14} /></button>
                      ) : (
                        <button type="button" onClick={() => { setEditDesigId(d.id); setEditDesigName(d.name); }}
                          className="rounded p-1 text-muted-foreground hover:bg-muted"><Pencil size={14} /></button>
                      )}
                      <button type="button" onClick={async () => {
                        await deleteDesignation(d.id); toast.success('Deleted'); loadDesignations();
                      }} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Departments management */}
            <div className="rounded border border-border bg-card p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Manage Departments</h3>
              <div className="flex gap-2 mb-3">
                <input className={inp} value={newDept} onChange={e => setNewDept(e.target.value)}
                  placeholder="New department name" />
                <button type="button"
                  onClick={async () => {
                    if (!newDept.trim()) return;
                    const { error } = await upsertDepartment({ name: newDept.trim() });
                    if (error) { toast.error(error.message); return; }
                    toast.success('Department added');
                    setNewDept('');
                    loadDepartments();
                  }}
                  className="shrink-0 inline-flex items-center gap-1 rounded bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
                  <Plus size={14} /> Add
                </button>
              </div>
              <div className="rounded border border-border divide-y divide-border">
                {departments.length === 0 ? (
                  <p className="px-4 py-5 text-center text-sm text-muted-foreground">No departments yet</p>
                ) : departments.map(d => (
                  <div key={d.id} className="flex items-center justify-between px-4 py-2.5">
                    {editDeptId === d.id ? (
                      <input value={editDeptName} onChange={e => setEditDeptName(e.target.value)}
                        className="flex-1 rounded border border-input bg-input px-2 py-1 text-sm focus:border-primary focus:outline-none mr-2" />
                    ) : (
                      <span className="text-sm">{d.name}</span>
                    )}
                    <div className="flex gap-1 shrink-0">
                      {editDeptId === d.id ? (
                        <button type="button" onClick={async () => {
                          await upsertDepartment({ id: d.id, name: editDeptName });
                          setEditDeptId(null); loadDepartments();
                        }} className="rounded p-1 text-primary hover:bg-muted"><Check size={14} /></button>
                      ) : (
                        <button type="button" onClick={() => { setEditDeptId(d.id); setEditDeptName(d.name); }}
                          className="rounded p-1 text-muted-foreground hover:bg-muted"><Pencil size={14} /></button>
                      )}
                      <button type="button" onClick={async () => {
                        await deleteDepartment(d.id); toast.success('Deleted'); loadDepartments();
                      }} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </form>
        )}

        {/* ── Manage Users ── */}
        {activeTab === 'manage' && (
          <div className="space-y-4">
            <div className="rounded border border-border bg-card shadow-sm overflow-x-auto">
              <table className="w-full min-w-max text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    {['Name', 'Email', 'Designation', 'Department', 'Role', 'Actions'].map(h => (
                      <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No users found.</td></tr>
                  )}
                  {users.length > 0 && users.map(u => (
                    <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{u.full_name || '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{u.email}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{u.designation || '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{getDeptName(u.department_id)}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                          u.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
                          {u.role}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <button onClick={() => openEdit(u)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
                          <Pencil size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── User Rights ── */}
        {activeTab === 'rights' && (
          <div className="space-y-4 max-w-lg">
            <div>
              <label className={lbl}>Select User to Configure Permissions</label>
              <select className={inp} value={rightsUser} onChange={e => loadUserRights(e.target.value)}>
                <option value="">— Choose a user —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
              </select>
            </div>
            {rightsUser && (
              <div className="rounded border border-border bg-card shadow-sm">
                <div className="border-b border-border px-4 py-3 bg-muted/30">
                  <p className="text-sm font-semibold text-foreground">Module Access Permissions</p>
                </div>
                <div className="divide-y divide-border">
                  {MODULES.map(mod => (
                    <div key={mod} className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-sm text-foreground">{mod}</span>
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input type="checkbox" className="sr-only peer"
                          checked={rights[mod] !== false}
                          onChange={e => setRights(r => ({ ...r, [mod]: e.target.checked }))} />
                        <div className="h-5 w-9 rounded-full bg-muted transition-colors peer-checked:bg-primary after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-4" />
                      </label>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border px-4 py-3">
                  <button onClick={handleSaveRights} disabled={savingRights}
                    className="inline-flex items-center gap-2 rounded bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
                    <Save size={14} /> {savingRights ? 'Saving…' : 'Save Permissions'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onOpenChange={open => !open && setEditOpen(false)}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader><DialogTitle>Modify User</DialogTitle></DialogHeader>
          <form onSubmit={handleEditSave} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className={lbl}>Full Name</label>
                <input className={inp} value={editForm.full_name ?? ''}
                  onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div>
                <label className={lbl}>Designation</label>
                <select className={inp} value={editForm.designation ?? ''}
                  onChange={e => setEditForm(f => ({ ...f, designation: e.target.value }))}>
                  <option value="">Select designation</option>
                  {designations.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Department</label>
                <select className={inp} value={editForm.department_id ?? ''}
                  onChange={e => setEditForm(f => ({ ...f, department_id: e.target.value }))}>
                  <option value="">Select department</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Role</label>
                <select className={inp} value={editForm.role ?? 'user'}
                  onChange={e => setEditForm(f => ({ ...f, role: e.target.value as 'user' | 'admin' }))}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setEditOpen(false)}
                className="rounded border border-border bg-background px-4 py-2 text-sm hover:bg-muted">Cancel</button>
              <button type="submit"
                className="rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
                Save Changes
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};


import React, { useState } from 'react';
import { MainLayout } from '@/components/layouts/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

export const AccountSettingsPage: React.FC = () => {
  const { profile, refreshProfile } = useAuth();
  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    designation: profile?.designation || '',
    phone: profile?.phone || '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update(form).eq('id', profile.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    await refreshProfile();
    toast.success('Profile updated');
  };

  return (
    <MainLayout>
      <div className="space-y-4 max-w-lg">
        <div>
          <h2 className="text-lg font-semibold">Account Settings</h2>
          <p className="text-sm text-muted-foreground">Update your profile information</p>
        </div>
        <div className="rounded border border-border bg-card p-5 shadow-card">
          {/* Avatar */}
          <div className="mb-5 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
              {profile?.full_name?.charAt(0)?.toUpperCase() || profile?.email?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <p className="font-medium">{profile?.full_name || profile?.email}</p>
              <p className="text-xs text-muted-foreground">{profile?.email}</p>
              <p className="text-xs text-muted-foreground capitalize">{profile?.role}</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-normal">Full Name</label>
              <input value={form.full_name} onChange={e => set('full_name', e.target.value)}
                className="w-full rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-normal">Email</label>
              <input value={profile?.email || ''} disabled
                className="w-full rounded border border-input bg-muted px-3 py-2 text-sm text-muted-foreground cursor-not-allowed" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-normal">Designation</label>
              <input value={form.designation} onChange={e => set('designation', e.target.value)}
                className="w-full rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-normal">Phone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)}
                className="w-full rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
              <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </MainLayout>
  );
};


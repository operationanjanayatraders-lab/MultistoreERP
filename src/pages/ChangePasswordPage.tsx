import React, { useState } from 'react';
import { MainLayout } from '@/components/layouts/MainLayout';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { KeyRound, Eye, EyeOff } from 'lucide-react';

export const ChangePasswordPage: React.FC = () => {
  const [form, setForm] = useState({ current: '', newPass: '', confirm: '' });
  const [show, setShow] = useState({ current: false, newPass: false, confirm: false });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const toggle = (k: keyof typeof show) => setShow(s => ({ ...s, [k]: !s[k] }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.current) { toast.error('Enter current password'); return; }
    if (form.newPass.length < 6) { toast.error('New password must be at least 6 characters'); return; }
    if (form.newPass !== form.confirm) { toast.error('New passwords do not match'); return; }
    setSaving(true);

    // Verify current password by re-authenticating
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user?.email) { toast.error('Session expired'); setSaving(false); return; }
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: userData.user.email,
      password: form.current,
    });
    if (verifyError) { toast.error('Current password is incorrect'); setSaving(false); return; }

    // Update password
    const { error } = await supabase.auth.updateUser({ password: form.newPass });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Password changed successfully');
    setForm({ current: '', newPass: '', confirm: '' });
  };

  const Field: React.FC<{ label: string; field: 'current' | 'newPass' | 'confirm'; value: string }> = ({ label, field, value }) => (
    <div>
      <label className="mb-1 block text-sm font-normal">{label}</label>
      <div className="relative">
        <input
          type={show[field] ? 'text' : 'password'}
          value={value}
          onChange={e => set(field, e.target.value)}
          className="w-full rounded border border-input bg-input px-3 py-2 pr-10 text-base !text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <button type="button" onClick={() => toggle(field)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
          {show[field] ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );

  return (
    <MainLayout>
      <div className="space-y-4 max-w-md">
        <div>
          <h2 className="text-lg font-semibold">Change Password</h2>
          <p className="text-sm text-muted-foreground">Update your account password</p>
        </div>
        <div className="rounded border border-border bg-card p-5 shadow-card">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <KeyRound size={22} />
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Current Password" field="current" value={form.current} />
            <Field label="New Password" field="newPass" value={form.newPass} />
            <Field label="Confirm New Password" field="confirm" value={form.confirm} />
            {form.newPass && form.confirm && form.newPass !== form.confirm && (
              <p className="text-xs text-destructive">Passwords do not match</p>
            )}
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
              {saving ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </MainLayout>
  );
};


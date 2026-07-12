import React, { useEffect, useState, useRef } from 'react';
import { Upload, Save, Shield } from 'lucide-react';
import { MainLayout } from '@/components/layouts/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { getCompanySettings, upsertCompanySettings } from '@/lib/api';
import type { CompanySettings } from '@/types/types';
import { toast } from 'sonner';

export const SettingsPage: React.FC = () => {
  const { isAdmin, refreshCompanySettings } = useAuth();
  const [settings, setSettings] = useState<Partial<CompanySettings>>({ company_name: '', tagline: '' });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    const { data } = await getCompanySettings();
    if (data) { setSettings(data); setLogoPreview(data.logo_url || null); }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = ev => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    let logoUrl = settings.logo_url;
    if (logoFile) {
      const fileName = `logo-${Date.now()}.${logoFile.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage
        .from('company-assets').upload(fileName, logoFile, { upsert: true });
      if (uploadError) { toast.error('Logo upload failed: ' + uploadError.message); setSaving(false); return; }
      const { data: { publicUrl } } = supabase.storage.from('company-assets').getPublicUrl(fileName);
      logoUrl = publicUrl;
    }
    const { error } = await upsertCompanySettings({ ...settings, logo_url: logoUrl });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Settings saved');
    await refreshCompanySettings();
    loadSettings();
  };

  const set = (k: string, v: string) => setSettings(s => ({ ...s, [k]: v }));
  const inp = 'w-full rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 placeholder:text-gray-600 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring';
  const lbl = 'mb-1 block text-xs font-medium text-muted-foreground';

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

  return (
    <MainLayout>
      <div className="space-y-5 p-4 md:p-6 max-w-2xl">
        <div>
          <h2 className="text-lg font-semibold text-foreground">App Settings</h2>
          <p className="text-sm text-muted-foreground">Configure company information and branding</p>
        </div>

        {/* Logo */}
        <div className="rounded border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Company Logo</h3>
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border bg-muted shrink-0">
              {logoPreview
                ? <img src={logoPreview} alt="Logo preview" className="h-full w-full object-cover rounded-full" />
                : <Upload size={24} className="text-muted-foreground" />}
            </div>
            <div className="space-y-2">
              <button onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-2 rounded border border-border bg-background px-3 py-2 text-sm text-white hover:bg-muted hover:text-gray-900">
                <Upload size={14} /> Upload Logo
              </button>
              <p className="text-xs text-muted-foreground">PNG, JPG, SVG — max 2MB</p>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            </div>
          </div>
        </div>

        {/* Company Info */}
        <div className="rounded border border-border bg-card p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Company Information</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={lbl}>Company Name</label>
              <input className={inp} value={settings.company_name || ''}
                onChange={e => set('company_name', e.target.value)} placeholder="Your Company Pvt. Ltd." />
            </div>
            <div>
              <label className={lbl}>Tagline</label>
              <input className={inp} value={settings.tagline || ''}
                onChange={e => set('tagline', e.target.value)} placeholder="Your business tagline" />
            </div>
            <div>
              <label className={lbl}>Mobile No.</label>
              <input className={inp} value={(settings as Record<string, string>).mobile || ''}
                onChange={e => set('mobile', e.target.value)} placeholder="+91 98765 43210" />
            </div>
            <div>
              <label className={lbl}>Email</label>
              <input className={inp} type="email" value={(settings as Record<string, string>).email || ''}
                onChange={e => set('email', e.target.value)} placeholder="info@company.com" />
            </div>
            <div className="md:col-span-2">
              <label className={lbl}>Address</label>
              <textarea className={`${inp} resize-none`} rows={2}
                value={(settings as Record<string, string>).address || ''}
                onChange={e => set('address', e.target.value)} placeholder="Full business address" />
            </div>
            <div>
              <label className={lbl}>GSTIN</label>
              <input className={inp} value={(settings as Record<string, string>).gstin || ''}
                onChange={e => set('gstin', e.target.value)} placeholder="22AAAAA0000A1Z5" />
            </div>
            <div>
              <label className={lbl}>PAN</label>
              <input className={inp} value={(settings as Record<string, string>).pan || ''}
                onChange={e => set('pan', e.target.value)} placeholder="AAAAA0000A" />
            </div>
            <div>
              <label className={lbl}>Financial Year</label>
              <select className={inp} value={(settings as Record<string, string>).financial_year || '2025-26'}
                onChange={e => set('financial_year', e.target.value)}>
                <option value="2023-24">2023-24</option>
                <option value="2024-25">2024-25</option>
                <option value="2025-26">2025-26</option>
                <option value="2026-27">2026-27</option>
              </select>
            </div>
          </div>
          <button onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-2 rounded bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
            <Save size={14} /> {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </div>
    </MainLayout>
  );
};


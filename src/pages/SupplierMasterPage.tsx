import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Plus, Pencil, Trash2, Search, X, ChevronDown, ChevronRight,
  Building2, Phone, MapPin, FileText, Receipt, Banknote, Package,
  Upload, AlertCircle, Check, Copy, ArrowLeft, Save, RotateCcw,
  XCircle, Eye, FileUp, Shield, CreditCard, Settings, Info, Tags,
  UserCircle, Globe, BookOpen, CheckCircle, AlertTriangle
} from 'lucide-react';
import { MainLayout } from '@/components/layouts/MainLayout';
import {
  getSuppliers, upsertSupplier, deleteSupplier, getNextSupplierCode,
  checkSupplierDuplicates, getSupplierAttachments, upsertSupplierAttachment,
  deleteSupplierAttachment, createSupplierLedgerEntry
} from '@/lib/api';
import { supabase } from '@/db/supabase';
import type { Supplier, SupplierAttachment } from '@/types/types';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { motion, AnimatePresence } from 'motion/react';

// ── Constants ─────────────────────────────────────────────
const SUPPLIER_CATEGORIES = ['Local', 'National', 'International', 'Government', 'Small Scale', 'Large Scale'];
const SUPPLIER_GROUPS = ['Raw Material', 'Packaging', 'Services', 'Trading Goods', 'Capital Goods', 'Consumables', 'Others'];
const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir',
  'Ladakh', 'Lakshadweep', 'Puducherry'
];
const COUNTRIES = ['India', 'Afghanistan', 'Bangladesh', 'Bhutan', 'China', 'Myanmar', 'Nepal', 'Pakistan', 'Sri Lanka', 'UAE', 'USA', 'UK', 'Other'];
const PAYMENT_TERMS = ['Immediate', '7 Days', '15 Days', '30 Days', '45 Days', '60 Days', '90 Days', 'On Delivery', 'Letter of Credit'];
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'JPY', 'CNY', 'SGD', 'AUD', 'CAD'];
const GST_TYPES = ['Regular', 'Composition', 'Unregistered', 'SEZ', 'Deemed Export', 'EOU'];
const PRICE_LISTS = ['Standard', 'Wholesale', 'Retail', 'Distributor', 'Export', 'Contract'];
const TDS_SECTIONS = ['194C', '194H', '194I', '194J', '194Q', '195', '196D', 'Not Applicable'];
const DOCUMENT_TYPES = [
  { value: 'gst_certificate', label: 'GST Certificate', icon: <FileText size={14} /> },
  { value: 'pan_card', label: 'PAN Card', icon: <Shield size={14} /> },
  { value: 'cancelled_cheque', label: 'Cancelled Cheque', icon: <Banknote size={14} /> },
  { value: 'msme_certificate', label: 'MSME Certificate', icon: <FileText size={14} /> },
  { value: 'other', label: 'Other Documents', icon: <Upload size={14} /> },
];

// ── Helpers ───────────────────────────────────────────────
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

const inp = 'w-full rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 placeholder:text-gray-600 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring';
const inpErr = 'w-full rounded border border-destructive bg-input px-3 py-2 text-sm !text-gray-900 placeholder:text-gray-600 focus:border-destructive focus:outline-none focus:ring-1 focus:ring-destructive';
const lbl = 'mb-1.5 block text-xs font-medium text-muted-foreground';
const lblReq = 'mb-1.5 block text-xs font-medium text-muted-foreground after:content-["*"] after:text-destructive after:ml-0.5';
const sectionHdr = 'flex items-center gap-2 text-sm font-semibold text-foreground cursor-pointer select-none';
const cardStyle = 'rounded-lg border border-border bg-card shadow-card overflow-hidden';
const fieldGrid = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4';

// ── Empty Form ────────────────────────────────────────────
const emptyForm = (): Partial<Supplier> => ({
  name: '', supplier_code: '', print_name: '', contact_person: '',
  supplier_category: '', supplier_group: '',
  opening_balance: 0, dr_cr: 'Dr',
  phone: '', alternate_mobile: '', telephone: '', email: '', website: '',
  billing_address: '', shipping_address: '', area: '', city: '', district: '',
  state: '', country: 'India', pincode: '',
  gst_registered: 'No', gstin: '', pan: '', tan: '', aadhaar_no: '', msme_no: '',
  credit_limit: 0, credit_days: 0, payment_terms: '', currency: 'INR',
  tds_applicable: false, tds_section: '',
  account_holder_name: '', bank_name: '', branch_name: '',
  account_no: '', ifsc: '', upi_id: '',
  default_gst_type: '', price_list: '', purchase_discount: 0,
  freight_applicable: false, transporter_name: '', preferred_supplier: false,
  remarks: '', internal_notes: '', tags: [],
  is_active: true,
});

// ── Validation ────────────────────────────────────────────
const validateSupplier = (form: Partial<Supplier>): string[] => {
  const errors: string[] = [];
  if (!form.name?.trim()) errors.push('Supplier Name is required');
  if (form.gstin && !GST_REGEX.test(form.gstin)) errors.push('Invalid GSTIN format');
  if (form.pan && !PAN_REGEX.test(form.pan)) errors.push('Invalid PAN format (e.g. AAAAA0000A)');
  if (form.ifsc && !IFSC_REGEX.test(form.ifsc)) errors.push('Invalid IFSC format (e.g. HDFC0001234)');
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.push('Invalid Email format');
  return errors;
};

// ── Searchable Select Component ──────────────────────────
const SearchableSelect: React.FC<{
  value: string; options: string[]; placeholder?: string;
  onChange: (v: string) => void; className?: string; label?: string; required?: boolean;
}> = ({ value, options, placeholder, onChange, className, label, required }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      {label && <label className={required ? lblReq : lbl}>{label}</label>}
      <div
        onClick={() => { setOpen(!open); setSearch(''); }}
        className={`${inp} cursor-pointer flex items-center justify-between gap-2 ${className || ''}`}
      >
        <span className={value ? '' : 'text-muted-foreground'}>{value || placeholder || 'Select...'}</span>
        <ChevronDown size={14} className="text-muted-foreground shrink-0" />
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg overflow-hidden"
          >
            <div className="p-1 border-b border-border">
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full rounded border-0 bg-transparent px-2 py-1.5 text-sm outline-none focus:ring-0 !text-gray-900"
                placeholder="Search..."
              />
            </div>
            <div className="max-h-48 overflow-y-auto p-1">
              {filtered.length === 0 ? (
                <p className="px-2 py-3 text-xs text-muted-foreground text-center">No options found</p>
              ) : filtered.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { onChange(opt); setOpen(false); }}
                  className={`w-full text-left rounded px-2 py-1.5 text-sm transition-colors hover:bg-accent ${
                    value === opt ? 'bg-accent font-medium text-accent-foreground' : 'text-popover-foreground'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Section Collapsible Card ─────────────────────────────
const SectionCard: React.FC<{
  title: string; icon: React.ReactNode; defaultOpen?: boolean;
  children: React.ReactNode; badge?: string | number;
}> = ({ title, icon, defaultOpen = true, children, badge }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cardStyle}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-4 py-3 border-b border-border hover:bg-muted/30 transition-colors"
      >
        <div className={sectionHdr}>
          <span className="text-primary">{icon}</span>
          <span>{title}</span>
          {badge !== undefined && (
            <span className="ml-2 inline-flex items-center justify-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">{badge}</span>
          )}
        </div>
        <div className="text-muted-foreground">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ── Document Upload Cell ─────────────────────────────────
const DocumentUpload: React.FC<{
  attachments: SupplierAttachment[];
  onUpload: (type: string, file: File) => void;
  onDelete: (id: string) => void;
  onPreview: (url: string) => void;
}> = ({ attachments, onUpload, onDelete, onPreview }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadingType, setUploadingType] = useState('');

  const triggerUpload = (type: string) => {
    setUploadingType(type);
    fileRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadingType) {
      onUpload(uploadingType, file);
    }
    e.target.value = '';
  };

  return (
    <div>
      <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.gif" onChange={handleFileChange} />
      <div className={fieldGrid}>
        {DOCUMENT_TYPES.map(({ value, label, icon }) => {
          const existing = attachments.filter(a => a.document_type === value);
          return (
            <div key={value} className="rounded-lg border border-border bg-muted/20 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <span className="text-primary">{icon}</span>
                  {label}
                </div>
                {existing.length > 0 && (
                  <Badge variant="secondary" className="text-[10px]">{existing.length}</Badge>
                )}
              </div>
              {existing.length > 0 ? (
                <div className="space-y-1.5">
                  {existing.map(att => (
                    <div key={att.id} className="flex items-center justify-between gap-2 rounded bg-background px-2 py-1">
                      <span className="text-xs text-muted-foreground truncate flex-1">{att.file_name}</span>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => onPreview(att.file_url)}
                          className="p-0.5 text-muted-foreground hover:text-foreground">
                          <Eye size={13} />
                        </button>
                        <button type="button" onClick={() => onDelete(att.id)}
                          className="p-0.5 text-muted-foreground hover:text-destructive">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground mb-2">No file uploaded</p>
              )}
              <button type="button" onClick={() => triggerUpload(value)}
                className="mt-1.5 inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium">
                <FileUp size={12} /> Upload
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Main Component ───────────────────────────────────────
export const SupplierMasterPage: React.FC = () => {
  // List state
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState<Partial<Supplier>>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [sameAsBilling, setSameAsShipping] = useState(true);
  const [attachments, setAttachments] = useState<SupplierAttachment[]>([]);
  const [previewUrl, setPreviewUrl] = useState('');

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);

  // ── Load Suppliers ────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    const { data, count } = await getSuppliers(page, pageSize, search);
    setSuppliers(data);
    setTotal(count);
    setLoading(false);
  }, [page, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search]);

  // ── Form Handlers ─────────────────────────────────────
  const set = (k: keyof Supplier, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const openNewForm = async () => {
    const code = await getNextSupplierCode();
    setForm({ ...emptyForm(), supplier_code: code });
    setEditing(null);
    setAttachments([]);
    setWarnings([]);
    setSameAsShipping(true);
    setFormOpen(true);
  };

  const openEditForm = async (supplier: Supplier) => {
    setForm({ ...supplier });
    setEditing(supplier);
    setSameAsShipping(
      supplier.shipping_address === supplier.billing_address ||
      !supplier.shipping_address
    );
    setWarnings([]);
    const { data: atts } = await getSupplierAttachments(supplier.id);
    setAttachments(atts || []);
    setFormOpen(true);
  };

  const resetForm = () => {
    if (editing) {
      setForm({ ...editing });
      setSameAsShipping(
        editing.shipping_address === editing.billing_address ||
        !editing.shipping_address
      );
    } else {
      openNewForm();
    }
    setWarnings([]);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setForm(emptyForm());
    setAttachments([]);
    setWarnings([]);
  };

  // ── Save ──────────────────────────────────────────────
  const handleSave = async (action: 'close' | 'new' | 'stay' = 'close') => {
    const validationErrors = validateSupplier(form);
    if (validationErrors.length > 0) {
      validationErrors.forEach(e => toast.error(e));
      return;
    }

    setSaving(true);

    // Duplicate warnings
    const dups = await checkSupplierDuplicates(form);
    if (dups.length > 0) {
      setWarnings(dups);
      dups.forEach(w => toast.warning(w));
    }

    // Auto-generate supplier code if empty
    if (!form.supplier_code) {
      form.supplier_code = await getNextSupplierCode();
    }

    // Same as shipping
    const payload = { ...form };
    if (sameAsShipping) {
      payload.shipping_address = payload.billing_address;
    }

    const { data, error } = await upsertSupplier(payload);
    setSaving(false);

    if (error) {
      toast.error(error.message || 'Failed to save supplier');
      return;
    }

    // Auto create ledger entry for opening balance
    if (data && (payload.opening_balance || 0) > 0) {
      await createSupplierLedgerEntry({
        supplier_id: data.id,
        entry_date: new Date().toISOString().split('T')[0],
        reference_type: 'Opening Balance',
        debit: payload.dr_cr === 'Dr' ? payload.opening_balance : 0,
        credit: payload.dr_cr === 'Cr' ? payload.opening_balance : 0,
        balance: payload.dr_cr === 'Dr' ? payload.opening_balance : -payload.opening_balance,
        narration: `Opening balance ${payload.dr_cr === 'Dr' ? 'Dr' : 'Cr'} ${payload.opening_balance}`,
      });
    }

    toast.success(editing ? 'Supplier updated successfully' : 'Supplier created successfully');
    load();

    if (action === 'close') closeForm();
    else if (action === 'new') openNewForm();
    else {
      setEditing(data as Supplier);
      setForm(data as Supplier);
    }
  };

  // ── Delete ────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await deleteSupplier(deleteTarget.id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Supplier deleted');
    setDeleteTarget(null);
    load();
  };

  // ── Document Upload ───────────────────────────────────
  const handleUpload = async (type: string, file: File) => {
    if (!form.id) {
      toast.error('Save the supplier first before uploading documents');
      return;
    }
    try {
      const fileName = `${form.id}/${type}_${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('company-assets')
        .upload(`supplier_docs/${fileName}`, file);
      if (uploadErr) { toast.error('Upload failed'); return; }
      const { data: { publicUrl } } = supabase.storage
        .from('company-assets')
        .getPublicUrl(`supplier_docs/${fileName}`);

      await upsertSupplierAttachment({
        supplier_id: form.id,
        document_type: type,
        file_name: file.name,
        file_url: publicUrl,
        file_size: file.size,
      });
      const { data: atts } = await getSupplierAttachments(form.id);
      setAttachments(atts || []);
      toast.success('Document uploaded');
    } catch {
      toast.error('Upload failed');
    }
  };

  const handleDeleteAttachment = async (id: string) => {
    await deleteSupplierAttachment(id);
    if (form.id) {
      const { data: atts } = await getSupplierAttachments(form.id);
      setAttachments(atts || []);
    }
    toast.success('Document removed');
  };

  // ── Derived ───────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n);

  return (
    <MainLayout>
      <div className="flex flex-col gap-4 p-4 md:p-6">
        {/* ── Header ─────────────────────────────────── */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Supplier Master</h1>
            <p className="text-sm text-muted-foreground">Manage suppliers, tax details, banking, and accounting</p>
          </div>
          <Button onClick={openNewForm} size="sm" className="gap-1.5 self-start md:self-auto">
            <Plus size={15} /> Add Supplier
          </Button>
        </div>

        {/* ── Search ─────────────────────────────────── */}
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full rounded border border-input bg-input pl-8 pr-8 py-2 text-sm !text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Search by name, code, phone, email, GSTIN..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={13} />
            </button>
          )}
        </div>

        {/* ── Supplier Table ─────────────────────────── */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="whitespace-nowrap px-3 py-3 text-left font-medium text-muted-foreground text-xs">Code</th>
                  <th className="whitespace-nowrap px-3 py-3 text-left font-medium text-muted-foreground text-xs">Name</th>
                  <th className="whitespace-nowrap px-3 py-3 text-left font-medium text-muted-foreground text-xs">Contact</th>
                  <th className="whitespace-nowrap px-3 py-3 text-left font-medium text-muted-foreground text-xs">City</th>
                  <th className="whitespace-nowrap px-3 py-3 text-left font-medium text-muted-foreground text-xs">GSTIN</th>
                  <th className="whitespace-nowrap px-3 py-3 text-left font-medium text-muted-foreground text-xs">Opening</th>
                  <th className="whitespace-nowrap px-3 py-3 text-left font-medium text-muted-foreground text-xs">Status</th>
                  <th className="whitespace-nowrap px-3 py-3 text-right font-medium text-muted-foreground text-xs">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">Loading...</td>
                  </tr>
                ) : suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                      No suppliers found. Click <strong>Add Supplier</strong> to create one.
                    </td>
                  </tr>
                ) : suppliers.map(s => (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-primary">{s.supplier_code || '—'}</td>
                    <td className="whitespace-nowrap px-3 py-3 font-medium text-foreground">{s.name}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                      <div className="flex flex-col gap-0.5">
                        {s.phone && <span className="flex items-center gap-1 text-xs"><Phone size={11} />{s.phone}</span>}
                        {s.email && <span className="flex items-center gap-1 text-xs text-muted-foreground/70">{s.email}</span>}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-muted-foreground text-xs">{s.city || '—'}</td>
                    <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-muted-foreground">{s.gstin || '—'}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs tabular-nums text-right">{s.opening_balance ? fmt(s.opening_balance) : '—'}</td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <Badge variant={s.is_active ? 'default' : 'secondary'} className="text-xs">
                        {s.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEditForm(s)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" title="Edit">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setDeleteTarget(s)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Delete">
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
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages} &middot; {total} total
              </span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          ADD / EDIT SUPPLIER DIALOG
         ══════════════════════════════════════════════════ */}
      <Dialog open={formOpen} onOpenChange={open => { if (!open) closeForm(); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-5xl max-h-[95dvh] overflow-y-auto p-0">
          <DialogHeader className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                <Building2 size={18} className="text-primary" />
                {editing ? 'Edit Supplier' : 'Add New Supplier'}
                {editing && (
                  <Badge variant="outline" className="text-[10px] font-mono">{editing.supplier_code}</Badge>
                )}
              </DialogTitle>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {editing ? 'Modify supplier information' : 'Create a new supplier master record'}
              </div>
            </div>
          </DialogHeader>

          {/* Warnings */}
          <AnimatePresence>
            {warnings.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} className="mx-6 mt-4"
              >
                <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle size={14} className="text-warning" />
                    <span className="text-xs font-semibold text-warning">Duplicate Warnings</span>
                  </div>
                  {warnings.map((w, i) => (
                    <p key={i} className="text-xs text-warning/80 ml-6">{w}</p>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={e => { e.preventDefault(); handleSave('close'); }} className="px-6 pb-4 space-y-4">
            {/* ═══════ Section 1: Basic Information ═══════ */}
            <SectionCard title="Basic Information" icon={<Building2 size={15} />}>
              <div className={fieldGrid}>
                <div>
                  <label className={lblReq}>Supplier Code</label>
                  <div className="flex gap-2">
                    <Input className={inp} value={form.supplier_code || ''}
                      onChange={e => set('supplier_code', e.target.value)}
                      placeholder="Auto-generated" />
                    <button type="button" onClick={async () => set('supplier_code', await getNextSupplierCode())}
                      className="rounded border border-border px-2 text-xs text-muted-foreground hover:bg-muted shrink-0">
                      Auto
                    </button>
                  </div>
                </div>
                <div>
                  <label className={lblReq}>Supplier Name</label>
                  <Input className={inp} value={form.name || ''}
                    onChange={e => set('name', e.target.value)}
                    placeholder="Legal / trading name" required />
                </div>
                <div>
                  <label className={lbl}>Print Name</label>
                  <Input className={inp} value={form.print_name || ''}
                    onChange={e => set('print_name', e.target.value)}
                    placeholder="Name on bills / reports" />
                </div>
                <div>
                  <label className={lbl}>Contact Person</label>
                  <Input className={inp} value={form.contact_person || ''}
                    onChange={e => set('contact_person', e.target.value)}
                    placeholder="Key contact person" />
                </div>
                <SearchableSelect label="Supplier Category" value={form.supplier_category || ''}
                  options={SUPPLIER_CATEGORIES} placeholder="Select category"
                  onChange={v => set('supplier_category', v)} />
                <SearchableSelect label="Supplier Group" value={form.supplier_group || ''}
                  options={SUPPLIER_GROUPS} placeholder="Select group"
                  onChange={v => set('supplier_group', v)} />
                <div>
                  <label className={lbl}>Opening Balance</label>
                  <Input type="number" step="0.01" className={inp}
                    value={form.opening_balance ?? 0}
                    onChange={e => set('opening_balance', parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <label className={lbl}>Dr / Cr</label>
                  <select value={form.dr_cr || 'Dr'} onChange={e => set('dr_cr', e.target.value)} className={inp}>
                    <option value="Dr">Dr (Debit)</option>
                    <option value="Cr">Cr (Credit)</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch checked={form.is_active ?? true}
                    onCheckedChange={v => set('is_active', v)} id="status" />
                  <label htmlFor="status" className="text-sm text-foreground cursor-pointer">
                    {form.is_active ? 'Active' : 'Inactive'}
                  </label>
                </div>
              </div>
            </SectionCard>

            {/* ═══════ Section 2: Contact Information ═══════ */}
            <SectionCard title="Contact Information" icon={<Phone size={15} />}>
              <div className={fieldGrid}>
                <div>
                  <label className={lbl}>Mobile Number *</label>
                  <Input className={inp} value={form.phone || ''}
                    onChange={e => set('phone', e.target.value)}
                    placeholder="+91 98765 43210" />
                </div>
                <div>
                  <label className={lbl}>Alternate Mobile</label>
                  <Input className={inp} value={form.alternate_mobile || ''}
                    onChange={e => set('alternate_mobile', e.target.value)}
                    placeholder="+91 98765 43210" />
                </div>
                <div>
                  <label className={lbl}>Telephone</label>
                  <Input className={inp} value={form.telephone || ''}
                    onChange={e => set('telephone', e.target.value)}
                    placeholder="022 1234 5678" />
                </div>
                <div>
                  <label className={lbl}>Email Address</label>
                  <Input type="email" className={inp} value={form.email || ''}
                    onChange={e => set('email', e.target.value)}
                    placeholder="supplier@example.com" />
                </div>
                <div>
                  <label className={lbl}>Website</label>
                  <Input className={inp} value={form.website || ''}
                    onChange={e => set('website', e.target.value)}
                    placeholder="https://example.com" />
                </div>
              </div>
            </SectionCard>

            {/* ═══════ Section 3: Address Information ═══════ */}
            <SectionCard title="Billing Address" icon={<MapPin size={15} />}>
              <div className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <label className={lbl}>Address Line 1</label>
                    <Textarea className={inp} rows={2} value={form.billing_address || ''}
                      onChange={e => set('billing_address', e.target.value)}
                      placeholder="Building / Street / Landmark" />
                  </div>
                  <div className={fieldGrid}>
                    <div>
                      <label className={lbl}>Area / Locality</label>
                      <Input className={inp} value={form.area || ''}
                        onChange={e => set('area', e.target.value)} />
                    </div>
                    <div>
                      <label className={lbl}>City</label>
                      <Input className={inp} value={form.city || ''}
                        onChange={e => set('city', e.target.value)} />
                    </div>
                    <div>
                      <label className={lbl}>District</label>
                      <Input className={inp} value={form.district || ''}
                        onChange={e => set('district', e.target.value)} />
                    </div>
                    <SearchableSelect label="State" value={form.state || ''}
                      options={STATES} placeholder="Select state"
                      onChange={v => set('state', v)} />
                    <SearchableSelect label="Country" value={form.country || 'India'}
                      options={COUNTRIES} placeholder="Select country"
                      onChange={v => set('country', v)} />
                    <div>
                      <label className={lbl}>Pincode</label>
                      <Input className={inp} value={form.pincode || ''}
                        onChange={e => set('pincode', e.target.value)}
                        placeholder="6-digit pincode" />
                    </div>
                  </div>
                </div>

                {/* Same as shipping */}
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <Checkbox id="sameShipping" checked={sameAsBilling}
                    onCheckedChange={v => setSameAsShipping(v === true)} />
                  <label htmlFor="sameShipping" className="text-sm text-foreground cursor-pointer">
                    Same as Shipping Address
                  </label>
                </div>

                {/* Shipping Address */}
                <AnimatePresence>
                  {!sameAsBilling && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-lg border border-border bg-muted/10 p-4">
                        <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1">
                          <MapPin size={12} /> Shipping Address
                        </p>
                        <div>
                          <label className={lbl}>Shipping Address</label>
                          <Textarea className={inp} rows={2} value={form.shipping_address || ''}
                            onChange={e => set('shipping_address', e.target.value)}
                            placeholder="Shipping address if different" />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </SectionCard>

            {/* ═══════ Section 4: GST & Tax Information ═══════ */}
            <SectionCard title="GST & Tax Information" icon={<Shield size={15} />}>
              <div className={fieldGrid}>
                <div>
                  <label className={lbl}>GST Registered</label>
                  <select value={form.gst_registered || 'No'}
                    onChange={e => set('gst_registered', e.target.value)} className={inp}>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
                <div>
                  <label className={`${lbl} ${form.gstin ? 'after:content-["✓"] after:text-success after:ml-1' : ''}`}>
                    GSTIN Number
                  </label>
                  <Input className={form.gstin && !GST_REGEX.test(form.gstin) ? inpErr : inp}
                    value={form.gstin || ''}
                    onChange={e => set('gstin', e.target.value.toUpperCase())}
                    placeholder="22AAAAA0000A1Z5" maxLength={15} />
                  {form.gstin && GST_REGEX.test(form.gstin) && (
                    <p className="text-[10px] text-success mt-0.5 flex items-center gap-0.5">
                      <CheckCircle size={10} /> Valid GSTIN
                    </p>
                  )}
                </div>
                <div>
                  <label className={`${lbl} ${form.pan ? 'after:content-["✓"] after:text-success after:ml-1' : ''}`}>
                    PAN Number
                  </label>
                  <Input className={form.pan && !PAN_REGEX.test(form.pan) ? inpErr : inp}
                    value={form.pan || ''}
                    onChange={e => set('pan', e.target.value.toUpperCase())}
                    placeholder="AAAAA0000A" maxLength={10} />
                  {form.pan && PAN_REGEX.test(form.pan) && (
                    <p className="text-[10px] text-success mt-0.5 flex items-center gap-0.5">
                      <CheckCircle size={10} /> Valid PAN
                    </p>
                  )}
                </div>
                <div>
                  <label className={lbl}>TAN Number</label>
                  <Input className={inp} value={form.tan || ''}
                    onChange={e => set('tan', e.target.value.toUpperCase())}
                    placeholder="AAAA00000A" />
                </div>
                <div>
                  <label className={lbl}>Aadhaar Number (Optional)</label>
                  <Input className={inp} value={form.aadhaar_no || ''}
                    onChange={e => set('aadhaar_no', e.target.value)}
                    placeholder="12-digit Aadhaar" maxLength={12} />
                </div>
                <div>
                  <label className={lbl}>MSME Registration No</label>
                  <Input className={inp} value={form.msme_no || ''}
                    onChange={e => set('msme_no', e.target.value)}
                    placeholder="UDYAM-XX-00-0000000" />
                </div>
              </div>
            </SectionCard>

            {/* ═══════ Section 5: Accounting Details ═══════ */}
            <SectionCard title="Accounting Details" icon={<BookOpen size={15} />}>
              <div className={fieldGrid}>
                <div>
                  <label className={lbl}>Supplier Ledger Name</label>
                  <Input className={inp} value={form.supplier_ledger_name || form.name || ''}
                    onChange={e => set('supplier_ledger_name', e.target.value)}
                    placeholder="Auto from supplier name" />
                  <p className="text-[10px] text-muted-foreground mt-0.5">Auto-created from supplier name</p>
                </div>
                <div>
                  <label className={lbl}>Ledger Group</label>
                  <Input className={inp} value={form.ledger_group || 'Sundry Creditors'}
                    onChange={e => set('ledger_group', e.target.value)} readOnly />
                  <p className="text-[10px] text-muted-foreground mt-0.5">Fixed: Sundry Creditors</p>
                </div>
                <div>
                  <label className={lbl}>Credit Limit</label>
                  <Input type="number" step="0.01" className={inp}
                    value={form.credit_limit ?? 0}
                    onChange={e => set('credit_limit', parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <label className={lbl}>Credit Days</label>
                  <Input type="number" className={inp}
                    value={form.credit_days ?? 0}
                    onChange={e => set('credit_days', parseInt(e.target.value) || 0)} />
                </div>
                <SearchableSelect label="Payment Terms" value={form.payment_terms || ''}
                  options={PAYMENT_TERMS} placeholder="Select terms"
                  onChange={v => set('payment_terms', v)} />
                <SearchableSelect label="Currency" value={form.currency || 'INR'}
                  options={CURRENCIES} placeholder="Select currency"
                  onChange={v => set('currency', v)} />
                <div className="flex items-center gap-3 pt-6">
                  <Switch checked={form.tds_applicable ?? false}
                    onCheckedChange={v => set('tds_applicable', v)} id="tds" />
                  <label htmlFor="tds" className="text-sm text-foreground cursor-pointer">TDS Applicable</label>
                </div>
                {form.tds_applicable && (
                  <SearchableSelect label="TDS Section" value={form.tds_section || ''}
                    options={TDS_SECTIONS} placeholder="Select TDS section"
                    onChange={v => set('tds_section', v)} />
                )}
              </div>
            </SectionCard>

            {/* ═══════ Section 6: Banking Information ═══════ */}
            <SectionCard title="Banking Information" icon={<Banknote size={15} />}>
              <div className={fieldGrid}>
                <div>
                  <label className={lbl}>Account Holder Name</label>
                  <Input className={inp} value={form.account_holder_name || ''}
                    onChange={e => set('account_holder_name', e.target.value)} />
                </div>
                <div>
                  <label className={lbl}>Bank Name</label>
                  <Input className={inp} value={form.bank_name || ''}
                    onChange={e => set('bank_name', e.target.value)} />
                </div>
                <div>
                  <label className={lbl}>Branch Name</label>
                  <Input className={inp} value={form.branch_name || ''}
                    onChange={e => set('branch_name', e.target.value)} />
                </div>
                <div>
                  <label className={lbl}>Account Number</label>
                  <Input className={inp} value={form.account_no || ''}
                    onChange={e => set('account_no', e.target.value)} />
                </div>
                <div>
                  <label className={`${lbl} ${form.ifsc && IFSC_REGEX.test(form.ifsc) ? 'after:content-["✓"] after:text-success after:ml-1' : ''}`}>
                    IFSC Code
                  </label>
                  <Input className={form.ifsc && !IFSC_REGEX.test(form.ifsc) ? inpErr : inp}
                    value={form.ifsc || ''}
                    onChange={e => set('ifsc', e.target.value.toUpperCase())}
                    placeholder="HDFC0001234" maxLength={11} />
                </div>
                <div>
                  <label className={lbl}>UPI ID</label>
                  <Input className={inp} value={form.upi_id || ''}
                    onChange={e => set('upi_id', e.target.value)}
                    placeholder="supplier@upi" />
                </div>
              </div>
            </SectionCard>

            {/* ═══════ Section 7: Purchase Configuration ═══════ */}
            <SectionCard title="Purchase Configuration" icon={<Package size={15} />}>
              <div className={fieldGrid}>
                <SearchableSelect label="Default GST Type" value={form.default_gst_type || ''}
                  options={GST_TYPES} placeholder="Select GST type"
                  onChange={v => set('default_gst_type', v)} />
                <SearchableSelect label="Price List" value={form.price_list || ''}
                  options={PRICE_LISTS} placeholder="Select price list"
                  onChange={v => set('price_list', v)} />
                <div>
                  <label className={lbl}>Purchase Discount %</label>
                  <Input type="number" min={0} max={100} step={0.01} className={inp}
                    value={form.purchase_discount ?? 0}
                    onChange={e => set('purchase_discount', parseFloat(e.target.value) || 0)} />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch checked={form.freight_applicable ?? false}
                    onCheckedChange={v => set('freight_applicable', v)} id="freight" />
                  <label htmlFor="freight" className="text-sm text-foreground cursor-pointer">Freight Applicable</label>
                </div>
                <div>
                  <label className={lbl}>Transporter Name</label>
                  <Input className={inp} value={form.transporter_name || ''}
                    onChange={e => set('transporter_name', e.target.value)} />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch checked={form.preferred_supplier ?? false}
                    onCheckedChange={v => set('preferred_supplier', v)} id="preferred" />
                  <label htmlFor="preferred" className="text-sm text-foreground cursor-pointer">Preferred Supplier</label>
                </div>
              </div>
            </SectionCard>

            {/* ═══════ Section 8: Documents Upload ═══════ */}
            <SectionCard title="Documents Upload" icon={<Upload size={15} />} defaultOpen={false}>
              <DocumentUpload
                attachments={attachments}
                onUpload={handleUpload}
                onDelete={handleDeleteAttachment}
                onPreview={setPreviewUrl}
              />
            </SectionCard>

            {/* ═══════ Section 9: Additional Information ═══════ */}
            <SectionCard title="Additional Information" icon={<Info size={15} />} defaultOpen={false}>
              <div className={fieldGrid}>
                <div className="sm:col-span-2">
                  <label className={lbl}>Remarks</label>
                  <Textarea className={inp} rows={3} value={form.remarks || ''}
                    onChange={e => set('remarks', e.target.value)}
                    placeholder="Notes visible on reports" />
                </div>
                <div className="sm:col-span-2">
                  <label className={lbl}>Internal Notes</label>
                  <Textarea className={inp} rows={3} value={form.internal_notes || ''}
                    onChange={e => set('internal_notes', e.target.value)}
                    placeholder="Internal instructions / notes" />
                </div>
                <div className="sm:col-span-2">
                  <label className={lbl}>Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {['Premium', 'Regular', 'International', 'Local', 'Verified', 'New'].map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          const current = form.tags || [];
                          set('tags', current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag]);
                        }}
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs border transition-colors ${
                          (form.tags || []).includes(tag)
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:border-muted-foreground'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* ── Footer Actions ─────────────────────── */}
            <div className="sticky bottom-0 z-10 bg-card border-t border-border -mx-6 px-6 py-4 mt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {!editing && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Info size={10} /> Fields marked with <span className="text-destructive">*</span> are required
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={closeForm} className="gap-1.5">
                    <XCircle size={14} /> Cancel
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={resetForm} className="gap-1.5">
                    <RotateCcw size={14} /> Reset
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => handleSave('new')} disabled={saving} className="gap-1.5">
                    <Save size={14} /> Save &amp; New
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => handleSave('stay')} disabled={saving} className="gap-1.5">
                    <Save size={14} /> {saving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button type="submit" size="sm" disabled={saving} className="gap-1.5">
                    <Check size={14} /> Save &amp; Close
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ─────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Supplier?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong> ({deleteTarget?.supplier_code})?
              This action cannot be undone.
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

      {/* ── Document Preview ──────────────────────────── */}
      <Dialog open={!!previewUrl} onOpenChange={o => !o && setPreviewUrl('')}>
        <DialogContent className="max-w-3xl max-h-[90dvh]">
          <DialogHeader>
            <DialogTitle>Document Preview</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center min-h-[300px] bg-muted/20 rounded-lg overflow-hidden">
            {previewUrl.match(/\.(pdf)$/i) ? (
              <iframe src={previewUrl} className="w-full h-[60vh]" title="Document preview" />
            ) : (
              <img src={previewUrl} alt="Document" className="max-w-full max-h-[60vh] object-contain" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

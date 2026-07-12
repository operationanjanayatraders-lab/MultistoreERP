import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layouts/MainLayout';
import {
  getVouchers, createVoucher, deleteVoucher,
  getAccounts, createAccount, deleteAccount,
  getLedgerEntries, getBalanceSheet, getProfitAndLoss,
} from '@/lib/api';
import type { Voucher, Account } from '@/types/types';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

// Map URL path segment → tab id and voucher type
const PATH_TO_TAB: Record<string, { tab: AccountTab; voucherType?: string }> = {
  'chart':        { tab: 'chart' },
  'ledger':       { tab: 'ledger' },
  'journal':      { tab: 'vouchers', voucherType: 'journal' },
  'payment':      { tab: 'vouchers', voucherType: 'payment' },
  'receipt':      { tab: 'vouchers', voucherType: 'receipt' },
  'contra':       { tab: 'vouchers', voucherType: 'contra' },
  'debit-note':   { tab: 'vouchers', voucherType: 'debit_note' },
  'credit-note':  { tab: 'vouchers', voucherType: 'credit_note' },
  'balance-sheet':{ tab: 'balance_sheet' },
  'pnl':          { tab: 'pnl' },
};

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

const VOUCHER_TYPES = [
  { value: 'journal', label: 'Journal Entry' },
  { value: 'payment', label: 'Payment Voucher' },
  { value: 'receipt', label: 'Receipt Voucher' },
  { value: 'contra', label: 'Contra Voucher' },
  { value: 'debit_note', label: 'Debit Note' },
  { value: 'credit_note', label: 'Credit Note' },
];

const ACCOUNT_TYPES = ['asset', 'liability', 'equity', 'revenue', 'expense'];

// Voucher Form
const VoucherForm: React.FC<{
  accounts: Account[];
  voucherType: string;
  userId: string;
  onSave: (v: Partial<Voucher>, lines: { account_id: string; debit: number; credit: number; description: string }[]) => Promise<void>;
  onClose: () => void;
}> = ({ accounts, voucherType, userId, onSave, onClose }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [narration, setNarration] = useState('');
  const [lines, setLines] = useState([
    { account_id: '', debit: 0, credit: 0, description: '' },
    { account_id: '', debit: 0, credit: 0, description: '' },
  ]);
  const [saving, setSaving] = useState(false);

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const setLine = (i: number, k: string, v: string | number) => {
    setLines(prev => { const u = [...prev]; u[i] = { ...u[i], [k]: v }; return u; });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) { toast.error('Voucher must balance: Total debits must equal total credits'); return; }
    const validLines = lines.filter(l => l.account_id);
    if (validLines.length < 2) { toast.error('Need at least 2 account lines'); return; }
    setSaving(true);
    const num = `V-${Date.now()}`;
    await onSave(
      { voucher_number: num, voucher_type: voucherType as import('@/types/types').VoucherType, voucher_date: date, narration, status: 'draft' as const, total_amount: totalDebit, created_by: userId },
      validLines
    );
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-normal">Voucher Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-normal">Narration</label>
          <input value={narration} onChange={e => setNarration(e.target.value)}
            className="w-full rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
      </div>

      <div className="rounded border border-border overflow-x-auto">
        <table className="w-full min-w-max">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {['Account', 'Description', 'Debit', 'Credit', ''].map(h => (
                <th key={h} className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className="border-b border-border">
                <td className="px-3 py-1.5">
                  <select value={line.account_id} onChange={e => setLine(i, 'account_id', e.target.value)}
                    className="w-40 rounded border border-input bg-input px-2 py-1.5 text-sm focus:border-primary focus:outline-none">
                    <option value="">Select account</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </td>
                <td className="px-3 py-1.5">
                  <input value={line.description} onChange={e => setLine(i, 'description', e.target.value)}
                    className="w-32 rounded border border-input bg-input px-2 py-1.5 text-sm focus:border-primary focus:outline-none" />
                </td>
                <td className="px-3 py-1.5">
                  <input type="number" min={0} step={0.01} value={line.debit}
                    onChange={e => setLine(i, 'debit', parseFloat(e.target.value) || 0)}
                    className="w-24 rounded border border-input bg-input px-2 py-1.5 text-sm tabular-nums focus:border-primary focus:outline-none" />
                </td>
                <td className="px-3 py-1.5">
                  <input type="number" min={0} step={0.01} value={line.credit}
                    onChange={e => setLine(i, 'credit', parseFloat(e.target.value) || 0)}
                    className="w-24 rounded border border-input bg-input px-2 py-1.5 text-sm tabular-nums focus:border-primary focus:outline-none" />
                </td>
                <td className="px-3 py-1.5">
                  {lines.length > 2 && <button type="button" onClick={() => setLines(prev => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">✕</button>}
                </td>
              </tr>
            ))}
            <tr className="bg-muted/30">
              <td className="px-3 py-2 text-xs font-semibold" colSpan={2}>Totals</td>
              <td className={cn('px-3 py-2 text-sm font-bold tabular-nums', !isBalanced && 'text-destructive')}>{fmt(totalDebit)}</td>
              <td className={cn('px-3 py-2 text-sm font-bold tabular-nums', !isBalanced && 'text-destructive')}>{fmt(totalCredit)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
      {!isBalanced && <p className="text-xs text-destructive">⚠ Difference: {fmt(Math.abs(totalDebit - totalCredit))} — voucher must balance</p>}
      <button type="button" onClick={() => setLines(prev => [...prev, { account_id: '', debit: 0, credit: 0, description: '' }])} className="text-sm text-primary hover:underline">+ Add line</button>

      <DialogFooter>
        <button type="button" onClick={onClose} className="rounded border border-border bg-background px-4 py-2 text-sm hover:bg-muted">Cancel</button>
        <button type="submit" disabled={saving || !isBalanced} className="rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
          {saving ? 'Saving…' : 'Save Voucher'}
        </button>
      </DialogFooter>
    </form>
  );
};

type AccountTab = 'vouchers' | 'chart' | 'ledger' | 'balance_sheet' | 'pnl';

export const AccountsPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Derive active tab + voucher type from URL
  const pathSegment = location.pathname.split('/').pop() || 'chart';
  const urlMapping = PATH_TO_TAB[pathSegment] ?? { tab: 'chart' as AccountTab };
  const tab: AccountTab = urlMapping.tab;
  const voucherType = urlMapping.voucherType ?? 'journal';

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [ledger, setLedger] = useState<{ account_name: string; debit: number; credit: number; balance: number }[]>([]);
  const [bsData, setBsData] = useState<Record<string, { name: string; balance: number }[]>>({});
  const [pnlData, setPnlData] = useState<{ revenue: number; expenses: number; netProfit: number; details: Record<string, { name: string; balance: number }[]> }>({ revenue: 0, expenses: 0, netProfit: 0, details: {} });
  const [reportDateRange, setReportDateRange] = useState({ from: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], to: new Date().toISOString().split('T')[0] });
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [accountFormOpen, setAccountFormOpen] = useState(false);
  const [newAccount, setNewAccount] = useState({ name: '', code: '', account_type: 'asset', is_active: true });

  const loadVouchers = useCallback(async () => {
    setLoading(true);
    const { data } = await getVouchers(1, 50, voucherType);
    setVouchers(data);
    setLoading(false);
  }, [voucherType]);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    const { data } = await getAccounts();
    setAccounts(data);
    setLoading(false);
  }, []);

  const loadLedger = useCallback(async () => {
    setLoading(true);
    const data = await getLedgerEntries(reportDateRange.from, reportDateRange.to);
    setLedger(data);
    setLoading(false);
  }, [reportDateRange]);

  const loadBS = useCallback(async () => {
    setLoading(true);
    const data = await getBalanceSheet(reportDateRange.to);
    setBsData(data);
    setLoading(false);
  }, [reportDateRange.to]);

  const loadPnL = useCallback(async () => {
    setLoading(true);
    const data = await getProfitAndLoss(reportDateRange.from, reportDateRange.to);
    setPnlData(data);
    setLoading(false);
  }, [reportDateRange]);

  useEffect(() => {
    if (tab === 'vouchers') loadVouchers();
    if (tab === 'chart') loadAccounts();
    if (tab === 'ledger') loadLedger();
    if (tab === 'balance_sheet') loadBS();
    if (tab === 'pnl') loadPnL();
  }, [tab, loadVouchers, loadAccounts, loadLedger, loadBS, loadPnL]);

  const handleSaveVoucher = async (v: Partial<Voucher>, lines: Parameters<typeof createVoucher>[1]) => {
    const { error } = await createVoucher(v, lines);
    if (error) { toast.error(error.message); return; }
    toast.success('Voucher created'); setFormOpen(false); loadVouchers();
  };

  const handleDeleteVoucher = async () => {
    if (!deleteId) return;
    const { error } = await deleteVoucher(deleteId);
    if (error) { toast.error(error.message); return; }
    toast.success('Deleted'); setDeleteId(null); loadVouchers();
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccount.name || !newAccount.code) { toast.error('Name and code are required'); return; }
    const { error } = await createAccount({ ...newAccount, account_type: newAccount.account_type as import('@/types/types').AccountType, parent_id: null, created_by: user?.id });
    if (error) { toast.error(error.message); return; }
    toast.success('Account created'); setAccountFormOpen(false); setNewAccount({ name: '', code: '', account_type: 'asset', is_active: true }); loadAccounts();
  };

  const labelForType = (t: string) => VOUCHER_TYPES.find(v => v.value === t)?.label || t;

  const typeClass = (t: string) => {
    if (t === 'payment' || t === 'debit_note') return 'status-badge-danger';
    if (t === 'receipt' || t === 'credit_note') return 'status-badge-success';
    return 'status-badge-neutral';
  };

  // Navigate to voucher type URL
  const voucherTypeToPath: Record<string, string> = {
    journal: '/accounts/journal', payment: '/accounts/payment', receipt: '/accounts/receipt',
    contra: '/accounts/contra', debit_note: '/accounts/debit-note', credit_note: '/accounts/credit-note',
  };

  const SUB_TABS: { id: AccountTab; label: string; path: string }[] = [
    { id: 'vouchers', label: 'Vouchers', path: voucherTypeToPath[voucherType] || '/accounts/journal' },
    { id: 'chart', label: 'Chart of Accounts', path: '/accounts/chart' },
    { id: 'ledger', label: 'Ledger', path: '/accounts/ledger' },
    { id: 'balance_sheet', label: 'Balance Sheet', path: '/accounts/balance-sheet' },
    { id: 'pnl', label: 'Profit & Loss', path: '/accounts/pnl' },
  ];

  return (
    <MainLayout>
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Accounts</h2>
          <p className="text-sm text-muted-foreground">Vouchers, chart of accounts, ledger, and financial reports</p>
        </div>

        {/* Sub-tabs */}
        <div className="border-b border-border">
          <div className="flex overflow-x-auto whitespace-nowrap gap-1">
            {SUB_TABS.map(t => (
              <button key={t.id} onClick={() => navigate(t.path)}
                className={cn('px-4 py-2 text-sm font-medium transition-colors shrink-0', tab === t.id ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground')}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Vouchers Tab */}
        {tab === 'vouchers' && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <select value={voucherType} onChange={e => navigate(voucherTypeToPath[e.target.value] || '/accounts/journal')}
                  className="rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 focus:border-primary focus:outline-none">
                  {VOUCHER_TYPES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                </select>
              </div>
              <button onClick={() => setFormOpen(true)}
                className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
                <Plus size={16} /> New Voucher
              </button>
            </div>

            <div className="rounded border border-border bg-card shadow-card overflow-x-auto">
              <table className="w-full min-w-max">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    {['Voucher #', 'Type', 'Date', 'Narration', 'Amount', 'Status', 'Actions'].map(h => (
                      <th key={h} className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [...Array(4)].map((_, i) => <tr key={i} className="border-b border-border">{[...Array(7)].map((_, j) => <td key={j} className="px-4 py-2.5"><div className="h-4 w-20 animate-pulse rounded bg-muted" /></td>)}</tr>)
                  ) : vouchers.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">No vouchers of this type</td></tr>
                  ) : vouchers.map(v => (
                    <tr key={v.id} className="border-b border-border erp-table-row">
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs font-bold text-primary">{v.voucher_number}</td>
                      <td className="whitespace-nowrap px-4 py-2.5"><span className={typeClass(v.voucher_type)}>{labelForType(v.voucher_type)}</span></td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">{v.voucher_date}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs max-w-xs truncate">{v.narration || '—'}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-sm font-semibold tabular-nums">{fmt(v.total_amount)}</td>
                      <td className="whitespace-nowrap px-4 py-2.5"><span className={v.status === 'posted' ? 'status-badge-success' : 'status-badge-neutral'}>{v.status}</span></td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <button onClick={() => setDeleteId(v.id)} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Chart of Accounts Tab */}
        {tab === 'chart' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => setAccountFormOpen(true)} className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
                <Plus size={16} /> Add Account
              </button>
            </div>
            <div className="rounded border border-border bg-card shadow-card overflow-x-auto">
              <table className="w-full min-w-max">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    {['Code', 'Account Name', 'Type', 'Status'].map(h => (
                      <th key={h} className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [...Array(6)].map((_, i) => <tr key={i} className="border-b border-border">{[...Array(4)].map((_, j) => <td key={j} className="px-4 py-2.5"><div className="h-4 w-20 animate-pulse rounded bg-muted" /></td>)}</tr>)
                  ) : accounts.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">No accounts defined</td></tr>
                  ) : accounts.map(a => (
                    <tr key={a.id} className="border-b border-border erp-table-row">
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs font-bold text-primary">{a.code}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-sm font-medium">{a.name}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs capitalize text-muted-foreground">{a.account_type}</td>
                      <td className="whitespace-nowrap px-4 py-2.5"><span className={a.is_active ? 'status-badge-success' : 'status-badge-neutral'}>{a.is_active ? 'Active' : 'Inactive'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Ledger Tab */}
        {tab === 'ledger' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">From</label>
                <input type="date" value={reportDateRange.from} onChange={e => setReportDateRange(r => ({ ...r, from: e.target.value }))}
                  className="rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">To</label>
                <input type="date" value={reportDateRange.to} onChange={e => setReportDateRange(r => ({ ...r, to: e.target.value }))}
                  className="rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 focus:border-primary focus:outline-none" />
              </div>
              <button onClick={loadLedger} className="self-end rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">Refresh</button>
            </div>
            <div className="rounded border border-border bg-card shadow-card overflow-x-auto">
              <table className="w-full min-w-max">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    {['Account', 'Total Debit', 'Total Credit', 'Net Balance'].map(h => (
                      <th key={h} className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [...Array(5)].map((_, i) => <tr key={i} className="border-b border-border">{[...Array(4)].map((_, j) => <td key={j} className="px-4 py-2.5"><div className="h-4 w-20 animate-pulse rounded bg-muted" /></td>)}</tr>)
                  ) : ledger.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">No ledger entries for selected period</td></tr>
                  ) : ledger.map((l, i) => (
                    <tr key={i} className="border-b border-border erp-table-row">
                      <td className="whitespace-nowrap px-4 py-2.5 text-sm font-medium">{l.account_name}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-sm tabular-nums text-right">{fmt(l.debit)}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-sm tabular-nums text-right">{fmt(l.credit)}</td>
                      <td className={`whitespace-nowrap px-4 py-2.5 text-sm font-semibold tabular-nums text-right ${l.balance >= 0 ? 'text-foreground' : 'text-destructive'}`}>{fmt(l.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Balance Sheet Tab */}
        {tab === 'balance_sheet' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">As of Date</label>
                <input type="date" value={reportDateRange.to} onChange={e => setReportDateRange(r => ({ ...r, to: e.target.value }))}
                  className="rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 focus:border-primary focus:outline-none" />
              </div>
              <button onClick={loadBS} className="self-end rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">Refresh</button>
            </div>
            {loading ? (
              <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-6 animate-pulse rounded bg-muted" />)}</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {Object.entries(bsData).map(([type, entries]) => (
                  <div key={type} className="rounded border border-border bg-card shadow-card">
                    <div className="border-b border-border px-4 py-3 bg-muted/30">
                      <p className="text-sm font-semibold capitalize">{type}</p>
                    </div>
                    <table className="w-full">
                      <tbody>
                        {entries.length === 0 ? (
                          <tr><td className="px-4 py-3 text-sm text-muted-foreground">No accounts</td></tr>
                        ) : entries.map((e, i) => (
                          <tr key={i} className="border-b border-border last:border-0">
                            <td className="px-4 py-2 text-sm">{e.name}</td>
                            <td className="px-4 py-2 text-sm tabular-nums text-right font-medium">{fmt(e.balance)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-muted/30">
                          <td className="px-4 py-2 text-xs font-semibold">Total</td>
                          <td className="px-4 py-2 text-sm font-bold tabular-nums text-right">
                            {fmt(entries.reduce((s, e) => s + e.balance, 0))}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* P&L Tab */}
        {tab === 'pnl' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">From</label>
                <input type="date" value={reportDateRange.from} onChange={e => setReportDateRange(r => ({ ...r, from: e.target.value }))}
                  className="rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">To</label>
                <input type="date" value={reportDateRange.to} onChange={e => setReportDateRange(r => ({ ...r, to: e.target.value }))}
                  className="rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 focus:border-primary focus:outline-none" />
              </div>
              <button onClick={loadPnL} className="self-end rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">Refresh</button>
            </div>
            {loading ? (
              <div className="space-y-2">{[...Array(8)].map((_, i) => <div key={i} className="h-6 animate-pulse rounded bg-muted" />)}</div>
            ) : (
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded border border-border bg-card p-4 text-center shadow-card">
                    <p className="text-xs text-muted-foreground">Revenue</p>
                    <p className="mt-1 text-xl font-bold tabular-nums text-chart-1">{fmt(pnlData.revenue)}</p>
                  </div>
                  <div className="rounded border border-border bg-card p-4 text-center shadow-card">
                    <p className="text-xs text-muted-foreground">Expenses</p>
                    <p className="mt-1 text-xl font-bold tabular-nums text-destructive">{fmt(pnlData.expenses)}</p>
                  </div>
                  <div className={cn('rounded border border-border bg-card p-4 text-center shadow-card', pnlData.netProfit >= 0 ? '' : 'border-destructive/30')}>
                    <p className="text-xs text-muted-foreground">Net Profit</p>
                    <p className={cn('mt-1 text-xl font-bold tabular-nums', pnlData.netProfit >= 0 ? 'text-foreground' : 'text-destructive')}>{fmt(pnlData.netProfit)}</p>
                  </div>
                </div>

                {/* Detail */}
                <div className="grid gap-4 md:grid-cols-2">
                  {Object.entries(pnlData.details).map(([type, entries]) => (
                    <div key={type} className="rounded border border-border bg-card shadow-card">
                      <div className="border-b border-border px-4 py-3 bg-muted/30">
                        <p className="text-sm font-semibold capitalize">{type}</p>
                      </div>
                      <table className="w-full">
                        <tbody>
                          {entries.length === 0 ? (
                            <tr><td className="px-4 py-3 text-sm text-muted-foreground">No entries</td></tr>
                          ) : entries.map((e, i) => (
                            <tr key={i} className="border-b border-border last:border-0">
                              <td className="px-4 py-2 text-sm">{e.name}</td>
                              <td className="px-4 py-2 text-sm tabular-nums text-right font-medium">{fmt(e.balance)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-muted/30">
                            <td className="px-4 py-2 text-xs font-semibold">Total</td>
                            <td className="px-4 py-2 text-sm font-bold tabular-nums text-right">
                              {fmt(entries.reduce((s, e) => s + e.balance, 0))}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Voucher Form Dialog */}
      <Dialog open={formOpen} onOpenChange={open => { if (!open) setFormOpen(false); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-3xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>New {labelForType(voucherType)}</DialogTitle></DialogHeader>
          <VoucherForm accounts={accounts.length ? accounts : []} voucherType={voucherType} userId={user?.id || ''} onSave={handleSaveVoucher} onClose={() => setFormOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Add Account Dialog */}
      <Dialog open={accountFormOpen} onOpenChange={open => { if (!open) setAccountFormOpen(false); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader><DialogTitle>Add Account</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveAccount} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-normal">Account Name *</label>
                <input value={newAccount.name} onChange={e => setNewAccount(a => ({ ...a, name: e.target.value }))}
                  className="w-full rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-normal">Code *</label>
                <input value={newAccount.code} onChange={e => setNewAccount(a => ({ ...a, code: e.target.value }))}
                  className="w-full rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-normal">Account Type</label>
                <select value={newAccount.account_type} onChange={e => setNewAccount(a => ({ ...a, account_type: e.target.value }))}
                  className="w-full rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring">
                  {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setAccountFormOpen(false)} className="rounded border border-border bg-background px-4 py-2 text-sm hover:bg-muted">Cancel</button>
              <button type="submit" className="rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">Save Account</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Voucher */}
      <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader><AlertDialogTitle>Delete Voucher</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteVoucher} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};


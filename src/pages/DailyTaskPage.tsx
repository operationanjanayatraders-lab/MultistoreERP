import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Plus, Trash2, Save, FileText, ClipboardList, Settings2,
  Calendar, Download, Printer, ChevronDown, ChevronUp, Pencil, FileSpreadsheet,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfYear, endOfYear, parseISO, subDays } from 'date-fns';
import { MainLayout } from '@/components/layouts/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import {
  getDepartments, upsertDepartment, deleteDepartment,
  getDesignations, upsertDesignation, deleteDesignation,
  getDailyTaskReports, getDailyTaskReportByDate, saveDailyTaskReport,
  deleteDailyTaskReport, getProfiles,
} from '@/lib/api';
import type { DailyTaskReport, Department, Profile } from '@/types/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

type TaskTab = 'submit' | 'reports' | 'masters';
type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

interface TaskRow {
  key: string;
  task_type: string;
  work_description: string;
  status: string;
  remarks?: string;
  expected_completion?: string;
}

const TASK_STATUSES = ['Completed', 'In Progress', 'Pending', 'Partially Done', 'Not Started'];
const PENDING_STATUSES = ['Ongoing', 'Pending', 'Blocked', 'On Hold', 'Awaiting Input'];

const inp = 'w-full rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 placeholder:text-gray-600 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring';
const lbl = 'mb-1 block text-sm font-normal text-muted-foreground';
const th = 'border border-border bg-muted/60 px-2 py-2 text-left text-xs font-semibold text-muted-foreground';
const td = 'border border-border px-2 py-1.5 align-top';

const emptyDailyRow = (): TaskRow => ({
  key: crypto.randomUUID(),
  task_type: '',
  work_description: '',
  status: 'Completed',
  remarks: '',
});

const emptyPendingRow = (): TaskRow => ({
  key: crypto.randomUUID(),
  task_type: '',
  work_description: '',
  status: 'Ongoing',
  expected_completion: '',
});

const todayStr = () => format(new Date(), 'yyyy-MM-dd');

function getDateRange(period: ReportPeriod, anchor: string, customFrom: string, customTo: string) {
  const d = parseISO(anchor);
  switch (period) {
    case 'daily': return { from: anchor, to: anchor };
    case 'weekly': return { from: format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd'), to: format(endOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd') };
    case 'monthly': return { from: format(startOfMonth(d), 'yyyy-MM-dd'), to: format(endOfMonth(d), 'yyyy-MM-dd') };
    case 'yearly': return { from: format(startOfYear(d), 'yyyy-MM-dd'), to: format(endOfYear(d), 'yyyy-MM-dd') };
    case 'custom': return { from: customFrom || anchor, to: customTo || anchor };
  }
}

export const DailyTaskPage: React.FC = () => {
  const { user, profile, isAdmin } = useAuth();
  const location = useLocation();

  const activeTab: TaskTab = location.pathname.includes('/reports')
    ? 'reports'
    : location.pathname.includes('/masters')
    ? 'masters'
    : 'submit';

  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<{ id: string; name: string }[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  // ── Submit form state ─────────────────────────────────────
  const [reportDate, setReportDate] = useState(todayStr());
  const [departmentId, setDepartmentId] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [designation, setDesignation] = useState('');
  const [dailyRows, setDailyRows] = useState<TaskRow[]>([emptyDailyRow()]);
  const [pendingRows, setPendingRows] = useState<TaskRow[]>([emptyPendingRow()]);
  const [issues, setIssues] = useState('');
  const [planTomorrow, setPlanTomorrow] = useState('');
  const [existingReportId, setExistingReportId] = useState<string | undefined>();
  const [loadingForm, setLoadingForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Reports state ───────────────────────────────────────────
  const [period, setPeriod] = useState<ReportPeriod>('daily');
  const [anchorDate, setAnchorDate] = useState(todayStr());
  const [customFrom, setCustomFrom] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [customTo, setCustomTo] = useState(todayStr());
  const [filterDept, setFilterDept] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [reports, setReports] = useState<DailyTaskReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Masters state ───────────────────────────────────────────
  const [newDept, setNewDept] = useState('');
  const [editDeptId, setEditDeptId] = useState<string | null>(null);
  const [editDeptName, setEditDeptName] = useState('');
  const [newDesig, setNewDesig] = useState('');
  const [editDesigId, setEditDesigId] = useState<string | null>(null);
  const [editDesigName, setEditDesigName] = useState('');
  const [deleteReportId, setDeleteReportId] = useState<string | null>(null);

  const loadMasters = useCallback(async () => {
    const [deptRes, desigRes, profRes] = await Promise.all([
      getDepartments(), getDesignations(), isAdmin ? getProfiles() : Promise.resolve({ data: [] as Profile[], error: null }),
    ]);
    setDepartments(deptRes.data);
    setDesignations(desigRes.data);
    if (isAdmin) setProfiles(profRes.data);
  }, [isAdmin]);

  useEffect(() => { loadMasters(); }, [loadMasters]);

  useEffect(() => {
    if (profile && !employeeName) {
      setEmployeeName(profile.full_name || '');
      setDesignation(profile.designation || '');
    }
  }, [profile, employeeName]);

  const loadFormForDate = useCallback(async (date: string) => {
    if (!user?.id) return;
    setLoadingForm(true);
    const { data } = await getDailyTaskReportByDate(user.id, date);
    if (data) {
      setExistingReportId(data.id);
      setDepartmentId(data.department_id || '');
      setEmployeeName(data.employee_name);
      setDesignation(data.designation || '');
      setIssues(data.issues_requirements || '');
      setPlanTomorrow(data.plan_for_tomorrow || '');
      setDailyRows(
        data.daily_task_items?.length
          ? data.daily_task_items.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map(i => ({
              key: i.id || crypto.randomUUID(),
              task_type: i.task_type,
              work_description: i.work_description,
              status: i.status,
              remarks: i.remarks || '',
            }))
          : [emptyDailyRow()]
      );
      setPendingRows(
        data.pending_task_items?.length
          ? data.pending_task_items.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map(i => ({
              key: i.id || crypto.randomUUID(),
              task_type: i.task_type,
              work_description: i.work_description,
              status: i.status,
              expected_completion: i.expected_completion || '',
            }))
          : [emptyPendingRow()]
      );
    } else {
      setExistingReportId(undefined);
      setDailyRows([emptyDailyRow()]);
      setPendingRows([emptyPendingRow()]);
      setIssues('');
      setPlanTomorrow('');
      if (profile) {
        setEmployeeName(profile.full_name || '');
        setDesignation(profile.designation || '');
      }
    }
    setLoadingForm(false);
  }, [user?.id, profile]);

  useEffect(() => {
    if (activeTab === 'submit') loadFormForDate(reportDate);
  }, [activeTab, reportDate, loadFormForDate]);

  const dateRange = useMemo(
    () => getDateRange(period, anchorDate, customFrom, customTo),
    [period, anchorDate, customFrom, customTo]
  );

  const loadReports = useCallback(async () => {
    setLoadingReports(true);
    const { data, error } = await getDailyTaskReports({
      from: dateRange.from,
      to: dateRange.to,
      departmentId: filterDept || undefined,
      userId: filterUser || undefined,
    });
    if (error) toast.error(error.message);
    setReports(data);
    setLoadingReports(false);
  }, [dateRange.from, dateRange.to, filterDept, filterUser]);

  useEffect(() => {
    if (activeTab === 'reports') loadReports();
  }, [activeTab, loadReports]);

  const updateRow = (rows: TaskRow[], setRows: React.Dispatch<React.SetStateAction<TaskRow[]>>, key: string, field: keyof TaskRow, value: string) => {
    setRows(rows.map(r => r.key === key ? { ...r, [field]: value } : r));
  };

  const removeRow = (rows: TaskRow[], setRows: React.Dispatch<React.SetStateAction<TaskRow[]>>, key: string) => {
    if (rows.length <= 1) { toast.error('At least one row is required'); return; }
    setRows(rows.filter(r => r.key !== key));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) { toast.error('Not logged in'); return; }
    if (!departmentId) { toast.error('Please select a department'); return; }
    if (!employeeName.trim()) { toast.error('Employee name is required'); return; }
    const validDaily = dailyRows.filter(r => r.work_description.trim() || r.task_type.trim());
    const validPending = pendingRows.filter(r => r.work_description.trim() || r.task_type.trim());
    if (!validDaily.length && !validPending.length) {
      toast.error('Add at least one task or pending work item');
      return;
    }
    setSaving(true);
    const { error } = await saveDailyTaskReport({
      id: existingReportId,
      user_id: user.id,
      department_id: departmentId,
      employee_name: employeeName.trim(),
      designation: designation || null,
      report_date: reportDate,
      issues_requirements: issues || null,
      plan_for_tomorrow: planTomorrow || null,
      status: 'submitted',
      daily_items: validDaily.map(r => ({ task_type: r.task_type, work_description: r.work_description, status: r.status, remarks: r.remarks })),
      pending_items: validPending.map(r => ({ task_type: r.task_type, work_description: r.work_description, status: r.status, expected_completion: r.expected_completion || null })),
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Daily task report submitted successfully');
    loadFormForDate(reportDate);
  };

  const handleDeleteReport = async () => {
    if (!deleteReportId) return;
    const { error } = await deleteDailyTaskReport(deleteReportId);
    if (error) { toast.error(error.message); return; }
    toast.success('Report deleted');
    setDeleteReportId(null);
    loadReports();
  };

  const exportExcel = () => {
    const rows: Record<string, string | number>[] = [];
    for (const r of reports) {
      const dept = r.departments?.name || '';
      for (const item of r.daily_task_items || []) {
        rows.push({
          Date: r.report_date, Employee: r.employee_name, Department: dept,
          Designation: r.designation || '', Section: 'Daily Task', 'Task Type': item.task_type,
          Description: item.work_description, Status: item.status,
          Remarks: item.remarks || '', Issues: r.issues_requirements || '',
          'Plan For Tomorrow': r.plan_for_tomorrow || '',
        });
      }
      for (const item of r.pending_task_items || []) {
        rows.push({
          Date: r.report_date, Employee: r.employee_name, Department: dept,
          Designation: r.designation || '', Section: 'Pending/Ongoing', 'Task Type': item.task_type,
          Description: item.work_description, Status: item.status,
          'Exp. Completion': item.expected_completion || '', Issues: r.issues_requirements || '',
          'Plan For Tomorrow': r.plan_for_tomorrow || '',
        });
      }
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Daily Task Report');
    XLSX.writeFile(wb, `daily-task-report-${dateRange.from}-to-${dateRange.to}.xlsx`);
  };

  const handlePrint = () => window.print();

  const exportCsv = () => {
    const lines = ['Date,Employee,Department,Designation,Section,Task Type,Description,Status,Remarks/Expected Completion,Issues,Plan For Tomorrow'];
    for (const r of reports) {
      const dept = r.departments?.name || '';
      for (const item of r.daily_task_items || []) {
        lines.push([
          r.report_date, r.employee_name, dept, r.designation || '',
          'Daily Task', item.task_type, `"${item.work_description.replace(/"/g, '""')}"`,
          item.status, `"${(item.remarks || '').replace(/"/g, '""')}"`,
          `"${(r.issues_requirements || '').replace(/"/g, '""')}"`,
          `"${(r.plan_for_tomorrow || '').replace(/"/g, '""')}"`,
        ].join(','));
      }
      for (const item of r.pending_task_items || []) {
        lines.push([
          r.report_date, r.employee_name, dept, r.designation || '',
          'Pending/Ongoing', item.task_type, `"${item.work_description.replace(/"/g, '""')}"`,
          item.status, item.expected_completion || '',
          `"${(r.issues_requirements || '').replace(/"/g, '""')}"`,
          `"${(r.plan_for_tomorrow || '').replace(/"/g, '""')}"`,
        ].join(','));
      }
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-task-report-${dateRange.from}-to-${dateRange.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs: { key: TaskTab; label: string; path: string; icon: React.ReactNode }[] = [
    { key: 'submit', label: 'Submit Report', path: '/daily-tasks/submit', icon: <ClipboardList size={15} /> },
    { key: 'reports', label: 'Reports', path: '/daily-tasks/reports', icon: <FileText size={15} /> },
    { key: 'masters', label: 'Masters', path: '/daily-tasks/masters', icon: <Settings2 size={15} /> },
  ];

  const summaryStats = useMemo(() => {
    let dailyCount = 0, pendingCount = 0;
    for (const r of reports) {
      dailyCount += r.daily_task_items?.length || 0;
      pendingCount += r.pending_task_items?.length || 0;
    }
    return { reports: reports.length, dailyCount, pendingCount };
  }, [reports]);

  return (
    <MainLayout>
      <div className="space-y-4 print:space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Employee Daily Tasks</h1>
            <p className="text-sm text-muted-foreground">Submit daily reports, track pending work, and generate period reports</p>
          </div>
        </div>

        {/* Tab nav */}
        <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/30 p-1 print:hidden">
          {tabs.map(t => (
            <Link key={t.key} to={t.path}
              className={cn(
                'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                activeTab === t.key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}>
              {t.icon}{t.label}
            </Link>
          ))}
        </div>

        {/* ── SUBMIT TAB ── */}
        {activeTab === 'submit' && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
              <h2 className="mb-4 text-base font-semibold">Daily Task Report</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className={lbl}>Department *</label>
                  <select value={departmentId} onChange={e => setDepartmentId(e.target.value)} className={inp} required>
                    <option value="">Select department…</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Employee Name *</label>
                  <input value={employeeName} onChange={e => setEmployeeName(e.target.value)} className={inp} required />
                </div>
                <div>
                  <label className={lbl}>Designation</label>
                  <select value={designation} onChange={e => setDesignation(e.target.value)} className={inp}>
                    <option value="">Select designation…</option>
                    {designations.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Date *</label>
                  <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} className={inp} required />
                </div>
              </div>
            </div>

            {loadingForm ? (
              <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground animate-pulse">
                Loading report for {format(parseISO(reportDate), 'dd MMM yyyy')}…
              </div>
            ) : (
              <>
                {/* Daily tasks table */}
                <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Daily Tasks</h3>
                    <button type="button" onClick={() => setDailyRows(r => [...r, emptyDailyRow()])}
                      className="inline-flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90">
                      <Plus size={14} /> Add Row
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] border-collapse text-sm">
                      <thead>
                        <tr>
                          <th className={th}>Task Type</th>
                          <th className={th}>Work Description</th>
                          <th className={cn(th, 'w-36')}>Status</th>
                          <th className={cn(th, 'w-40')}>Remarks</th>
                          <th className={cn(th, 'w-12 text-center')}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailyRows.map(row => (
                          <tr key={row.key}>
                            <td className={td}>
                              <input value={row.task_type} onChange={e => updateRow(dailyRows, setDailyRows, row.key, 'task_type', e.target.value)}
                                className={inp} placeholder="Category / type" />
                            </td>
                            <td className={td}>
                              <textarea value={row.work_description} onChange={e => updateRow(dailyRows, setDailyRows, row.key, 'work_description', e.target.value)}
                                className={cn(inp, 'min-h-[38px] resize-y')} rows={1} placeholder="Describe work done" />
                            </td>
                            <td className={td}>
                              <select value={row.status} onChange={e => updateRow(dailyRows, setDailyRows, row.key, 'status', e.target.value)} className={inp}>
                                {TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </td>
                            <td className={td}>
                              <input value={row.remarks || ''} onChange={e => updateRow(dailyRows, setDailyRows, row.key, 'remarks', e.target.value)}
                                className={inp} placeholder="Remarks" />
                            </td>
                            <td className={cn(td, 'text-center')}>
                              <button type="button" onClick={() => removeRow(dailyRows, setDailyRows, row.key)}
                                className="rounded p-1 text-destructive hover:bg-destructive/10" title="Remove row">
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pending / ongoing */}
                <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Pending / Ongoing Work</h3>
                    <button type="button" onClick={() => setPendingRows(r => [...r, emptyPendingRow()])}
                      className="inline-flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90">
                      <Plus size={14} /> Add Row
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] border-collapse text-sm">
                      <thead>
                        <tr>
                          <th className={th}>Task Type</th>
                          <th className={th}>Work Description</th>
                          <th className={cn(th, 'w-36')}>Status</th>
                          <th className={cn(th, 'w-40')}>Expected Completion</th>
                          <th className={cn(th, 'w-12 text-center')}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingRows.map(row => (
                          <tr key={row.key}>
                            <td className={td}>
                              <input value={row.task_type} onChange={e => updateRow(pendingRows, setPendingRows, row.key, 'task_type', e.target.value)}
                                className={inp} placeholder="Category / type" />
                            </td>
                            <td className={td}>
                              <textarea value={row.work_description} onChange={e => updateRow(pendingRows, setPendingRows, row.key, 'work_description', e.target.value)}
                                className={cn(inp, 'min-h-[38px] resize-y')} rows={1} placeholder="Describe pending work" />
                            </td>
                            <td className={td}>
                              <select value={row.status} onChange={e => updateRow(pendingRows, setPendingRows, row.key, 'status', e.target.value)} className={inp}>
                                {PENDING_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </td>
                            <td className={td}>
                              <input type="date" value={row.expected_completion || ''} onChange={e => updateRow(pendingRows, setPendingRows, row.key, 'expected_completion', e.target.value)}
                                className={inp} />
                            </td>
                            <td className={cn(td, 'text-center')}>
                              <button type="button" onClick={() => removeRow(pendingRows, setPendingRows, row.key)}
                                className="rounded p-1 text-destructive hover:bg-destructive/10" title="Remove row">
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Notes */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
                    <label className={lbl}>Issues / Requirements</label>
                    <textarea value={issues} onChange={e => setIssues(e.target.value)} rows={4} className={inp}
                      placeholder="Report any blockers, issues, or resource requirements…" />
                  </div>
                  <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
                    <label className={lbl}>Plan For Tomorrow</label>
                    <textarea value={planTomorrow} onChange={e => setPlanTomorrow(e.target.value)} rows={4} className={inp}
                      placeholder="Outline planned tasks for the next working day…" />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button type="submit" disabled={saving}
                    className="inline-flex items-center gap-2 rounded bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
                    <Save size={16} /> {saving ? 'Submitting…' : existingReportId ? 'Update Report' : 'Submit Report'}
                  </button>
                  {existingReportId && (
                    <p className="flex items-center text-xs text-muted-foreground">
                      Editing existing report for {format(parseISO(reportDate), 'dd MMM yyyy')}
                    </p>
                  )}
                </div>
              </>
            )}
          </form>
        )}

        {/* ── REPORTS TAB ── */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-5 shadow-sm print:hidden">
              <h2 className="mb-4 text-base font-semibold">Generate Report</h2>
              <div className="flex flex-wrap gap-2 mb-4">
                {(['daily', 'weekly', 'monthly', 'yearly', 'custom'] as ReportPeriod[]).map(p => (
                  <button key={p} type="button" onClick={() => setPeriod(p)}
                    className={cn(
                      'rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                      period === p ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}>
                    {p === 'custom' ? 'Date Range' : p}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {period !== 'custom' ? (
                  <div>
                    <label className={lbl}>
                      {period === 'daily' ? 'Date' : period === 'weekly' ? 'Week containing' : period === 'monthly' ? 'Month' : 'Year'}
                    </label>
                    <input type="date" value={anchorDate} onChange={e => setAnchorDate(e.target.value)} className={inp} />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className={lbl}>From Date</label>
                      <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className={inp} />
                    </div>
                    <div>
                      <label className={lbl}>To Date</label>
                      <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className={inp} />
                    </div>
                  </>
                )}
                <div>
                  <label className={lbl}>Department</label>
                  <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className={inp}>
                    <option value="">All departments</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                {isAdmin && (
                  <div>
                    <label className={lbl}>Employee</label>
                    <select value={filterUser} onChange={e => setFilterUser(e.target.value)} className={inp}>
                      <option value="">All employees</option>
                      {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button type="button" onClick={loadReports}
                  className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
                  <Calendar size={15} /> Generate
                </button>
                <button type="button" onClick={exportCsv} disabled={!reports.length}
                  className="inline-flex items-center gap-2 rounded border border-border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50">
                  <Download size={15} /> Export CSV
                </button>
                <button type="button" onClick={exportExcel} disabled={!reports.length}
                  className="inline-flex items-center gap-2 rounded border border-border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50">
                  <FileSpreadsheet size={15} /> Export Excel
                </button>
                <button type="button" onClick={handlePrint} disabled={!reports.length}
                  className="inline-flex items-center gap-2 rounded border border-border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50">
                  <Printer size={15} /> Print
                </button>
                <span className="text-xs text-muted-foreground">
                  Period: {format(parseISO(dateRange.from), 'dd MMM yyyy')} — {format(parseISO(dateRange.to), 'dd MMM yyyy')}
                </span>
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3 print:hidden">
              {[
                { label: 'Reports', value: summaryStats.reports },
                { label: 'Tasks Completed', value: summaryStats.dailyCount },
                { label: 'Pending Works', value: summaryStats.pendingCount },
              ].map(s => (
                <div key={s.label} className="rounded-lg border border-border bg-card p-4 text-center shadow-sm">
                  <p className="text-2xl font-bold text-primary">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Report list */}
            {loadingReports ? (
              <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground animate-pulse">Loading reports…</div>
            ) : reports.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
                No reports found for the selected period.
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map(r => {
                  const open = expandedId === r.id;
                  return (
                    <div key={r.id} className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
                      <button type="button" onClick={() => setExpandedId(open ? null : r.id)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors print:pointer-events-none">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span className="font-semibold text-sm">{r.employee_name}</span>
                          <span className="text-xs text-muted-foreground">{r.departments?.name || '—'}</span>
                          <span className="text-xs text-muted-foreground">{r.designation || '—'}</span>
                          <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            <Calendar size={11} /> {format(parseISO(r.report_date), 'dd MMM yyyy')}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs text-muted-foreground">
                            {(r.daily_task_items?.length || 0)} tasks · {(r.pending_task_items?.length || 0)} pending
                          </span>
                          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} className="print:hidden" />}
                        </div>
                      </button>
                      {(open) && (
                        <div className="border-t border-border px-4 py-4 space-y-4">
                          {(r.daily_task_items?.length ?? 0) > 0 && (
                            <div>
                              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Daily Tasks</p>
                              <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-sm">
                                  <thead><tr>
                                    <th className={th}>Type</th><th className={th}>Description</th>
                                    <th className={th}>Status</th><th className={th}>Remarks</th>
                                  </tr></thead>
                                  <tbody>
                                    {r.daily_task_items!.map(item => (
                                      <tr key={item.id}>
                                        <td className={td}>{item.task_type || '—'}</td>
                                        <td className={td}>{item.work_description}</td>
                                        <td className={td}><span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-800 dark:bg-green-900/30 dark:text-green-300">{item.status}</span></td>
                                        <td className={td}>{item.remarks || '—'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                          {(r.pending_task_items?.length ?? 0) > 0 && (
                            <div>
                              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pending / Ongoing</p>
                              <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-sm">
                                  <thead><tr>
                                    <th className={th}>Type</th><th className={th}>Description</th>
                                    <th className={th}>Status</th><th className={th}>Expected Completion</th>
                                  </tr></thead>
                                  <tbody>
                                    {r.pending_task_items!.map(item => (
                                      <tr key={item.id}>
                                        <td className={td}>{item.task_type || '—'}</td>
                                        <td className={td}>{item.work_description}</td>
                                        <td className={td}><span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">{item.status}</span></td>
                                        <td className={td}>{item.expected_completion ? format(parseISO(item.expected_completion), 'dd MMM yyyy') : '—'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                          {(r.issues_requirements || r.plan_for_tomorrow) && (
                            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                              {r.issues_requirements && (
                                <div className="rounded border border-border bg-muted/20 p-3">
                                  <p className="mb-1 text-xs font-semibold text-muted-foreground">Issues / Requirements</p>
                                  <p className="text-sm whitespace-pre-wrap">{r.issues_requirements}</p>
                                </div>
                              )}
                              {r.plan_for_tomorrow && (
                                <div className="rounded border border-border bg-muted/20 p-3">
                                  <p className="mb-1 text-xs font-semibold text-muted-foreground">Plan For Tomorrow</p>
                                  <p className="text-sm whitespace-pre-wrap">{r.plan_for_tomorrow}</p>
                                </div>
                              )}
                            </div>
                          )}
                          {(isAdmin || r.user_id === user?.id) && (
                            <div className="flex justify-end print:hidden">
                              <button type="button" onClick={() => setDeleteReportId(r.id)}
                                className="inline-flex items-center gap-1 rounded px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10">
                                <Trash2 size={13} /> Delete Report
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="flex items-start justify-between border-t border-border px-4 py-4 print:py-6">
                        <div className="text-center">
                          <p className="text-gray-400">_______________</p>
                          <p className="mt-1 text-sm font-medium text-foreground">Employee Signature</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-400">_______________</p>
                          <p className="mt-1 text-sm font-medium text-foreground">Verified Authority Signature</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── MASTERS TAB ── */}
        {activeTab === 'masters' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Departments */}
            <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
              <h2 className="mb-4 text-base font-semibold">Departments</h2>
              <div className="mb-4 flex gap-2">
                <input value={newDept} onChange={e => setNewDept(e.target.value)} className={inp} placeholder="New department name" />
                <button type="button" disabled={!newDept.trim()} onClick={async () => {
                  const { error } = await upsertDepartment({ name: newDept.trim() });
                  if (error) { toast.error(error.message); return; }
                  toast.success('Department added'); setNewDept(''); loadMasters();
                }} className="shrink-0 rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                  <Plus size={16} />
                </button>
              </div>
              <div className="divide-y divide-border rounded border border-border">
                {departments.map(d => (
                  <div key={d.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
                    {editDeptId === d.id ? (
                      <>
                        <input value={editDeptName} onChange={e => setEditDeptName(e.target.value)} className={inp} />
                        <div className="flex gap-1 shrink-0">
                          <button type="button" onClick={async () => {
                            const { error } = await upsertDepartment({ id: d.id, name: editDeptName.trim() });
                            if (error) { toast.error(error.message); return; }
                            toast.success('Updated'); setEditDeptId(null); loadMasters();
                          }} className="rounded p-1.5 text-primary hover:bg-primary/10"><Save size={15} /></button>
                          <button type="button" onClick={() => setEditDeptId(null)} className="rounded p-1.5 text-muted-foreground hover:bg-muted">✕</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="text-sm">{d.name}</span>
                        {isAdmin && (
                          <div className="flex gap-1">
                            <button type="button" onClick={() => { setEditDeptId(d.id); setEditDeptName(d.name); }}
                              className="rounded p-1.5 text-muted-foreground hover:bg-muted"><Pencil size={14} /></button>
                            <button type="button" onClick={async () => {
                              const { error } = await deleteDepartment(d.id);
                              if (error) { toast.error(error.message); return; }
                              toast.success('Department removed'); loadMasters();
                            }} className="rounded p-1.5 text-destructive hover:bg-destructive/10"><Trash2 size={14} /></button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
                {!departments.length && <p className="px-3 py-4 text-sm text-muted-foreground">No departments yet.</p>}
              </div>
            </div>

            {/* Designations */}
            <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
              <h2 className="mb-4 text-base font-semibold">Designations</h2>
              <div className="mb-4 flex gap-2">
                <input value={newDesig} onChange={e => setNewDesig(e.target.value)} className={inp} placeholder="New designation name" />
                <button type="button" disabled={!newDesig.trim()} onClick={async () => {
                  const { error } = await upsertDesignation({ name: newDesig.trim() });
                  if (error) { toast.error(error.message); return; }
                  toast.success('Designation added'); setNewDesig(''); loadMasters();
                }} className="shrink-0 rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                  <Plus size={16} />
                </button>
              </div>
              <div className="divide-y divide-border rounded border border-border">
                {designations.map(d => (
                  <div key={d.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
                    {editDesigId === d.id ? (
                      <>
                        <input value={editDesigName} onChange={e => setEditDesigName(e.target.value)} className={inp} />
                        <div className="flex gap-1 shrink-0">
                          <button type="button" onClick={async () => {
                            const { error } = await upsertDesignation({ id: d.id, name: editDesigName.trim() });
                            if (error) { toast.error(error.message); return; }
                            toast.success('Updated'); setEditDesigId(null); loadMasters();
                          }} className="rounded p-1.5 text-primary hover:bg-primary/10"><Save size={15} /></button>
                          <button type="button" onClick={() => setEditDesigId(null)} className="rounded p-1.5 text-muted-foreground hover:bg-muted">✕</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="text-sm">{d.name}</span>
                        {isAdmin && (
                          <div className="flex gap-1">
                            <button type="button" onClick={() => { setEditDesigId(d.id); setEditDesigName(d.name); }}
                              className="rounded p-1.5 text-muted-foreground hover:bg-muted"><Pencil size={14} /></button>
                            <button type="button" onClick={async () => {
                              const { error } = await deleteDesignation(d.id);
                              if (error) { toast.error(error.message); return; }
                              toast.success('Designation removed'); loadMasters();
                            }} className="rounded p-1.5 text-destructive hover:bg-destructive/10"><Trash2 size={14} /></button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
                {!designations.length && <p className="px-3 py-4 text-sm text-muted-foreground">No designations yet.</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteReportId} onOpenChange={open => !open && setDeleteReportId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this report?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. All task entries in this report will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteReport} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

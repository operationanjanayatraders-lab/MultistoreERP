import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  Search, Printer, ChevronDown, X, Filter,
  Package, AlertTriangle, TrendingUp, TrendingDown, Layers, Eye,
  ArrowUpDown, ArrowUp, ArrowDown, Warehouse as WarehouseIcon,
  Tag, FileSpreadsheet, Loader2, AlertCircle,
  CheckCircle, BarChart3, CalendarDays, ArrowLeftRight,
  Upload, FileDown, FileText
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MainLayout } from '@/components/layouts/MainLayout';
import {
  getInventoryItems, getInventorySummaryCards, getInventoryStockDetail,
  getBrands, getWarehouses, getBranches, upsertInventoryStock, getProducts
} from '@/lib/api';
import type { StockSummary, InventorySummaryCards, Warehouse, Branch } from '@/types/types';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';

const inp = 'w-full rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 placeholder:text-gray-600 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring';
const lbl = 'mb-1 block text-xs font-medium text-muted-foreground';

// ── KPI Card ─────────────────────────────────────────────
const KpiCard: React.FC<{
  title: string; value: string; icon: React.ReactNode; color?: string;
}> = ({ title, value, icon, color }) => (
  <div className="rounded-lg border border-border bg-card p-4 shadow-card hover:shadow-hover transition-shadow">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <p className={`text-xl font-bold mt-1 tabular-nums ${color || 'text-foreground'}`}>{value}</p>
      </div>
      <div className={`rounded-lg p-2.5 ${color ? `bg-${color.replace('text-', '')}/10` : 'bg-primary/10'}`}>
        <span className={color || 'text-primary'}>{icon}</span>
      </div>
    </div>
  </div>
);

// ── Filter Dropdown ──────────────────────────────────────
const FilterDropdown: React.FC<{
  label: string; value: string; options: { value: string; label: string }[];
  onChange: (v: string) => void; icon?: React.ReactNode;
}> = ({ label, value, options, onChange, icon }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find(o => o.value === value);
  return (
    <div ref={ref} className="relative min-w-[150px]">
      <label className={lbl}>{label}</label>
      <button type="button" onClick={() => { setOpen(!open); setSearch(''); }}
        className={`${inp} flex items-center gap-2 w-full text-left`}>
        {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
        <span className="flex-1 truncate">{selected?.label || 'All'}</span>
        <ChevronDown size={13} className="text-muted-foreground shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[200px] rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
          <div className="p-1 border-b border-border">
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
              className="w-full rounded border-0 bg-transparent px-2 py-1.5 text-xs outline-none focus:ring-0 !text-gray-900" placeholder="Search..." />
          </div>
          <div className="max-h-52 overflow-y-auto p-1">
            {filtered.map(opt => (
              <button key={opt.value} type="button" onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full text-left rounded px-2 py-1.5 text-xs transition-colors ${
                  value === opt.value ? 'bg-accent font-medium text-accent-foreground' : 'text-popover-foreground hover:bg-accent'
                }`}>{opt.label}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Stock Badge ──────────────────────────────────────────
const StockBadge: React.FC<{ qty: number; reorder: number }> = ({ qty, reorder }) => {
  if (qty < 0) return <Badge variant="destructive" className="text-[10px] whitespace-nowrap">Negative</Badge>;
  if (qty === 0) return <Badge className="text-[10px] whitespace-nowrap bg-orange-600 text-white">Out of Stock</Badge>;
  if (qty <= reorder) return <Badge variant="secondary" className="text-[10px] whitespace-nowrap bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Low Stock</Badge>;
  return <Badge className="text-[10px] whitespace-nowrap bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">In Stock</Badge>;
};

const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'decimal', maximumFractionDigits: 2 }).format(n);
const fmtCurrency = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

// ── Main Page ────────────────────────────────────────────
export const InventoryPage: React.FC = () => {
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];
  const monthStart = new Date(); monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().split('T')[0];

  // ── Filters ──────────────────────────────────────────
  const [fromDate, setFromDate] = useState(monthStartStr);
  const [toDate, setToDate] = useState(today);
  const [branchId, setBranchId] = useState('all');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [warehouseId, setWarehouseId] = useState('all');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [brand, setBrand] = useState('all');
  const [brands, setBrands] = useState<string[]>([]);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // ── Data ─────────────────────────────────────────────
  const [items, setItems] = useState<StockSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [cards, setCards] = useState<InventorySummaryCards | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // ── Detail Modal ─────────────────────────────────────
  const [detailItem, setDetailItem] = useState<StockSummary | null>(null);
  const [warehouseDetail, setWarehouseDetail] = useState<{ warehouse_name: string; quantity: number }[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // ── Import Modal ─────────────────────────────────────
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [allProducts, setAllProducts] = useState<{ sku: string; barcode: string | null; id: string }[]>([]);
  const [allWarehouses, setAllWarehouses] = useState<{ name: string; id: string }[]>([]);

  // ── Date Quick Buttons ───────────────────────────────
  const setDatePreset = useCallback((preset: string) => {
    const now = new Date();
    let from = new Date();
    switch (preset) {
      case 'daily': break;
      case 'weekly': from.setDate(now.getDate() - now.getDay()); break;
      case 'monthly': from.setDate(1); break;
      case 'yearly': from = new Date(now.getFullYear(), 3, 1); break;
    }
    setFromDate(from.toISOString().split('T')[0]);
    setToDate(now.toISOString().split('T')[0]);
  }, []);

  // ── Load Warehouses & Brands & Products ─────────────
  useEffect(() => {
    getWarehouses().then(r => { setWarehouses(r.data); setAllWarehouses(r.data.map(w => ({ name: w.name, id: w.id }))); });
    getBrands().then(r => setBrands(r));
    getBranches().then(r => setBranches(r.data));
    getProducts(1, 10000).then(r => setAllProducts(r.data.map(p => ({ sku: p.sku, barcode: p.barcode, id: p.id }))));
  }, []);

  // ── Load Data ──────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    const opts = { page, pageSize, search, fromDate: fromDate || undefined, toDate: toDate || undefined, warehouseId, branchId, brand, status, sortBy, sortDir };
    const [itemsRes, cardsRes] = await Promise.all([
      getInventoryItems(opts),
      getInventorySummaryCards(fromDate, toDate, warehouseId, branchId, brand, status),
    ]);
    setItems(itemsRes.data);
    setTotal(itemsRes.total);
    setCards(cardsRes.data);
    setLoading(false);
  }, [page, pageSize, search, fromDate, toDate, warehouseId, branchId, brand, status, sortBy, sortDir]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, warehouseId, branchId, brand, status, fromDate, toDate]);

  // ── Sort ──────────────────────────────────────────────
  const handleSort = (col: string) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };
  const SortIcon: React.FC<{ col: string }> = ({ col }) => {
    if (sortBy !== col) return <ArrowUpDown size={12} className="text-muted-foreground/40" />;
    return sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  };

  // ── Detail ───────────────────────────────────────────
  const openDetail = async (item: StockSummary) => {
    setDetailItem(item);
    setDetailLoading(true);
    const whData = await getInventoryStockDetail(item.product_id);
    setWarehouseDetail(whData);
    setDetailLoading(false);
  };

  // ── Export CSV ───────────────────────────────────────
  const exportCSV = () => {
    try {
      const headers = ['Item Code', 'Barcode', 'Item Description', 'Brand', 'Opening Qty', 'Unit Price', 'Box Std', 'Box Qty', 'Pkt Std', 'Pkt Qty', 'Loose/Cut Qty', 'Inwards', 'Outwards', 'Closing Stock', 'Stock Value'];
      const rows = items.map(i => [i.sku, i.barcode || '', i.name, i.brand || '', i.opening_qty, i.purchase_price, i.box_std, i.box_qty, i.pkt_std, i.pkt_qty, i.loose_cut_qty, i.inwards, i.outwards, i.closing_stock, i.stock_value.toFixed(2)]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `inventory_${today}.csv`;
      a.click(); URL.revokeObjectURL(url);
      toast.success('Inventory exported to CSV');
    } catch { toast.error('Export failed'); }
  };

  // ── Export Excel ──────────────────────────────────────
  const exportExcel = () => {
    try {
      const rows = items.map(i => ({
        'Item Code': i.sku,
        'Barcode': i.barcode || '',
        'Item Description': i.name,
        'Brand': i.brand || '',
        'Opening Qty': i.opening_qty,
        'Unit Price': i.purchase_price,
        'Box Std': i.box_std,
        'Box Qty': i.box_qty,
        'Pkt Std': i.pkt_std,
        'Pkt Qty': i.pkt_qty,
        'Loose/Cut Qty': i.loose_cut_qty,
        'Inwards': i.inwards,
        'Outwards': i.outwards,
        'Closing Stock': i.closing_stock,
        'Stock Value': i.stock_value,
        'Status': i.closing_stock <= 0 ? 'Negative' : i.closing_stock === 0 ? 'Out of Stock' : i.closing_stock <= i.reorder_level ? 'Low Stock' : 'In Stock',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
      XLSX.writeFile(wb, `inventory_${today}.xlsx`);
      toast.success('Inventory exported to Excel');
    } catch { toast.error('Excel export failed'); }
  };

  // ── Export PDF ────────────────────────────────────────
  const exportPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      doc.setFontSize(16);
      doc.text('Inventory Report', 14, 15);
      doc.setFontSize(9);
      doc.text(`Date: ${today}`, 14, 22);
      const tableColumns = ['Item Code', 'Barcode', 'Item Description', 'Brand', 'Opening Qty', 'Unit Price', 'Box Std', 'Box Qty', 'Pkt Std', 'Pkt Qty', 'Loose/Cut', 'Inwards', 'Outwards', 'Closing Stock', 'Stock Value'];
      const tableRows = items.map(i => [
        i.sku, i.barcode || '', i.name, i.brand || '',
        i.opening_qty, i.purchase_price, i.box_std, i.box_qty,
        i.pkt_std, i.pkt_qty, i.loose_cut_qty,
        i.inwards, i.outwards, i.closing_stock, i.stock_value.toFixed(2),
      ]);
      autoTable(doc, {
        head: [tableColumns],
        body: tableRows,
        startY: 28,
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [59, 130, 246], fontSize: 7, halign: 'center' },
        columnStyles: { 2: { cellWidth: 35 } },
        didDrawPage: (data) => {
          doc.setFontSize(7);
          doc.text(`Page ${data.pageNumber}`, doc.internal.pageSize.getWidth() - 14, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
        },
      });
      doc.save(`inventory_${today}.pdf`);
      toast.success('Inventory exported to PDF');
    } catch { toast.error('PDF export failed'); }
  };

  // ── Import Excel ──────────────────────────────────────
  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setImportFile(file);
  };

  const processImport = async () => {
    if (!importFile) { toast.error('Please select a file'); return; }
    setImporting(true);
    setImportResults(null);
    try {
      const data = await importFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet);

      const prodMap = new Map<string, string>();
      const barcodeMap = new Map<string, string>();
      for (const p of allProducts) {
        prodMap.set(p.sku.toLowerCase(), p.id);
        if (p.barcode) barcodeMap.set(p.barcode.toLowerCase(), p.id);
      }
      const whMap = new Map<string, string>();
      for (const w of allWarehouses) whMap.set(w.name.toLowerCase(), w.id);

      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (let idx = 0; idx < json.length; idx++) {
        const row = json[idx];
        const rowNum = idx + 2;
        const sku = (row['Item Code'] || row['SKU'] || row['sku'] || '').toString().trim();
        const barcode = (row['Barcode'] || row['barcode'] || '').toString().trim();
        const warehouseName = (row['Warehouse'] || row['warehouse'] || '').toString().trim();
        const qtyStr = (row['Quantity'] || row['quantity'] || row['Qty'] || row['qty'] || row['Closing Stock'] || '0').toString().trim();
        const quantity = parseFloat(qtyStr);

        if (!sku && !barcode) { failed++; errors.push(`Row ${rowNum}: Missing Item Code / Barcode`); continue; }
        if (isNaN(quantity)) { failed++; errors.push(`Row ${rowNum}: Invalid quantity "${qtyStr}"`); continue; }

        let productId = sku ? prodMap.get(sku.toLowerCase()) : null;
        if (!productId) productId = barcode ? barcodeMap.get(barcode.toLowerCase()) : null;
        if (!productId) { failed++; errors.push(`Row ${rowNum}: Product not found (SKU: ${sku}, Barcode: ${barcode})`); continue; }

        let warehouseId: string | null = null;
        if (warehouseName) {
          warehouseId = whMap.get(warehouseName.toLowerCase()) || null;
          if (!warehouseId) { failed++; errors.push(`Row ${rowNum}: Warehouse "${warehouseName}" not found`); continue; }
        }
        if (!warehouseId && allWarehouses.length === 1) warehouseId = allWarehouses[0].id;
        if (!warehouseId) { failed++; errors.push(`Row ${rowNum}: No warehouse specified and multiple exist`); continue; }

        const { error } = await upsertInventoryStock(productId, warehouseId, quantity, user?.id);
        if (error) { failed++; errors.push(`Row ${rowNum}: ${error.message}`); continue; }
        success++;
      }

      setImportResults({ success, failed, errors });
      if (failed === 0) {
        toast.success(`Imported ${success} item(s) successfully`);
        setImportOpen(false);
        setImportFile(null);
        load();
      } else {
        toast.error(`Imported ${success} item(s), ${failed} failed`);
      }
    } catch (err) {
      toast.error('Failed to process file');
      setImportResults({ success: 0, failed: 1, errors: [(err as Error).message] });
    } finally {
      setImporting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const branchOptions = useMemo(() => [{ value: 'all', label: 'All Branches' }, ...branches.map(b => ({ value: b.id, label: b.name }))], [branches]);
  const warehouseOptions = useMemo(() => [{ value: 'all', label: 'All Warehouses' }, ...warehouses.map(w => ({ value: w.id, label: w.name }))], [warehouses]);
  const brandOptions = useMemo(() => [{ value: 'all', label: 'All Brands' }, ...brands.map(b => ({ value: b, label: b }))], [brands]);

  return (
    <MainLayout>
      <div className="flex flex-col gap-4 p-4 md:p-6">
        {/* ═══════ HEADER ═══════ */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <Package size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Inventory Management</h1>
              <p className="text-sm text-muted-foreground">Consolidated stock across all branches &middot; {total} items</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} className="gap-1.5">
              <Upload size={14} /> Import
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
              <FileSpreadsheet size={14} /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={exportExcel} className="gap-1.5">
              <FileDown size={14} /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={exportPDF} className="gap-1.5">
              <FileText size={14} /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
              <Printer size={14} /> Print
            </Button>
          </div>
        </div>

        {/* ═══════ KPI CARDS ═══════ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard title="Total Inventory Value" value={cards ? `₹ ${fmt(cards.total_value)}` : '...'} icon={<BarChart3 size={18} />} color="text-primary" />
          <KpiCard title="Total Stock Qty" value={cards ? fmt(cards.total_qty) + ' Units' : '...'} icon={<Package size={18} />} color="text-sky-600" />
          <KpiCard title="Total Items" value={cards ? fmt(cards.total_items) : '...'} icon={<Layers size={18} />} color="text-foreground" />
          <KpiCard title="Low Stock Items" value={cards ? fmt(cards.low_stock) : '...'} icon={<AlertTriangle size={18} />} color="text-yellow-600" />
          <KpiCard title="Out of Stock" value={cards ? fmt(cards.out_of_stock) : '...'} icon={<X size={18} />} color="text-red-600" />
          <KpiCard title="Negative Stock" value={cards ? fmt(cards.negative_stock) : '...'} icon={<TrendingDown size={18} />} color="text-red-600" />
        </div>

        {/* ═══════ FILTERS SECTION ═══════ */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          {/* Row 1: Date Range */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
              {[
                { key: 'daily', label: 'Daily' },
                { key: 'weekly', label: 'Weekly' },
                { key: 'monthly', label: 'Monthly' },
                { key: 'yearly', label: 'Yearly' },
              ].map(btn => (
                <button key={btn.key} type="button" onClick={() => setDatePreset(btn.key)}
                  className="px-3 py-1.5 text-xs font-medium rounded transition-colors hover:bg-accent hover:text-accent-foreground">
                  {btn.label}
                </button>
              ))}
            </div>
            <div>
              <label className={lbl}>From Date</label>
              <Input type="date" className={`${inp} w-[150px]`} value={fromDate} onChange={e => setFromDate(e.target.value)} />
            </div>
            <div>
              <label className={lbl}>To Date</label>
              <Input type="date" className={`${inp} w-[150px]`} value={toDate} onChange={e => setToDate(e.target.value)} />
            </div>
            <div className="flex items-end gap-1">
              <label className="block invisible text-xs">&nbsp;</label>
              <Button variant="default" size="sm" onClick={() => { setPage(1); load(); }} className="gap-1">
                <Filter size={13} /> Apply
              </Button>
            </div>
          </div>

          {/* Row 2: Other Filters */}
          <div className="flex flex-wrap items-end gap-3">
            <FilterDropdown label="Branch" value={branchId} options={branchOptions} onChange={setBranchId} icon={<Layers size={13} />} />
            <FilterDropdown label="Warehouse" value={warehouseId} options={warehouseOptions} onChange={setWarehouseId} icon={<WarehouseIcon size={13} />} />
            <FilterDropdown label="Brand" value={brand} options={brandOptions} onChange={setBrand} icon={<Tag size={13} />} />
            <FilterDropdown label="Stock Status" value={status}
              options={[
                { value: 'all', label: 'All Items' },
                { value: 'instock', label: 'In Stock' },
                { value: 'lowstock', label: 'Low Stock' },
                { value: 'outofstock', label: 'Out of Stock' },
                { value: 'negativestock', label: 'Negative Stock' },
                { value: 'nonmoving', label: 'Non Moving' },
              ]} onChange={setStatus} icon={<Filter size={13} />} />
            <div className="flex-1 min-w-[200px]">
              <label className={lbl}>Search</label>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input className={`${inp} pl-8 pr-8`} placeholder="Item code, barcode, description, brand..."
                  value={searchInput} onChange={e => setSearchInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1); } }} />
                {search && <button onClick={() => { setSearch(''); setSearchInput(''); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={13} /></button>}
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setSearch(searchInput)} className="gap-1">
              <Search size={13} /> Search
            </Button>
          </div>
        </div>

        {/* ═══════ INVENTORY TABLE ═══════ */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {[
                    { key: 'sku', label: 'Item Code', w: 'w-[90px]' },
                    { key: 'barcode', label: 'Barcode', w: 'w-[90px]' },
                    { key: 'name', label: 'Item Description', w: 'min-w-[160px]' },
                    { key: 'opening_qty', label: 'Opening Qty', w: 'w-[70px]' },
                    { key: 'purchase_price', label: 'Unit Price', w: 'w-[75px]' },
                    { key: 'box_std', label: 'Box Std', w: 'w-[60px]' },
                    { key: 'box_qty', label: 'Box Qty', w: 'w-[60px]' },
                    { key: 'pkt_std', label: 'Pkt Std', w: 'w-[55px]' },
                    { key: 'pkt_qty', label: 'Pkt Qty', w: 'w-[55px]' },
                    { key: 'loose_cut_qty', label: 'Loose/Cut Qty', w: 'w-[75px]' },
                    { key: 'inwards', label: 'Inwards', w: 'w-[60px]' },
                    { key: 'outwards', label: 'Outwards', w: 'w-[60px]' },
                    { key: 'closing_stock', label: 'Closing Stock', w: 'w-[80px]' },
                    { key: 'stock_value', label: 'Stock Value', w: 'w-[90px]' },
                    { key: '', label: 'Status', w: 'w-[70px]' },
                    { key: '', label: '', w: 'w-[30px]' },
                  ].map(col => (
                    <th key={col.key || col.label}
                      className={`whitespace-nowrap px-2 py-2.5 text-left font-medium text-muted-foreground ${col.w} ${col.key ? 'cursor-pointer hover:text-foreground select-none' : ''}`}
                      onClick={() => col.key && handleSort(col.key)}>
                      <div className="flex items-center gap-1">
                        <span>{col.label}</span>
                        {col.key && <SortIcon col={col.key} />}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      {[...Array(16)].map((_, j) => (
                        <td key={j} className="px-2 py-2"><div className="h-4 w-full animate-pulse rounded bg-muted" /></td>
                      ))}
                    </tr>
                  ))
                ) : items.length === 0 ? (
                  <tr><td colSpan={16} className="px-4 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Package size={32} className="text-muted-foreground/30" />
                      <p className="text-sm">No inventory items found matching filters</p>
                    </div>
                  </td></tr>
                ) : items.map(item => (
                  <tr key={item.product_id}
                    className={`border-b border-border erp-table-row transition-colors ${
                      item.closing_stock <= 0 ? 'bg-red-50 dark:bg-red-950/20' :
                      item.closing_stock <= item.reorder_level ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''
                    }`}>
                    <td className="whitespace-nowrap px-2 py-2 font-mono text-primary font-medium">{item.sku}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-muted-foreground">{item.barcode || '—'}</td>
                    <td className="whitespace-nowrap px-2 py-2 font-medium max-w-[200px] truncate" title={item.name}>{item.name}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{fmt(item.opening_qty)}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums text-muted-foreground">{fmtCurrency(item.purchase_price)}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{item.box_std || 0}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{item.box_qty || 0}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{item.pkt_std || 0}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{item.pkt_qty || 0}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{item.loose_cut_qty || 0}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums text-green-600">{item.inwards > 0 ? fmt(item.inwards) : '—'}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums text-red-600">{item.outwards > 0 ? fmt(item.outwards) : '—'}</td>
                    <td className={`whitespace-nowrap px-2 py-2 text-right tabular-nums font-semibold ${
                      item.closing_stock <= 0 ? 'text-destructive' :
                      item.closing_stock <= item.reorder_level ? 'text-yellow-600' : 'text-foreground'
                    }`}>{fmt(item.closing_stock)}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums font-medium">{fmtCurrency(item.stock_value)}</td>
                    <td className="whitespace-nowrap px-2 py-2">
                      <StockBadge qty={item.closing_stock} reorder={item.reorder_level} />
                    </td>
                    <td className="whitespace-nowrap px-2 py-2">
                      <button onClick={() => openDetail(item)}
                        className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground" title="View stock detail">
                        <Eye size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <span className="text-xs text-muted-foreground">Page {page} of {totalPages} &middot; {total} items</span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                <div className="flex items-center gap-1 px-2">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                    const pg = start + i;
                    if (pg > totalPages) return null;
                    return (
                      <button key={pg} onClick={() => setPage(pg)}
                        className={`w-7 h-7 rounded text-xs font-medium transition-colors ${pg === page ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}>{pg}</button>
                    );
                  })}
                </div>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════ STOCK DETAIL MODAL ═══════ */}
      <Dialog open={!!detailItem} onOpenChange={o => !o && setDetailItem(null)}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package size={16} className="text-primary" />
              Stock Detail: {detailItem?.name}
              <Badge variant="outline" className="text-[10px] font-mono ml-2">{detailItem?.sku}</Badge>
            </DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-muted-foreground" /></div>
          ) : detailItem ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg border border-border bg-muted/20 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">Closing Stock</p>
                  <p className={`text-lg font-bold tabular-nums ${detailItem.closing_stock <= 0 ? 'text-destructive' : detailItem.closing_stock <= detailItem.reorder_level ? 'text-yellow-600' : 'text-foreground'}`}>
                    {fmt(detailItem.closing_stock)}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">Stock Value</p>
                  <p className="text-lg font-bold tabular-nums text-primary">{fmtCurrency(detailItem.stock_value)}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">Unit Price</p>
                  <p className="text-lg font-bold tabular-nums">{fmtCurrency(detailItem.purchase_price)}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">Reorder Level</p>
                  <p className="text-lg font-bold tabular-nums">{fmt(detailItem.reorder_level)}</p>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <WarehouseIcon size={12} /> Stock by Warehouse
                </h3>
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Warehouse</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Available Qty</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">% Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {warehouseDetail.map(w => (
                        <tr key={w.warehouse_id} className="border-b border-border last:border-0">
                          <td className="px-3 py-2 font-medium">{w.warehouse_name}</td>
                          <td className={`px-3 py-2 text-right tabular-nums font-semibold ${w.quantity <= 0 ? 'text-destructive' : 'text-foreground'}`}>{fmt(w.quantity)}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                            {detailItem.closing_stock > 0 ? ((w.quantity / detailItem.closing_stock) * 100).toFixed(1) + '%' : '—'}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-muted/30 font-medium">
                        <td className="px-3 py-2">Total</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmt(warehouseDetail.reduce((s, w) => s + w.quantity, 0))}</td>
                        <td className="px-3 py-2 text-right tabular-nums">100%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <TrendingUp size={12} /> Stock Movement
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="rounded border border-border p-2.5">
                    <p className="text-[10px] text-green-600">Inwards (Purchase)</p>
                    <p className="text-sm font-semibold tabular-nums">{fmt(detailItem.inwards)}</p>
                  </div>
                  <div className="rounded border border-border p-2.5">
                    <p className="text-[10px] text-red-600">Outwards (Sales)</p>
                    <p className="text-sm font-semibold tabular-nums">{fmt(detailItem.outwards)}</p>
                  </div>
                  <div className="rounded border border-border p-2.5">
                    <p className="text-[10px] text-blue-600">Transfer In</p>
                    <p className="text-sm font-semibold tabular-nums">{fmt(detailItem.transfer_in)}</p>
                  </div>
                  <div className="rounded border border-border p-2.5">
                    <p className="text-[10px] text-orange-600">Transfer Out</p>
                    <p className="text-sm font-semibold tabular-nums">{fmt(detailItem.transfer_out)}</p>
                  </div>
                  <div className="rounded border border-border p-2.5">
                    <p className="text-[10px] text-blue-600">Sales Return</p>
                    <p className="text-sm font-semibold tabular-nums">{fmt(detailItem.sales_return)}</p>
                  </div>
                  <div className="rounded border border-border p-2.5">
                    <p className="text-[10px] text-orange-600">Purchase Return</p>
                    <p className="text-sm font-semibold tabular-nums">{fmt(detailItem.purchase_return)}</p>
                  </div>
                  <div className="rounded border border-border p-2.5">
                    <p className="text-[10px] text-red-600">Damage</p>
                    <p className="text-sm font-semibold tabular-nums">{fmt(detailItem.damage)}</p>
                  </div>
                  <div className="rounded border border-border p-2.5">
                    <p className="text-[10px] text-muted-foreground">Adjustment</p>
                    <p className="text-sm font-semibold tabular-nums">{fmt(detailItem.adjustment)}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ═══════ IMPORT EXCEL DIALOG ═══════ */}
      <Dialog open={importOpen} onOpenChange={o => { if (!o) { setImportOpen(false); setImportFile(null); setImportResults(null); } }}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload size={16} className="text-primary" />
              Import Stock from Excel
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Expected columns:</p>
              <code className="block">Item Code / SKU, Barcode, Warehouse, Quantity</code>
              <p>Matches products by SKU or Barcode. If only one warehouse exists, Warehouse column is optional.</p>
            </div>

            <div>
              <label className={lbl}>Select Excel File (.xlsx / .xls)</label>
              <input type="file" accept=".xlsx,.xls" onChange={handleImportFileChange}
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary-foreground hover:file:opacity-90" />
            </div>

            {importResults && (
              <div className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-green-600 font-medium">✓ {importResults.success} imported</span>
                  {importResults.failed > 0 && <span className="text-destructive font-medium">✗ {importResults.failed} failed</span>}
                </div>
                {importResults.errors.length > 0 && (
                  <div className="max-h-32 overflow-y-auto text-xs text-destructive space-y-0.5">
                    {importResults.errors.map((e, i) => <p key={i}>{e}</p>)}
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => { setImportOpen(false); setImportFile(null); setImportResults(null); }}>Cancel</Button>
              <Button size="sm" onClick={processImport} disabled={!importFile || importing} className="gap-1.5">
                {importing ? <><Loader2 size={14} className="animate-spin" /> Importing...</> : <><Upload size={14} /> Import Stock</>}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

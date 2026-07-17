import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Plus, Search, Eye, X, ChevronDown, FileText, Trash2, CheckCircle, Ban, Loader2, ArrowLeft, Building2, UserCircle, Package, Percent, Calculator, FileSpreadsheet, Warehouse, MapPin, Truck, Hash, Calendar } from 'lucide-react';
import { MainLayout } from '@/components/layouts/MainLayout';
import {
  getPurchaseVouchers, getPurchaseVoucherById, savePurchaseVoucher,
  postPurchaseVoucher, cancelPurchaseVoucher,
  generatePurchaseVoucherNo, checkDuplicateSupplierInvoice,
  getCompanies, getSuppliers, getProducts, getCompanySettings,
  getUomMaster, getItemUomMappings
} from '@/lib/api';
import type { PurchaseVoucher, PurchaseVoucherItem, Company, Supplier, Product, Warehouse, UomMaster, ItemUomMapping } from '@/types/types';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';

const inp = 'w-full rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 placeholder:text-gray-600 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring';
const lbl = 'mb-1 block text-xs font-medium text-muted-foreground';
const fmt = (n: number) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const fmq = (n: number, d = 3) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: d }).format(n);

interface LineItem {
  tempId: string;
  sr_no: number;
  product_id: string;
  product_name: string;
  product_sku: string;
  hsn_code: string;
  gst_percent: number;
  uom_id: string;
  uom_name: string;
  is_base_uom: boolean;
  conversion_factor: number;
  transaction_qty: number;
  base_qty: number;
  rate: number;
  gross_amount: number;
  discount_percent: number;
  discount_amount: number;
  taxable_value: number;
  cgst_percent: number;
  cgst_amount: number;
  sgst_percent: number;
  sgst_amount: number;
  igst_percent: number;
  igst_amount: number;
  line_total: number;
  location_code: string;
  batch_no: string;
  expiry_date: string;
  remarks: string;
}

const emptyLine = (): LineItem => ({
  tempId: `new_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  sr_no: 1, product_id: '', product_name: '', product_sku: '', hsn_code: '', gst_percent: 0,
  uom_id: '', uom_name: '', is_base_uom: true, conversion_factor: 1,
  transaction_qty: 1, base_qty: 1, rate: 0, gross_amount: 0,
  discount_percent: 0, discount_amount: 0, taxable_value: 0,
  cgst_percent: 0, cgst_amount: 0, sgst_percent: 0, sgst_amount: 0, igst_percent: 0, igst_amount: 0,
  line_total: 0, location_code: '', batch_no: '', expiry_date: '', remarks: '',
});

const getFinancialYear = (): string => {
  const n = new Date(); const y = n.getFullYear(); const m = n.getMonth() + 1;
  return m >= 4 ? `${y}-${(y + 1).toString().slice(2)}` : `${y - 1}-${y.toString().slice(2)}`;
};

// ── Full-Page Purchase Entry Form ──────────────────────
const PurchaseEntryForm: React.FC<{
  editId: string | null;
  onClose: () => void;
  onSaved: () => void;
}> = ({ editId, onClose, onSaved }) => {
  const { user } = useAuth();
  const pageSize = 200;

  const [companies, setCompanies] = useState<Company[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [uomMaster, setUomMaster] = useState<UomMaster[]>([]);
  const [allProductUoms, setAllProductUoms] = useState<Map<string, ItemUomMapping[]>>(new Map());
  const [productSearch, setProductSearch] = useState('');
  const [financialYear, setFinancialYear] = useState(getFinancialYear());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Voucher header
  const [companyId, setCompanyId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split('T')[0]);
  const [voucherNo, setVoucherNo] = useState('');
  const [purchaseType, setPurchaseType] = useState('regular');
  const [referenceNo, setReferenceNo] = useState('');
  const [referenceDate, setReferenceDate] = useState('');

  // Supplier
  const [supplierId, setSupplierId] = useState('');
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [supplierInvoiceDate, setSupplierInvoiceDate] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [gstRegType, setGstRegType] = useState('registered');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [creditDays, setCreditDays] = useState(0);
  const [dueDate, setDueDate] = useState('');

  // Reference
  const [grnNo, setGrnNo] = useState(''); const [grnDate, setGrnDate] = useState('');
  const [challanNo, setChallanNo] = useState(''); const [challanDate, setChallanDate] = useState('');
  const [transporter, setTransporter] = useState(''); const [vehicleNo, setVehicleNo] = useState('');
  const [lrRrNo, setLrRrNo] = useState(''); const [lrRrDate, setLrRrDate] = useState('');
  const [ewayBillNo, setEwayBillNo] = useState(''); const [ewayBillDate, setEwayBillDate] = useState('');
  const [narration, setNarration] = useState('');

  // Items
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);

  // Totals
  const [invoiceDiscountPercent, setInvoiceDiscountPercent] = useState(0);
  const [freight, setFreight] = useState(0);
  const [freightGstPercent, setFreightGstPercent] = useState(0);
  const [packingForwarding, setPackingForwarding] = useState(0);
  const [insurance, setInsurance] = useState(0);
  const [otherCharges, setOtherCharges] = useState(0);
  const [roundOff, setRoundOff] = useState(0);

  const [dupWarning, setDupWarning] = useState('');

  // Load master data
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [coRes, whRes, supRes, prodRes, uomRes, settingsRes] = await Promise.all([
        getCompanies(), getWarehouses(),
        getSuppliers(1, pageSize), getProducts(1, pageSize),
        getUomMaster(), getCompanySettings(),
      ]);
      setCompanies(coRes.data);
      setWarehouses(whRes.data);
      setSuppliers(supRes.data);
      const prods = prodRes.data.map((p: Product) => ({ ...p, unit: p.unit || 'PCS' }));
      setAllProducts(prods);
      setProducts(prods);
      setUomMaster(uomRes.data);
      if (settingsRes.data?.financial_year) setFinancialYear(settingsRes.data.financial_year);
      if (coRes.data.length > 0) setCompanyId(coRes.data[0].id);
      if (whRes.data.length > 0) setWarehouseId(whRes.data[0].id);

      if (editId) {
        const { data } = await getPurchaseVoucherById(editId);
        if (data) {
          setCompanyId(data.company_id || coRes.data[0]?.id || '');
          setWarehouseId(data.warehouse_id || whRes.data[0]?.id || '');
          setVoucherDate(data.voucher_date);
          setVoucherNo(data.voucher_no);
          setPurchaseType(data.purchase_type || 'regular');
          setReferenceNo(data.reference_no || '');
          setReferenceDate(data.reference_date || '');
          setSupplierId(data.supplier_id);
          setSupplierInvoiceNo(data.supplier_invoice_no || '');
          setSupplierInvoiceDate(data.supplier_invoice_date || '');
          setPlaceOfSupply(data.place_of_supply || '');
          setGstRegType(data.gst_registration_type || 'registered');
          setPaymentTerms(data.payment_terms || '');
          setCreditDays(data.credit_days || 0);
          setDueDate(data.due_date || '');
          setGrnNo(data.grn_no || ''); setGrnDate(data.grn_date || '');
          setChallanNo(data.challan_no || ''); setChallanDate(data.challan_date || '');
          setTransporter(data.transporter || ''); setVehicleNo(data.vehicle_no || '');
          setLrRrNo(data.lr_rr_no || ''); setLrRrDate(data.lr_rr_date || '');
          setEwayBillNo(data.eway_bill_no || ''); setEwayBillDate(data.eway_bill_date || '');
          setNarration(data.narration || '');
          setInvoiceDiscountPercent(data.invoice_discount_percent || 0);
          setFreight(data.freight || 0); setFreightGstPercent(data.freight_gst_percent || 0);
          setPackingForwarding(data.packing_forwarding || 0); setInsurance(data.insurance || 0);
          setOtherCharges(data.other_charges || 0);
          if (data.suppliers) setSupplier(data.suppliers as unknown as Supplier);

          if (data.purchase_voucher_items) {
            const loadedLines: LineItem[] = data.purchase_voucher_items.map((item: PurchaseVoucherItem, idx: number) => ({
              tempId: item.id || `existing_${idx}`,
              sr_no: item.sr_no || idx + 1,
              product_id: item.product_id,
              product_name: (item.products as Product)?.name || '',
              product_sku: (item.products as Product)?.sku || '',
              hsn_code: (item.products as Product)?.hsn_code || '',
              gst_percent: item.gst_percent || (item.products as Product)?.gst_percent || 0,
              uom_id: item.uom_id || '',
              uom_name: item.transaction_uom || '',
              is_base_uom: !item.conversion_factor || item.conversion_factor === 1,
              conversion_factor: item.conversion_factor || 1,
              transaction_qty: item.transaction_qty || 0,
              base_qty: item.base_qty || item.transaction_qty || 0,
              rate: item.rate || 0,
              gross_amount: item.gross_amount || 0,
              discount_percent: item.discount_percent || 0,
              discount_amount: item.discount_amount || 0,
              taxable_value: item.taxable_value || 0,
              cgst_percent: item.cgst_percent || 0, cgst_amount: item.cgst_amount || 0,
              sgst_percent: item.sgst_percent || 0, sgst_amount: item.sgst_amount || 0,
              igst_percent: item.igst_percent || 0, igst_amount: item.igst_amount || 0,
              line_total: item.line_total || 0,
              location_code: item.location_code || '',
              batch_no: item.batch_no || '',
              expiry_date: item.expiry_date || '',
              remarks: item.remarks || '',
            }));
            setLines(loadedLines);
            const uomMap = new Map<string, ItemUomMapping[]>();
            for (const item of data.purchase_voucher_items || []) {
              const pid = item.product_id;
              if (pid && !uomMap.has(pid)) {
                const mappings = await getItemUomMappings(pid);
                uomMap.set(pid, mappings);
              }
            }
            setAllProductUoms(uomMap);
          }
        }
      }
      setLoading(false);
    };
    load();
  }, [editId]);

  // Auto-generate voucher number
  useEffect(() => {
    if (!editId && companyId) {
      generatePurchaseVoucherNo(companyId, financialYear).then(r => { if (r.data) setVoucherNo(r.data); });
    }
  }, [companyId, financialYear, editId]);

  // Filter products by search
  useEffect(() => {
    if (!productSearch.trim()) { setProducts(allProducts); return; }
    const s = productSearch.toLowerCase();
    setProducts(allProducts.filter(p => p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s) || (p.barcode || '').toLowerCase().includes(s)).slice(0, 50));
  }, [productSearch, allProducts]);

  const companyWarehouses = useMemo(() => warehouses.filter(w => !w.company_id || w.company_id === companyId), [warehouses, companyId]);

  const handleSupplierChange = useCallback(async (id: string) => {
    setSupplierId(id); setDupWarning('');
    if (!id) { setSupplier(null); return; }
    const s = suppliers.find(sp => sp.id === id) || null;
    setSupplier(s);
    if (s) {
      if (s.state) setPlaceOfSupply(s.state);
      setPaymentTerms(s.payment_terms || '');
      setCreditDays(s.credit_days || 0);
      if (s.credit_days > 0) {
        const d = new Date(); d.setDate(d.getDate() + s.credit_days);
        setDueDate(d.toISOString().split('T')[0]);
      }
      setGstRegType(s.gst_registered === 'Yes' ? 'registered' : 'unregistered');
    }
  }, [suppliers]);

  const loadProductUoms = useCallback(async (productId: string) => {
    if (!productId || allProductUoms.has(productId)) return;
    const mappings = await getItemUomMappings(productId);
    setAllProductUoms(prev => { const n = new Map(prev); n.set(productId, mappings); return n; });
  }, [allProductUoms]);

  const handleProductSelect = useCallback((lineIdx: number, productId: string) => {
    const prod = allProducts.find(p => p.id === productId);
    if (!prod) return;
    loadProductUoms(productId);
    const itemUoms = allProductUoms.get(productId) || [];
    const baseUom = itemUoms.find(u => u.is_base_uom);
    const defUom = itemUoms.find(u => u.default_purchase_uom) || baseUom || itemUoms[0];
    setLines(prev => {
      const updated = [...prev];
      const line = { ...updated[lineIdx] };
      line.product_id = productId;
      line.product_name = prod.name;
      line.product_sku = prod.sku;
      line.hsn_code = prod.hsn_code || '';
      line.gst_percent = prod.gst_percent || 0;
      if (defUom) {
        line.uom_id = defUom.uom_id;
        line.uom_name = defUom.uom_code || '';
        line.is_base_uom = defUom.is_base_uom;
        line.conversion_factor = defUom.conversion_factor;
        line.base_qty = line.transaction_qty * defUom.conversion_factor;
      } else {
        line.uom_id = '';
        line.uom_name = prod.unit || '';
        line.is_base_uom = true;
        line.conversion_factor = 1;
        line.base_qty = line.transaction_qty;
      }
      if (prod.purchase_price > 0) line.rate = prod.purchase_price;
      recalcLine(line);
      updated[lineIdx] = line;
      return updated;
    });
  }, [allProducts, allProductUoms, loadProductUoms]);

  const handleUomChange = useCallback((lineIdx: number, uomId: string) => {
    const itemUoms = allProductUoms.get(lines[lineIdx].product_id) || [];
    const selected = itemUoms.find(u => u.uom_id === uomId);
    if (!selected) return;
    setLines(prev => {
      const updated = [...prev];
      const line = { ...updated[lineIdx] };
      line.uom_id = selected.uom_id;
      line.uom_name = selected.uom_code || '';
      line.is_base_uom = selected.is_base_uom;
      line.conversion_factor = selected.conversion_factor;
      line.base_qty = line.transaction_qty * selected.conversion_factor;
      recalcLine(line);
      updated[lineIdx] = line;
      return updated;
    });
  }, [lines, allProductUoms]);

  const recalcLine = (line: LineItem) => {
    line.gross_amount = line.transaction_qty * line.rate;
    line.discount_amount = line.gross_amount * (line.discount_percent / 100);
    line.taxable_value = line.gross_amount - line.discount_amount;
    const halfGst = line.gst_percent / 2;
    line.cgst_percent = halfGst;
    line.sgst_percent = halfGst;
    line.igst_percent = 0;
    line.cgst_amount = line.taxable_value * (halfGst / 100);
    line.sgst_amount = line.taxable_value * (halfGst / 100);
    line.igst_amount = 0;
    line.line_total = line.taxable_value + line.cgst_amount + line.sgst_amount;
  };

  const setLineField = (i: number, field: string, value: number | string) => {
    setLines(prev => {
      const updated = [...prev];
      const line = { ...updated[i] };
      (line as unknown as Record<string, unknown>)[field] = value;
      if (field === 'transaction_qty') line.base_qty = Number(value) * line.conversion_factor;
      recalcLine(line);
      updated[i] = line;
      return updated;
    });
  };

  const computed = useMemo(() => {
    const grossAmount = lines.reduce((s, l) => s + l.gross_amount, 0);
    const itemDiscountTotal = lines.reduce((s, l) => s + l.discount_amount, 0);
    const subTotal = lines.reduce((s, l) => s + l.taxable_value, 0);
    const invoiceDiscountAmt = subTotal * (invoiceDiscountPercent / 100);
    const taxableValue = subTotal - invoiceDiscountAmt;

    const gstRatio = subTotal > 0 ? taxableValue / subTotal : 1;
    const cgstTotal = lines.reduce((s, l) => s + l.cgst_amount, 0) * gstRatio;
    const sgstTotal = lines.reduce((s, l) => s + l.sgst_amount, 0) * gstRatio;
    const igstTotal = lines.reduce((s, l) => s + l.igst_amount, 0) * gstRatio;

    const beforeRound = taxableValue + cgstTotal + sgstTotal + igstTotal + freight + packingForwarding + insurance + otherCharges;
    const roundOffVal = Math.round(beforeRound) - beforeRound;
    const grandTotal = beforeRound + roundOffVal;
    return { grossAmount, itemDiscountTotal, subTotal, invoiceDiscountAmt, taxableValue, cgstTotal, sgstTotal, igstTotal, roundOffVal, grandTotal };
  }, [lines, invoiceDiscountPercent, freight, packingForwarding, insurance, otherCharges]);

  useEffect(() => { setRoundOff(computed.roundOffVal); }, [computed.roundOffVal]);

  const checkDuplicate = useCallback(async () => {
    if (!companyId || !supplierId || !supplierInvoiceNo || !financialYear) return;
    const r = await checkDuplicateSupplierInvoice(companyId, supplierId, supplierInvoiceNo, financialYear, editId || undefined);
    if (r.data?.is_duplicate) setDupWarning(`Duplicate invoice! Existing: ${r.data.existing_voucher_no}`);
    else setDupWarning('');
  }, [companyId, supplierId, supplierInvoiceNo, financialYear, editId]);

  const handleSave = async (status: 'draft' | 'posted') => {
    if (!companyId) { toast.error('Select company'); return; }
    if (!supplierId) { toast.error('Select supplier'); return; }
    const validLines = lines.filter(l => l.product_id && l.transaction_qty > 0);
    if (validLines.length === 0) { toast.error('Add at least one item'); return; }
    if (supplierInvoiceNo) {
      await checkDuplicate();
      if (dupWarning) { toast.error(dupWarning); return; }
    }
    setSaving(true);

    const header: Partial<PurchaseVoucher> = {
      id: editId || undefined, voucher_no: voucherNo, voucher_date: voucherDate,
      company_id: companyId, warehouse_id: warehouseId, voucher_type: 'purchase',
      financial_year: financialYear, purchase_type: purchaseType,
      reference_no: referenceNo || null, reference_date: referenceDate || null,
      supplier_id: supplierId, supplier_invoice_no: supplierInvoiceNo || null,
      supplier_invoice_date: supplierInvoiceDate || null,
      place_of_supply: placeOfSupply || null, gst_registration_type: gstRegType,
      payment_terms: paymentTerms || null, credit_days: creditDays, due_date: dueDate || null,
      grn_no: grnNo || null, grn_date: grnDate || null,
      challan_no: challanNo || null, challan_date: challanDate || null,
      transporter: transporter || null, vehicle_no: vehicleNo || null,
      lr_rr_no: lrRrNo || null, lr_rr_date: lrRrDate || null,
      eway_bill_no: ewayBillNo || null, eway_bill_date: ewayBillDate || null,
      gross_amount: computed.grossAmount, item_discount_total: computed.itemDiscountTotal,
      invoice_discount_percent: invoiceDiscountPercent, invoice_discount_amount: computed.invoiceDiscountAmt,
      taxable_value: computed.taxableValue, cgst_total: computed.cgstTotal, sgst_total: computed.sgstTotal,
      igst_total: computed.igstTotal, freight, freight_gst_percent: freightGstPercent,
      packing_forwarding: packingForwarding, insurance, other_charges: otherCharges,
      round_off: computed.roundOffVal, grand_total: computed.grandTotal,
      narration: narration || null, status, created_by: user?.id,
    };

    const items = validLines.map(l => ({
      product_id: l.product_id, uom_id: l.uom_id || null, conversion_factor: l.conversion_factor,
      transaction_qty: l.transaction_qty, transaction_uom: l.uom_name || null,
      base_qty: l.base_qty, base_uom: (() => {
        const base = allProductUoms.get(l.product_id)?.find(u => u.is_base_uom);
        return base?.uom_code || l.uom_name;
      })(),
      rate: l.rate, rate_per: `/${l.uom_name}`, gross_amount: l.gross_amount,
      discount_percent: l.discount_percent, discount_amount: l.discount_amount,
      taxable_value: l.taxable_value, gst_percent: l.gst_percent,
      cgst_percent: l.gst_percent / 2, cgst_amount: l.cgst_amount,
      sgst_percent: l.gst_percent / 2, sgst_amount: l.sgst_amount,
      igst_percent: 0, igst_amount: 0,
      line_total: l.line_total, warehouse_id: warehouseId,
      location_code: l.location_code || null, batch_no: l.batch_no || null,
      expiry_date: l.expiry_date || null, remarks: l.remarks || null,
    }));

    const { data, error } = await savePurchaseVoucher(header, items);
    if (error) { toast.error(String(error)); setSaving(false); return; }

    if (status === 'posted' && data?.id) {
      const postResult = await postPurchaseVoucher(data.id, user?.id || '');
      if (postResult.error) {
        toast.error(`Saved draft but posting failed: ${String(postResult.error)}`);
        onSaved(); onClose(); setSaving(false); return;
      }
      toast.success('Purchase Voucher posted successfully');
    } else {
      toast.success(editId ? 'Voucher updated' : 'Voucher saved as draft');
    }
    setSaving(false);
    onSaved(); onClose();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 size={32} className="animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading purchase entry...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Back button */}
      <button onClick={onClose} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> Back to Purchase Vouchers
      </button>

      {/* ── VOUCHER INFORMATION ── */}
      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b border-border bg-muted/20 px-4 py-2.5">
          <FileText size={15} className="text-primary" />
          <span className="text-sm font-semibold">Voucher Information</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 p-4">
          <div className="md:col-span-2">
            <label className={lbl}>Company *</label>
            <select value={companyId} onChange={e => setCompanyId(e.target.value)} className={inp}>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Voucher No *</label>
            <input value={voucherNo} onChange={e => setVoucherNo(e.target.value)} className={inp} />
          </div>
          <div>
            <label className={lbl}>Voucher Date *</label>
            <input type="date" value={voucherDate} onChange={e => setVoucherDate(e.target.value)} className={inp} />
          </div>
          <div>
            <label className={lbl}>Financial Year</label>
            <input value={financialYear} onChange={e => setFinancialYear(e.target.value)} className={inp} />
          </div>
          <div>
            <label className={lbl}>Purchase Type</label>
            <select value={purchaseType} onChange={e => setPurchaseType(e.target.value)} className={inp}>
              <option value="regular">Regular</option>
              <option value="import">Import</option>
              <option value="capital">Capital Goods</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Warehouse</label>
            <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className={inp}>
              {companyWarehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Reference No</label>
            <input value={referenceNo} onChange={e => setReferenceNo(e.target.value)} className={inp} />
          </div>
          <div>
            <label className={lbl}>Reference Date</label>
            <input type="date" value={referenceDate} onChange={e => setReferenceDate(e.target.value)} className={inp} />
          </div>
        </div>
      </div>

      {/* ── SUPPLIER DETAILS ── */}
      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b border-border bg-muted/20 px-4 py-2.5">
          <UserCircle size={15} className="text-primary" />
          <span className="text-sm font-semibold">Supplier Details</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 p-4">
          <div className="md:col-span-2">
            <label className={lbl}>Supplier / Party *</label>
            <select value={supplierId} onChange={e => handleSupplierChange(e.target.value)} className={inp}>
              <option value="">Select Supplier</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}{s.gstin ? ` (${s.gstin})` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Supplier Invoice No *</label>
            <input value={supplierInvoiceNo} onChange={e => { setSupplierInvoiceNo(e.target.value); setDupWarning(''); }} onBlur={checkDuplicate} className={inp} />
            {dupWarning && <p className="mt-0.5 text-[10px] text-destructive">{dupWarning}</p>}
          </div>
          <div>
            <label className={lbl}>Invoice Date</label>
            <input type="date" value={supplierInvoiceDate} onChange={e => setSupplierInvoiceDate(e.target.value)} className={inp} />
          </div>
          <div>
            <label className={lbl}>Place of Supply</label>
            <input value={placeOfSupply} onChange={e => setPlaceOfSupply(e.target.value)} className={inp} />
          </div>
          <div>
            <label className={lbl}>GST Registration</label>
            <select value={gstRegType} onChange={e => setGstRegType(e.target.value)} className={inp}>
              <option value="registered">Registered</option>
              <option value="unregistered">Unregistered</option>
              <option value="composition">Composition</option>
              <option value="consumer">Consumer</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Payment Terms</label>
            <input value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} className={inp} placeholder="Net 30" />
          </div>
          <div>
            <label className={lbl}>Credit Days</label>
            <input type="number" min={0} value={creditDays} onChange={e => setCreditDays(parseInt(e.target.value) || 0)} className={inp} />
          </div>
          <div>
            <label className={lbl}>Due Date</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inp} />
          </div>
        </div>
        {supplier && (
          <div className="mx-4 mb-3 flex flex-wrap gap-x-6 gap-y-1 rounded bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
            <span><span className="font-medium text-foreground">GSTIN:</span> {supplier.gstin || '—'}</span>
            <span><span className="font-medium text-foreground">PAN:</span> {supplier.pan || '—'}</span>
            <span><span className="font-medium text-foreground">Address:</span> {supplier.billing_address || supplier.address || '—'}</span>
            <span><span className="font-medium text-foreground">State:</span> {supplier.state || '—'}</span>
            <span><span className="font-medium text-foreground">Credit Limit:</span> ₹{fmt(supplier.credit_limit || 0)}</span>
          </div>
        )}
      </div>

      {/* ── REFERENCE DETAILS (Collapsible) ── */}
      <details className="rounded-lg border border-border bg-card shadow-sm">
        <summary className="flex cursor-pointer items-center gap-2 border-b border-border bg-muted/20 px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ChevronDown size={14} /> Other References
        </summary>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 p-4">
          <div><label className={lbl}>GRN No</label><input value={grnNo} onChange={e => setGrnNo(e.target.value)} className={inp} /></div>
          <div><label className={lbl}>GRN Date</label><input type="date" value={grnDate} onChange={e => setGrnDate(e.target.value)} className={inp} /></div>
          <div><label className={lbl}>Challan No</label><input value={challanNo} onChange={e => setChallanNo(e.target.value)} className={inp} /></div>
          <div><label className={lbl}>Challan Date</label><input type="date" value={challanDate} onChange={e => setChallanDate(e.target.value)} className={inp} /></div>
          <div><label className={lbl}>Transporter</label><input value={transporter} onChange={e => setTransporter(e.target.value)} className={inp} /></div>
          <div><label className={lbl}>Vehicle No</label><input value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} className={inp} /></div>
          <div><label className={lbl}>LR/RR No</label><input value={lrRrNo} onChange={e => setLrRrNo(e.target.value)} className={inp} /></div>
          <div><label className={lbl}>LR/RR Date</label><input type="date" value={lrRrDate} onChange={e => setLrRrDate(e.target.value)} className={inp} /></div>
          <div><label className={lbl}>E-Way Bill No</label><input value={ewayBillNo} onChange={e => setEwayBillNo(e.target.value)} className={inp} /></div>
          <div><label className={lbl}>E-Way Bill Date</label><input type="date" value={ewayBillDate} onChange={e => setEwayBillDate(e.target.value)} className={inp} /></div>
        </div>
      </details>

      {/* ── ITEMS ENTRY GRID ── */}
      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Package size={15} className="text-primary" />
            <span className="text-sm font-semibold">Item Details</span>
          </div>
          <div className="flex items-center gap-2">
            <input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Search items..."
              className="w-48 rounded border border-input bg-input px-2.5 py-1 text-xs !text-gray-900 placeholder:text-gray-500 focus:border-primary focus:outline-none" />
            <button onClick={() => setLines(prev => [...prev, emptyLine()])}
              className="inline-flex items-center gap-1 rounded bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20">+ Add Item</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="px-2 py-2 text-left font-medium text-muted-foreground w-6">#</th>
                <th className="px-2 py-2 text-left font-medium text-muted-foreground min-w-[160px]">Item</th>
                <th className="px-2 py-2 text-left font-medium text-muted-foreground w-14">HSN</th>
                <th className="px-2 py-2 text-center font-medium text-muted-foreground w-14">UOM</th>
                <th className="px-2 py-2 text-right font-medium text-muted-foreground w-16">Qty</th>
                <th className="px-2 py-2 text-center font-medium text-muted-foreground w-12">Conv</th>
                <th className="px-2 py-2 text-right font-medium text-muted-foreground w-16">Base Qty</th>
                <th className="px-2 py-2 text-right font-medium text-muted-foreground w-20">Rate</th>
                <th className="px-2 py-2 text-right font-medium text-muted-foreground w-20">Gross</th>
                <th className="px-2 py-2 text-right font-medium text-muted-foreground w-12">Disc%</th>
                <th className="px-2 py-2 text-right font-medium text-muted-foreground w-20">Disc Amt</th>
                <th className="px-2 py-2 text-right font-medium text-muted-foreground w-20">Taxable</th>
                <th className="px-2 py-2 text-right font-medium text-muted-foreground w-12">GST%</th>
                <th className="px-2 py-2 text-right font-medium text-muted-foreground w-16">CGST</th>
                <th className="px-2 py-2 text-right font-medium text-muted-foreground w-16">SGST</th>
                <th className="px-2 py-2 text-right font-medium text-muted-foreground w-20">Line Total</th>
                <th className="px-2 py-2 text-left font-medium text-muted-foreground w-20">Remarks</th>
                <th className="px-2 py-2 w-6"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => {
                const itemUoms = allProductUoms.get(line.product_id) || [];
                return (
                  <tr key={line.tempId} className="border-b border-border hover:bg-muted/10">
                    <td className="px-2 py-1 text-muted-foreground text-center">{i + 1}</td>
                    <td className="px-2 py-1">
                      <select value={line.product_id} onChange={e => handleProductSelect(i, e.target.value)}
                        className="w-full rounded border-0 bg-transparent px-1 py-1 text-xs focus:outline-none">
                        <option value="">Select item...</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1"><input value={line.hsn_code} onChange={e => setLineField(i, 'hsn_code', e.target.value)} className="w-full border-0 bg-transparent px-1 py-1 text-xs focus:outline-none text-center" /></td>
                    <td className="px-2 py-1">
                      {itemUoms.length > 0 ? (
                        <select value={line.uom_id} onChange={e => handleUomChange(i, e.target.value)}
                          className="w-full rounded border-0 bg-transparent px-1 py-1 text-xs text-center focus:outline-none">
                          {itemUoms.map(u => <option key={u.uom_id} value={u.uom_id}>{u.uom_code}</option>)}
                        </select>
                      ) : (
                        <input value={line.uom_name} onChange={e => setLineField(i, 'uom_name', e.target.value)} className="w-full border-0 bg-transparent px-1 py-1 text-xs text-center focus:outline-none" />
                      )}
                    </td>
                    <td className="px-2 py-1"><input type="number" min={0} step={0.001} value={line.transaction_qty} onChange={e => setLineField(i, 'transaction_qty', parseFloat(e.target.value) || 0)} className="w-full border-0 bg-transparent px-1 py-1 text-xs text-right tabular-nums focus:outline-none" /></td>
                    <td className="px-2 py-1 text-center text-muted-foreground">{line.is_base_uom ? '—' : `1:${line.conversion_factor}`}</td>
                    <td className="px-2 py-1 text-right tabular-nums text-muted-foreground">{fmq(line.base_qty)}</td>
                    <td className="px-2 py-1"><input type="number" min={0} step={0.01} value={line.rate} onChange={e => setLineField(i, 'rate', parseFloat(e.target.value) || 0)} className="w-full border-0 bg-transparent px-1 py-1 text-xs text-right tabular-nums focus:outline-none" /></td>
                    <td className="px-2 py-1 text-right tabular-nums font-medium">{fmt(line.gross_amount)}</td>
                    <td className="px-2 py-1"><input type="number" min={0} max={100} step={0.01} value={line.discount_percent} onChange={e => setLineField(i, 'discount_percent', parseFloat(e.target.value) || 0)} className="w-full border-0 bg-transparent px-1 py-1 text-xs text-right focus:outline-none" /></td>
                    <td className="px-2 py-1 text-right tabular-nums text-muted-foreground">{fmt(line.discount_amount)}</td>
                    <td className="px-2 py-1 text-right tabular-nums font-medium">{fmt(line.taxable_value)}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{line.gst_percent}%</td>
                    <td className="px-2 py-1 text-right tabular-nums text-blue-600">{fmt(line.cgst_amount)}</td>
                    <td className="px-2 py-1 text-right tabular-nums text-green-600">{fmt(line.sgst_amount)}</td>
                    <td className="px-2 py-1 text-right tabular-nums font-semibold">{fmt(line.line_total)}</td>
                    <td className="px-2 py-1"><input value={line.remarks} onChange={e => setLineField(i, 'remarks', e.target.value)} className="w-20 border-0 bg-transparent px-1 py-1 text-xs focus:outline-none" placeholder="—" /></td>
                    <td className="px-2 py-1">
                      {lines.length > 1 && <button onClick={() => setLines(prev => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive"><X size={12} /></button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── BOTTOM SECTION: Charges + Summary ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Additional Charges */}
        <div className="rounded-lg border border-border bg-card shadow-sm">
          <div className="flex items-center gap-2 border-b border-border bg-muted/20 px-4 py-2.5">
            <Calculator size={15} className="text-primary" />
            <span className="text-sm font-semibold">Additional Charges</span>
          </div>
          <div className="grid grid-cols-2 gap-3 p-4">
            <div>
              <label className={lbl}>Freight</label>
              <input type="number" min={0} step={0.01} value={freight} onChange={e => setFreight(parseFloat(e.target.value) || 0)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Freight GST%</label>
              <input type="number" min={0} step={0.01} value={freightGstPercent} onChange={e => setFreightGstPercent(parseFloat(e.target.value) || 0)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Packing & Forwarding</label>
              <input type="number" min={0} step={0.01} value={packingForwarding} onChange={e => setPackingForwarding(parseFloat(e.target.value) || 0)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Insurance</label>
              <input type="number" min={0} step={0.01} value={insurance} onChange={e => setInsurance(parseFloat(e.target.value) || 0)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Other Charges</label>
              <input type="number" min={0} step={0.01} value={otherCharges} onChange={e => setOtherCharges(parseFloat(e.target.value) || 0)} className={inp} />
            </div>
          </div>
        </div>

        {/* Voucher Summary */}
        <div className="rounded-lg border border-border bg-card shadow-sm">
          <div className="flex items-center gap-2 border-b border-border bg-muted/20 px-4 py-2.5">
            <FileSpreadsheet size={15} className="text-primary" />
            <span className="text-sm font-semibold">Voucher Summary</span>
          </div>
          <div className="space-y-1.5 p-4 text-xs">
            <div className="flex justify-between py-0.5"><span className="text-muted-foreground">Gross Item Value</span><span className="tabular-nums font-medium">{fmt(computed.grossAmount)}</span></div>
            <div className="flex justify-between py-0.5"><span className="text-muted-foreground">Item Discount Total</span><span className="tabular-nums text-destructive">- {fmt(computed.itemDiscountTotal)}</span></div>
            <div className="flex items-center justify-between py-0.5 gap-2">
              <span className="text-muted-foreground whitespace-nowrap">Invoice Discount</span>
              <div className="flex items-center gap-1">
                <input type="number" min={0} max={100} step={0.01} value={invoiceDiscountPercent}
                  onChange={e => setInvoiceDiscountPercent(parseFloat(e.target.value) || 0)}
                  className="w-14 rounded border border-input bg-input px-1.5 py-0.5 text-xs text-right tabular-nums" />
                <span className="text-muted-foreground">%</span>
                <span className="tabular-nums w-20 text-right text-destructive">- {fmt(computed.invoiceDiscountAmt)}</span>
              </div>
            </div>
            <div className="border-t border-border pt-1.5 flex justify-between"><span className="font-medium text-foreground">Taxable Value</span><span className="tabular-nums font-semibold">{fmt(computed.taxableValue)}</span></div>
            <div className="flex justify-between py-0.5"><span className="text-muted-foreground">CGST</span><span className="tabular-nums text-blue-600">{fmt(computed.cgstTotal)}</span></div>
            <div className="flex justify-between py-0.5"><span className="text-muted-foreground">SGST</span><span className="tabular-nums text-green-600">{fmt(computed.sgstTotal)}</span></div>
            <div className="flex justify-between py-0.5"><span className="text-muted-foreground">IGST</span><span className="tabular-nums text-purple-600">{fmt(computed.igstTotal)}</span></div>
            <div className="flex justify-between py-0.5"><span className="text-muted-foreground">Freight</span><span className="tabular-nums">{fmt(freight)}</span></div>
            <div className="flex justify-between py-0.5"><span className="text-muted-foreground">Packing & Forwarding</span><span className="tabular-nums">{fmt(packingForwarding)}</span></div>
            <div className="flex justify-between py-0.5"><span className="text-muted-foreground">Insurance</span><span className="tabular-nums">{fmt(insurance)}</span></div>
            <div className="flex justify-between py-0.5"><span className="text-muted-foreground">Other Charges</span><span className="tabular-nums">{fmt(otherCharges)}</span></div>
            <div className="flex justify-between py-0.5"><span className="text-muted-foreground">Round Off</span><span className="tabular-nums">{fmt(computed.roundOffVal)}</span></div>
            <div className="border-t-2 border-border pt-2 mt-1 flex justify-between">
              <span className="text-sm font-bold text-foreground">Grand Total</span>
              <span className="text-sm font-bold tabular-nums">₹ {fmt(computed.grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Narration */}
      <div className="rounded-lg border border-border bg-card shadow-sm p-4">
        <label className={lbl}>Narration / Notes</label>
        <textarea value={narration} onChange={e => setNarration(e.target.value)} rows={2} className="w-full rounded border border-input bg-input px-3 py-2 text-sm !text-gray-900 focus:border-primary focus:outline-none resize-none" />
      </div>

      {/* Actions */}
      <div className="sticky bottom-0 -mx-4 -mb-4 mt-6 rounded-b-lg border-t border-border bg-background px-4 py-3 shadow-lg">
        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded border border-border bg-background px-5 py-2 text-sm hover:bg-muted transition-colors">Cancel</button>
          <button onClick={() => handleSave('draft')} disabled={saving}
            className="rounded border border-primary bg-background px-5 py-2 text-sm font-medium text-primary hover:bg-primary/5 disabled:opacity-60 transition-colors">
            {saving ? 'Saving...' : 'Save as Draft'}
          </button>
          <button onClick={() => handleSave('posted')} disabled={saving}
            className="inline-flex items-center gap-2 rounded bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-colors">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
            {saving ? 'Posting...' : editId ? 'Update & Post' : 'Post Voucher'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── LIST VIEW ──────────────────────────────────────────
const PurchaseVoucherList: React.FC<{
  onCreate: () => void;
  onEdit: (id: string) => void;
}> = ({ onCreate, onEdit }) => {
  const { user } = useAuth();
  const [vouchers, setVouchers] = useState<PurchaseVoucher[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [postingId, setPostingId] = useState<string | null>(null);
  const PAGE_SIZE = 15;

  const load = useCallback(async () => {
    setLoading(true);
    const [vRes, cRes, sRes] = await Promise.all([
      getPurchaseVouchers(page, PAGE_SIZE, { status: statusFilter, companyId: companyFilter, supplierId: supplierFilter, search: search || undefined }),
      getCompanies(), getSuppliers(1, 500),
    ]);
    setVouchers(vRes.data); setTotal(vRes.count);
    setCompanies(cRes.data); setSuppliers(sRes.data);
    setLoading(false);
  }, [page, statusFilter, companyFilter, supplierFilter, search]);

  useEffect(() => { load(); }, [load]);

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = { draft: 'bg-yellow-50 text-yellow-700 border-yellow-200', posted: 'bg-green-50 text-green-700 border-green-200', cancelled: 'bg-red-50 text-red-700 border-red-200' };
    return <span className={`rounded border px-2 py-0.5 text-[10px] font-medium ${colors[s] || 'bg-gray-50'}`}>{s}</span>;
  };

  const handlePost = async (id: string) => {
    setPostingId(id);
    const r = await postPurchaseVoucher(id, user?.id || '');
    if (r.error) toast.error(String(r.error)); else { toast.success('Voucher posted'); load(); }
    setPostingId(null);
  };

  const handleCancel = async () => {
    if (!cancelId) return;
    setCancelling(true);
    const r = await cancelPurchaseVoucher(cancelId, user?.id || '');
    if (r.error) toast.error(String(r.error)); else { toast.success('Voucher cancelled'); load(); }
    setCancelling(false); setCancelId(null);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold">Purchase Vouchers</h2>
          <p className="text-sm text-muted-foreground">{total} voucher(s)</p>
        </div>
        <button onClick={onCreate}
          className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-colors">
          <Plus size={16} /> New Purchase Voucher
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search voucher or invoice..."
            className="w-full rounded border border-input bg-input pl-7 pr-2.5 py-1.5 text-xs !text-gray-900 placeholder:text-gray-500 focus:border-primary focus:outline-none" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="rounded border border-input bg-input px-2 py-1.5 text-xs">
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="posted">Posted</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select value={companyFilter} onChange={e => { setCompanyFilter(e.target.value); setPage(1); }} className="rounded border border-input bg-input px-2 py-1.5 text-xs max-w-[140px]">
          <option value="all">All Companies</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={supplierFilter} onChange={e => { setSupplierFilter(e.target.value); setPage(1); }} className="rounded border border-input bg-input px-2 py-1.5 text-xs max-w-[140px]">
          <option value="all">All Suppliers</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card shadow-sm overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {['Voucher No', 'Date', 'Company', 'Warehouse', 'Supplier', 'Invoice No', 'Taxable', 'Grand Total', 'Status', 'Actions'].map(h => (
                <th key={h} className="whitespace-nowrap px-3 py-2.5 text-left font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {[...Array(10)].map((_, j) => <td key={j} className="px-3 py-2.5"><div className="h-3 w-16 animate-pulse rounded bg-muted" /></td>)}
                </tr>
              ))
            ) : vouchers.length === 0 ? (
              <tr><td colSpan={10} className="px-3 py-12 text-center"><p className="text-muted-foreground text-sm">No purchase vouchers yet</p><p className="text-[11px] text-muted-foreground mt-1">Click "New Purchase Voucher" to create one</p></td></tr>
            ) : vouchers.map(v => (
              <tr key={v.id} className="border-b border-border hover:bg-muted/10 transition-colors">
                <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-primary text-[11px]">{v.voucher_no}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">{v.voucher_date}</td>
                <td className="whitespace-nowrap px-3 py-2.5">{(v.companies as Company)?.name || '—'}</td>
                <td className="whitespace-nowrap px-3 py-2.5">{(v.warehouses as Warehouse)?.name || '—'}</td>
                <td className="whitespace-nowrap px-3 py-2.5">{(v.suppliers as Supplier)?.name || '—'}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">{v.supplier_invoice_no || '—'}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">{fmt(v.taxable_value)}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums font-semibold">{fmt(v.grand_total)}</td>
                <td className="whitespace-nowrap px-3 py-2.5">{statusBadge(v.status)}</td>
                <td className="whitespace-nowrap px-3 py-2.5">
                  <div className="flex items-center gap-1">
                    <button onClick={() => onEdit(v.id)} title="View / Edit"
                      className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><Eye size={13} /></button>
                    {v.status === 'draft' && (
                      <button onClick={() => handlePost(v.id)} disabled={postingId === v.id} title="Post"
                        className="rounded p-1.5 text-green-600 hover:bg-green-50 transition-colors">
                        {postingId === v.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                      </button>
                    )}
                    {v.status !== 'cancelled' && (
                      <button onClick={() => setCancelId(v.id)} title="Cancel"
                        className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"><Ban size={13} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="rounded border border-border px-3 py-1.5 hover:bg-muted disabled:opacity-40 transition-colors">Prev</button>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="rounded border border-border px-3 py-1.5 hover:bg-muted disabled:opacity-40 transition-colors">Next</button>
          </div>
        </div>
      )}

      {/* Cancel Dialog */}
      <AlertDialog open={!!cancelId} onOpenChange={o => { if (!o) setCancelId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Purchase Voucher</AlertDialogTitle>
            <AlertDialogDescription>
              This will reverse all inventory movements and accounting entries. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} disabled={cancelling} className="bg-destructive text-destructive-foreground">
              {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ── MAIN PAGE ──────────────────────────────────────────
export const PurchaseVoucherPage: React.FC = () => {
  const [mode, setMode] = useState<'list' | 'form'>('list');
  const [editId, setEditId] = useState<string | null>(null);

  const handleCreate = () => { setEditId(null); setMode('form'); };
  const handleEdit = (id: string) => { setEditId(id); setMode('form'); };
  const handleClose = () => { setEditId(null); setMode('list'); };

  return (
    <MainLayout>
      {mode === 'list' ? (
        <PurchaseVoucherList onCreate={handleCreate} onEdit={handleEdit} />
      ) : (
        <PurchaseEntryForm editId={editId} onClose={handleClose} onSaved={handleClose} />
      )}
    </MainLayout>
  );
};

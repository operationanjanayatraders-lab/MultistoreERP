export type UserRole = 'user' | 'admin';
export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense';
export type VoucherType = 'journal' | 'payment' | 'receipt' | 'contra' | 'debit_note' | 'credit_note';

export interface Profile {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  designation: string | null;
  department_id: string | null;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;

  company_id?: string | null;
  branch_id?: string | null;
  warehouse_id?: string | null;

  permissions?: Record<string, boolean>;

  created_at: string;
  updated_at: string;
}

export interface CompanySettings {
  id: string;
  company_name: string;
  tagline: string;
  logo_url: string;
  address?: string | null;
  mobile?: string | null;
  email?: string | null;
  gstin?: string | null;
  pan?: string | null;
  financial_year?: string | null;
  created_at: string;
  updated_at: string;
}
export interface Company {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface Branch {
  id: string;
  branch_id: string | null;
  name: string;
  contact_person: string | null;
  contact_number: string | null;
  location: string | null;
  is_active: boolean;
  created_at: string;
  company_id?: string | null;
}
export interface Warehouse {
  id: string;
  warehouse_id: string | null;
  name: string;
  location: string | null;
  contact_person: string | null;
  contact_number: string | null;
  branch_id: string | null;
  company_id?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  category_id: string | null;
  description: string | null;
  unit: string;
  purchase_price: number;
  selling_price: number;
  reorder_level: number;
  is_active: boolean;
  brand?: string | null;
  sub_brand?: string | null;
  group_name?: string | null;
  sub_category?: string | null;
  hsn_code?: string | null;
  gst_percent?: number;
  opening_stock?: number;
  created_at: string;
  updated_at: string;
  product_categories?: ProductCategory;
}

export interface Unit {
  id: string;
  name: string;
  created_at: string;
}

export interface BrandMaster {
  id: string;
  name: string;
  created_at: string;
}

export interface SubBrand {
  id: string;
  name: string;
  brand_id: string | null;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  product_id: string;
  warehouse_id: string;
  quantity: number;
  updated_at: string;
  products?: Product;
  warehouses?: Warehouse;
}

export interface InventoryTransaction {
  id: string;
  transaction_date: string;
  warehouse_id: string;
  product_id: string;
  transaction_type: 'OPENING' | 'PURCHASE' | 'SALE' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'PURCHASE_RETURN' | 'SALES_RETURN' | 'ADJUSTMENT' | 'DAMAGE';
  quantity: number;
  unit_price: number;
  reference_no: string | null;
  reference_id: string | null;
  remarks: string | null;
  created_by: string | null;
  created_at: string;
  products?: Product;
  warehouses?: Warehouse;
}

export interface StockSummary {
  product_id: string;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  brand: string | null;
  category: string | null;
  unit: string;
  purchase_price: number;
  reorder_level: number;
  opening_qty: number;
  inwards: number;
  outwards: number;
  transfer_in: number;
  transfer_out: number;
  sales_return: number;
  purchase_return: number;
  damage: number;
  adjustment: number;
  closing_stock: number;
  stock_value: number;
  box_std: number;
  box_qty: number;
  pkt_std: number;
  pkt_qty: number;
  loose_cut_qty: number;
  warehouses: { warehouse_id: string; warehouse_name: string; quantity: number }[];
}

export interface InventorySummaryCards {
  total_value: number;
  total_qty: number;
  total_items: number;
  low_stock: number;
  out_of_stock: number;
  negative_stock: number;
}

export interface ProductLocation {
  id: string;
  product_id: string;
  warehouse_id: string;
  location_code: string;
  quantity: number;
  created_at: string;
  warehouses?: Warehouse;
}

export interface TransactionType {
  id: string;
  name: string;
  code: string;
  description: string | null;
  affects_stock: 'increase' | 'decrease' | 'none';
  is_active: boolean;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
  // Extended supplier master fields
  supplier_code: string | null;
  print_name: string | null;
  contact_person: string | null;
  supplier_category: string | null;
  supplier_group: string | null;
  opening_balance: number;
  dr_cr: string;
  alternate_mobile: string | null;
  telephone: string | null;
  website: string | null;
  billing_address: string | null;
  shipping_address: string | null;
  area: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  gstin: string | null;
  pan: string | null;
  tan: string | null;
  aadhaar_no: string | null;
  msme_no: string | null;
  gst_registered: string;
  credit_limit: number;
  credit_days: number;
  payment_terms: string | null;
  currency: string;
  tds_applicable: boolean;
  tds_section: string | null;
  supplier_ledger_name: string | null;
  ledger_group: string;
  account_holder_name: string | null;
  bank_name: string | null;
  branch_name: string | null;
  account_no: string | null;
  ifsc: string | null;
  upi_id: string | null;
  default_gst_type: string | null;
  price_list: string | null;
  purchase_discount: number;
  freight_applicable: boolean;
  transporter_name: string | null;
  preferred_supplier: boolean;
  remarks: string | null;
  internal_notes: string | null;
  tags: string[] | null;
  created_by: string | null;
  updated_at: string;
}

export interface SupplierAttachment {
  id: string;
  supplier_id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  created_at: string;
}

export interface SupplierLedgerEntry {
  id: string;
  supplier_id: string;
  entry_date: string;
  reference_type: string | null;
  reference_id: string | null;
  debit: number;
  credit: number;
  balance: number;
  narration: string | null;
  created_at: string;
}

export interface SalesOrderItem {
  id: string;
  sales_order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total: number;
  products?: Product;
}

export interface SalesOrder {
  id: string;
  order_number: string;
  customer_id: string | null;
  order_date: string;
  status: 'draft' | 'confirmed' | 'completed' | 'cancelled';
  subtotal: number;
  discount: number;
  total: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  customers?: Customer;
  sales_order_items?: SalesOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total: number;
  products?: Product;
}

export interface PurchaseOrder {
  id: string;
  order_number: string;
  supplier_id: string | null;
  order_date: string;
  status: 'draft' | 'confirmed' | 'received' | 'cancelled';
  subtotal: number;
  discount: number;
  total: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  suppliers?: Supplier;
  purchase_order_items?: PurchaseOrderItem[];
}

export interface StockTransferItem {
  id: string;
  transfer_id: string;
  product_id: string;
  quantity: number;
  products?: Product;
}

export interface StockTransfer {
  id: string;
  transfer_number: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  transfer_date: string;
  status: 'draft' | 'completed' | 'cancelled';
  notes: string | null;
  created_by: string | null;
  created_at: string;
  from_warehouse?: Warehouse;
  to_warehouse?: Warehouse;
  stock_transfer_items?: StockTransferItem[];
}

export interface DamageRecord {
  id: string;
  record_number: string;
  product_id: string;
  warehouse_id: string | null;
  quantity: number;
  reason: string | null;
  damage_date: string;
  status: 'reported' | 'written_off';
  created_by: string | null;
  created_at: string;
  products?: Product;
  warehouses?: Warehouse;
}

export interface SalesReturnItem {
  id: string;
  sales_return_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total: number;
  products?: Product;
}

export interface SalesReturn {
  id: string;
  return_number: string;
  sales_order_id: string | null;
  customer_id: string | null;
  return_date: string;
  total: number;
  reason: string | null;
  status: 'draft' | 'completed' | 'cancelled';
  created_by: string | null;
  created_at: string;
  customers?: Customer;
  sales_orders?: SalesOrder;
}

export interface PurchaseReturnItem {
  id: string;
  purchase_return_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total: number;
  products?: Product;
}

export interface PurchaseReturn {
  id: string;
  return_number: string;
  purchase_order_id: string | null;
  supplier_id: string | null;
  return_date: string;
  total: number;
  reason: string | null;
  status: 'draft' | 'completed' | 'cancelled';
  created_by: string | null;
  created_at: string;
  suppliers?: Supplier;
  purchase_orders?: PurchaseOrder;
}

export interface Account {
  id: string;
  code: string;
  name: string;
  account_type: AccountType;
  parent_id: string | null;
  description: string | null;
  is_active: boolean;
  opening_balance: number;
  created_at: string;
}

export interface VoucherItem {
  id: string;
  voucher_id: string;
  account_id: string;
  debit: number;
  credit: number;
  description: string | null;
  accounts?: Account;
}

export interface Voucher {
  id: string;
  voucher_number: string;
  voucher_type: VoucherType;
  voucher_date: string;
  reference: string | null;
  narration: string | null;
  total_amount: number;
  status: 'draft' | 'posted' | 'cancelled';
  created_by: string | null;
  created_at: string;
  updated_at: string;
  voucher_items?: VoucherItem[];
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Message {
  id: string;
  from_user_id: string;
  to_user_id: string;
  subject: string | null;
  body: string;
  is_read: boolean;
  created_at: string;
  from_profile?: Profile;
}

export interface PhysicalStockInventory {
  id: string;
  inventory_date: string;
  warehouse_id: string | null;
  product_id: string;
  system_qty: number;
  physical_qty: number;
  variance: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  products?: Product;
  warehouses?: Warehouse;
}

export interface ProformaInvoiceItem {
  id: string;
  proforma_id: string;
  product_id: string | null;
  item_code: string | null;
  item_name: string;
  qty: number;
  rate: number;
  gst_percent: number;
  gst_amount: number;
  amount: number;
  sort_order: number;
  products?: Product;
}

export interface ProformaInvoice {
  id: string;
  proforma_no: string;
  proforma_date: string;
  customer_id: string | null;
  subtotal: number;
  tax_amount: number;
  total: number;
  terms_conditions: string | null;
  notes: string | null;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'cancelled';
  created_by: string | null;
  created_at: string;
  updated_at: string;
  customers?: Customer;
  proforma_invoice_items?: ProformaInvoiceItem[];
}

export interface QuotationItem {
  id: string;
  quotation_id: string;
  product_id: string | null;
  item_code: string | null;
  item_name: string;
  qty: number;
  rate: number;
  discount_percent: number;
  discount_amount: number;
  gst_percent: number;
  gst_amount: number;
  amount: number;
  sort_order: number;
  products?: Product;
}

export interface Quotation {
  id: string;
  quotation_no: string;
  quotation_date: string;
  valid_until: string | null;
  customer_id: string | null;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  created_by: string | null;
  created_at: string;
  updated_at: string;
  customers?: Customer;
  quotation_items?: QuotationItem[];
}

export interface Department {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface DailyTaskItem {
  id?: string;
  report_id?: string;
  task_type: string;
  work_description: string;
  status: string;
  remarks?: string | null;
  sort_order?: number;
}

export interface PendingTaskItem {
  id?: string;
  report_id?: string;
  task_type: string;
  work_description: string;
  status: string;
  expected_completion?: string | null;
  sort_order?: number;
}

export interface DailyTaskReport {
  id: string;
  user_id: string;
  department_id: string | null;
  employee_name: string;
  designation: string | null;
  report_date: string;
  issues_requirements: string | null;
  plan_for_tomorrow: string | null;
  status: 'draft' | 'submitted';
  created_at: string;
  updated_at: string;
  departments?: Department | null;
  daily_task_items?: DailyTaskItem[];
  pending_task_items?: PendingTaskItem[];
}

// ── UOM Master ───────────────────────────────────────────────
export interface UomMaster {
  id: string;
  name: string;
  code: string | null;
  uqc_code: string | null;
  decimal_precision: number;
  is_active: boolean;
  created_at: string;
}

// ── Item UOM Mapping ─────────────────────────────────────────
export interface ItemUomMapping {
  id: string;
  item_id: string;
  uom_id: string;
  is_base_uom: boolean;
  conversion_factor: number;
  purchase_allowed: boolean;
  sales_allowed: boolean;
  default_purchase_uom: boolean;
  default_sales_uom: boolean;
  created_at: string;
  // joined
  uom_name?: string;
  uom_code?: string;
}

// ── Voucher Ledger Mapping ───────────────────────────────────
export interface VoucherLedgerMapping {
  id: string;
  transaction_type: string;
  ledger_key: string;
  account_id: string;
  company_id: string | null;
  is_active: boolean;
  created_at: string;
  accounts?: Account;
}

// ── Purchase Voucher ─────────────────────────────────────────
export interface PurchaseVoucher {
  id: string;
  voucher_no: string;
  voucher_date: string;
  company_id: string | null;
  warehouse_id: string | null;
  voucher_type: string;
  financial_year: string | null;
  purchase_type: string | null;
  reference_no: string | null;
  reference_date: string | null;

  supplier_id: string;
  supplier_invoice_no: string | null;
  supplier_invoice_date: string | null;
  place_of_supply: string | null;
  gst_registration_type: string | null;
  purchase_ledger_id: string | null;
  payment_terms: string | null;
  credit_days: number;
  due_date: string | null;

  purchase_order_id: string | null;
  purchase_order_date: string | null;
  grn_no: string | null;
  grn_date: string | null;
  challan_no: string | null;
  challan_date: string | null;
  transporter: string | null;
  vehicle_no: string | null;
  lr_rr_no: string | null;
  lr_rr_date: string | null;
  eway_bill_no: string | null;
  eway_bill_date: string | null;

  gross_amount: number;
  item_discount_total: number;
  invoice_discount_percent: number;
  invoice_discount_amount: number;
  taxable_value: number;
  cgst_total: number;
  sgst_total: number;
  igst_total: number;
  cess_total: number;
  freight: number;
  freight_gst_percent: number;
  packing_forwarding: number;
  insurance: number;
  other_charges: number;
  round_off: number;
  grand_total: number;

  status: 'draft' | 'posted' | 'cancelled';
  narration: string | null;

  created_by: string | null;
  created_at: string;
  modified_by: string | null;
  modified_at: string | null;
  posted_by: string | null;
  posted_at: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;

  voucher_id: string | null;

  // joined
  companies?: Company;
  warehouses?: Warehouse;
  suppliers?: Supplier;
  purchase_voucher_items?: PurchaseVoucherItem[];
  voucher?: Voucher;
}

// ── Purchase Voucher Item ────────────────────────────────────
export interface PurchaseVoucherItem {
  id: string;
  purchase_voucher_id: string;
  sr_no: number;
  product_id: string;

  uom_id: string | null;
  conversion_factor: number;
  transaction_qty: number;
  transaction_uom: string | null;
  base_qty: number;
  base_uom: string | null;

  rate: number;
  rate_per: string | null;
  gross_amount: number;

  discount_percent: number;
  discount_amount: number;

  taxable_value: number;
  gst_percent: number;
  cgst_percent: number;
  cgst_amount: number;
  sgst_percent: number;
  sgst_amount: number;
  igst_percent: number;
  igst_amount: number;
  cess_percent: number;
  cess_amount: number;

  line_total: number;

  warehouse_id: string | null;
  location_code: string | null;
  batch_no: string | null;
  expiry_date: string | null;
  remarks: string | null;

  created_at: string;

  // joined
  products?: Product;
}

-- Extend products table with new fields
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS brand TEXT,
  ADD COLUMN IF NOT EXISTS sub_brand TEXT,
  ADD COLUMN IF NOT EXISTS group_name TEXT,
  ADD COLUMN IF NOT EXISTS sub_category TEXT,
  ADD COLUMN IF NOT EXISTS hsn_code TEXT,
  ADD COLUMN IF NOT EXISTS gst_percent NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS opening_stock NUMERIC(10,3) DEFAULT 0;

-- Extend company_settings with new fields
ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS mobile TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS gstin TEXT,
  ADD COLUMN IF NOT EXISTS pan TEXT,
  ADD COLUMN IF NOT EXISTS financial_year TEXT DEFAULT '2025-26';

-- Physical Stock Inventory table
CREATE TABLE IF NOT EXISTS physical_stock_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_date DATE NOT NULL DEFAULT CURRENT_DATE,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  system_qty NUMERIC(10,3) NOT NULL DEFAULT 0,
  physical_qty NUMERIC(10,3) NOT NULL DEFAULT 0,
  variance NUMERIC(10,3) GENERATED ALWAYS AS (physical_qty - system_qty) STORED,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE physical_stock_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage physical stock" ON physical_stock_inventory
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Proforma Invoices table
CREATE TABLE IF NOT EXISTS proforma_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proforma_no TEXT NOT NULL,
  proforma_date DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  terms_conditions TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','rejected','cancelled')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS proforma_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proforma_id UUID NOT NULL REFERENCES proforma_invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  item_code TEXT,
  item_name TEXT NOT NULL,
  qty NUMERIC(10,3) NOT NULL DEFAULT 1,
  rate NUMERIC(12,2) NOT NULL DEFAULT 0,
  gst_percent NUMERIC(5,2) DEFAULT 0,
  gst_amount NUMERIC(12,2) DEFAULT 0,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  sort_order INT DEFAULT 0
);

ALTER TABLE proforma_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage proforma invoices" ON proforma_invoices
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
ALTER TABLE proforma_invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage proforma invoice items" ON proforma_invoice_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Quotations table
CREATE TABLE IF NOT EXISTS quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_no TEXT NOT NULL,
  quotation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','rejected','expired')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  item_code TEXT,
  item_name TEXT NOT NULL,
  qty NUMERIC(10,3) NOT NULL DEFAULT 1,
  rate NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  gst_percent NUMERIC(5,2) DEFAULT 0,
  gst_amount NUMERIC(12,2) DEFAULT 0,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  sort_order INT DEFAULT 0
);

ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage quotations" ON quotations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage quotation items" ON quotation_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- 00011_purchase_voucher.sql
-- Purchase Voucher System + UOM Architecture
-- Part of MultistoreERP

-- ============================================================
-- 1. EXTEND UNITS TABLE (add UOM master fields)
-- ============================================================
ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS uqc_code text,
  ADD COLUMN IF NOT EXISTS decimal_precision integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Seed UOMs if table is empty
INSERT INTO public.units (name, code, uqc_code, decimal_precision, is_active)
SELECT * FROM (VALUES
  ('NOS', 'NOS', 'NOS', 0, true),
  ('PCS', 'PCS', 'PCS', 0, true),
  ('BOX', 'BOX', 'BOX', 0, true),
  ('PKT', 'PKT', 'PKT', 0, true),
  ('COIL', 'COIL', 'COIL', 0, true),
  ('MTR', 'MTR', 'MTR', 3, true),
  ('CM', 'CM', 'CMT', 2, true),
  ('KG', 'KG', 'KGM', 3, true),
  ('GRM', 'GRM', 'GRM', 2, true),
  ('LTR', 'LTR', 'LTR', 3, true),
  ('ML', 'ML', 'MLT', 2, true),
  ('DOZEN', 'DOZ', 'DOZ', 0, true),
  ('PAIR', 'PR', 'PR', 0, true),
  ('SHEET', 'SHT', 'SHT', 0, true),
  ('ROLL', 'ROL', 'ROL', 0, true)
) AS seed(name, code, uqc_code, decimal_precision, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.units LIMIT 1);

-- ============================================================
-- 2. ITEM UOM MAPPING
-- ============================================================
CREATE TABLE IF NOT EXISTS public.item_uom_mappings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  uom_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  is_base_uom boolean NOT NULL DEFAULT false,
  conversion_factor numeric(15,6) NOT NULL DEFAULT 1,
  purchase_allowed boolean NOT NULL DEFAULT true,
  sales_allowed boolean NOT NULL DEFAULT true,
  default_purchase_uom boolean NOT NULL DEFAULT false,
  default_sales_uom boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(item_id, uom_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_item_uom_mappings_item ON public.item_uom_mappings(item_id);
CREATE INDEX IF NOT EXISTS idx_item_uom_mappings_uom ON public.item_uom_mappings(uom_id);

-- RLS
ALTER TABLE public.item_uom_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON public.item_uom_mappings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Function: get item UOMs with base info
CREATE OR REPLACE FUNCTION public.get_item_uoms(p_item_id uuid)
RETURNS TABLE (
  id uuid,
  uom_id uuid,
  uom_name text,
  uom_code text,
  is_base_uom boolean,
  conversion_factor numeric,
  default_purchase_uom boolean,
  default_sales_uom boolean
) LANGUAGE sql STABLE AS $$
  SELECT
    ium.id,
    ium.uom_id,
    u.name,
    u.code,
    ium.is_base_uom,
    ium.conversion_factor,
    ium.default_purchase_uom,
    ium.default_sales_uom
  FROM public.item_uom_mappings ium
  JOIN public.units u ON u.id = ium.uom_id
  WHERE ium.item_id = p_item_id
  ORDER BY ium.is_base_uom DESC, u.name;
$$;

-- ============================================================
-- 3. PURCHASE VOUCHERS (HEADER)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.purchase_vouchers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  voucher_no text NOT NULL,
  voucher_date date NOT NULL DEFAULT CURRENT_DATE,
  company_id uuid REFERENCES public.companies(id),
  warehouse_id uuid REFERENCES public.warehouses(id),
  voucher_type text NOT NULL DEFAULT 'purchase',
  financial_year text,
  purchase_type text,
  reference_no text,
  reference_date date,

  -- supplier details
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id),
  supplier_invoice_no text,
  supplier_invoice_date date,
  place_of_supply text,
  gst_registration_type text,
  purchase_ledger_id uuid REFERENCES public.accounts(id),
  payment_terms text,
  credit_days integer NOT NULL DEFAULT 0,
  due_date date,

  -- reference details
  purchase_order_id uuid REFERENCES public.purchase_orders(id),
  purchase_order_date date,
  grn_no text,
  grn_date date,
  challan_no text,
  challan_date date,
  transporter text,
  vehicle_no text,
  lr_rr_no text,
  lr_rr_date date,
  eway_bill_no text,
  eway_bill_date date,

  -- financial totals
  gross_amount numeric(15,2) NOT NULL DEFAULT 0,
  item_discount_total numeric(15,2) NOT NULL DEFAULT 0,
  invoice_discount_percent numeric(5,2) DEFAULT 0,
  invoice_discount_amount numeric(15,2) DEFAULT 0,
  taxable_value numeric(15,2) NOT NULL DEFAULT 0,
  cgst_total numeric(15,2) NOT NULL DEFAULT 0,
  sgst_total numeric(15,2) NOT NULL DEFAULT 0,
  igst_total numeric(15,2) NOT NULL DEFAULT 0,
  cess_total numeric(15,2) NOT NULL DEFAULT 0,
  freight numeric(15,2) DEFAULT 0,
  freight_gst_percent numeric(5,2) DEFAULT 0,
  packing_forwarding numeric(15,2) DEFAULT 0,
  insurance numeric(15,2) DEFAULT 0,
  other_charges numeric(15,2) DEFAULT 0,
  round_off numeric(15,2) DEFAULT 0,
  grand_total numeric(15,2) NOT NULL DEFAULT 0,

  -- status & audit
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','posted','cancelled')),
  narration text,

  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  modified_by uuid REFERENCES public.profiles(id),
  modified_at timestamptz,
  posted_by uuid REFERENCES public.profiles(id),
  posted_at timestamptz,
  cancelled_by uuid REFERENCES public.profiles(id),
  cancelled_at timestamptz,

  -- accounting reference
  voucher_id uuid REFERENCES public.vouchers(id),

  UNIQUE(voucher_no)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pv_company ON public.purchase_vouchers(company_id);
CREATE INDEX IF NOT EXISTS idx_pv_supplier ON public.purchase_vouchers(supplier_id);
CREATE INDEX IF NOT EXISTS idx_pv_date ON public.purchase_vouchers(voucher_date);
CREATE INDEX IF NOT EXISTS idx_pv_status ON public.purchase_vouchers(status);

-- RLS
ALTER TABLE public.purchase_vouchers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON public.purchase_vouchers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 4. PURCHASE VOUCHER ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.purchase_voucher_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_voucher_id uuid NOT NULL REFERENCES public.purchase_vouchers(id) ON DELETE CASCADE,
  sr_no integer NOT NULL DEFAULT 0,
  product_id uuid NOT NULL REFERENCES public.products(id),

  -- uom details (snapshot at time of transaction)
  uom_id uuid REFERENCES public.units(id),
  conversion_factor numeric(15,6) NOT NULL DEFAULT 1,
  transaction_qty numeric(15,3) NOT NULL DEFAULT 0,
  transaction_uom text,
  base_qty numeric(15,3) NOT NULL DEFAULT 0,
  base_uom text,

  -- pricing
  rate numeric(15,2) NOT NULL DEFAULT 0,
  rate_per text,
  gross_amount numeric(15,2) NOT NULL DEFAULT 0,

  -- discount
  discount_percent numeric(5,2) DEFAULT 0,
  discount_amount numeric(15,2) DEFAULT 0,

  -- tax
  taxable_value numeric(15,2) NOT NULL DEFAULT 0,
  gst_percent numeric(5,2) DEFAULT 0,
  cgst_percent numeric(5,2) DEFAULT 0,
  cgst_amount numeric(15,2) DEFAULT 0,
  sgst_percent numeric(5,2) DEFAULT 0,
  sgst_amount numeric(15,2) DEFAULT 0,
  igst_percent numeric(5,2) DEFAULT 0,
  igst_amount numeric(15,2) DEFAULT 0,
  cess_percent numeric(5,2) DEFAULT 0,
  cess_amount numeric(15,2) DEFAULT 0,

  line_total numeric(15,2) NOT NULL DEFAULT 0,

  -- additional
  warehouse_id uuid REFERENCES public.warehouses(id),
  location_code text,
  batch_no text,
  expiry_date date,
  remarks text,

  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pvi_voucher ON public.purchase_voucher_items(purchase_voucher_id);
CREATE INDEX IF NOT EXISTS idx_pvi_product ON public.purchase_voucher_items(product_id);

-- RLS
ALTER TABLE public.purchase_voucher_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON public.purchase_voucher_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 5. VOUCHER LEDGER MAPPINGS (configurable accounting)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.voucher_ledger_mappings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_type text NOT NULL,
  ledger_key text NOT NULL,
  account_id uuid NOT NULL REFERENCES public.accounts(id),
  company_id uuid REFERENCES public.companies(id),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(transaction_type, ledger_key, company_id)
);

-- RLS
ALTER TABLE public.voucher_ledger_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON public.voucher_ledger_mappings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed default ledger mappings (these should be configured via UI)
-- Only insert if accounts exist and mappings table is empty
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.voucher_ledger_mappings LIMIT 1) THEN
    -- Purchase account
    INSERT INTO public.voucher_ledger_mappings (transaction_type, ledger_key, account_id)
    SELECT 'purchase', 'purchase_account', id FROM public.accounts
    WHERE name ILIKE '%purchase%' OR name ILIKE '%purchases%' LIMIT 1;

    -- Input CGST
    INSERT INTO public.voucher_ledger_mappings (transaction_type, ledger_key, account_id)
    SELECT 'purchase', 'input_cgst', id FROM public.accounts
    WHERE name ILIKE '%input cgst%' OR name ILIKE '%itc cgst%' LIMIT 1;

    -- Input SGST
    INSERT INTO public.voucher_ledger_mappings (transaction_type, ledger_key, account_id)
    SELECT 'purchase', 'input_sgst', id FROM public.accounts
    WHERE name ILIKE '%input sgst%' OR name ILIKE '%itc sgst%' LIMIT 1;

    -- Input IGST
    INSERT INTO public.voucher_ledger_mappings (transaction_type, ledger_key, account_id)
    SELECT 'purchase', 'input_igst', id FROM public.accounts
    WHERE name ILIKE '%input igst%' OR name ILIKE '%itc igst%' LIMIT 1;

    -- Sundry Creditors
    INSERT INTO public.voucher_ledger_mappings (transaction_type, ledger_key, account_id)
    SELECT 'purchase', 'sundry_creditors', id FROM public.accounts
    WHERE name ILIKE '%sundry creditors%' OR name ILIKE '%sundry creditor%' LIMIT 1;
  END IF;
END $$;

-- ============================================================
-- 6. FUNCTION: Generate purchase voucher number
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_purchase_voucher_no(p_company_id uuid, p_financial_year text)
RETURNS text LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_prefix text;
  v_next_no integer;
  v_result text;
BEGIN
  -- Get company code/prefix
  SELECT COALESCE(NULLIF(c.name, ''), 'C') INTO v_prefix
  FROM public.companies c WHERE c.id = p_company_id;

  v_prefix := upper(substr(regexp_replace(v_prefix, '[^a-zA-Z0-9]', '', 'g'), 1, 3));

  -- Count existing vouchers in this financial year
  SELECT COALESCE(COUNT(*) + 1, 1) INTO v_next_no
  FROM public.purchase_vouchers
  WHERE company_id = p_company_id
    AND financial_year = p_financial_year
    AND status != 'cancelled';

  v_result := 'PUR-' || v_prefix || '-' || p_financial_year || '-' || LPAD(v_next_no::text, 5, '0');
  RETURN v_result;
END;
$$;

-- ============================================================
-- 7. FUNCTION: Check duplicate supplier invoice
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_duplicate_supplier_invoice(
  p_company_id uuid,
  p_supplier_id uuid,
  p_supplier_invoice_no text,
  p_financial_year text,
  p_exclude_id uuid DEFAULT NULL
) RETURNS TABLE (
  is_duplicate boolean,
  existing_voucher_no text
) LANGUAGE sql STABLE AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.purchase_vouchers pv
      WHERE pv.company_id = p_company_id
        AND pv.supplier_id = p_supplier_id
        AND pv.supplier_invoice_no = p_supplier_invoice_no
        AND pv.financial_year = p_financial_year
        AND pv.status != 'cancelled'
        AND (p_exclude_id IS NULL OR pv.id != p_exclude_id)
    ) AS is_duplicate,
    (SELECT pv2.voucher_no FROM public.purchase_vouchers pv2
     WHERE pv2.company_id = p_company_id
       AND pv2.supplier_id = p_supplier_id
       AND pv2.supplier_invoice_no = p_supplier_invoice_no
       AND pv2.financial_year = p_financial_year
       AND pv2.status != 'cancelled'
       AND (p_exclude_id IS NULL OR pv2.id != p_exclude_id)
     LIMIT 1) AS existing_voucher_no;
$$;

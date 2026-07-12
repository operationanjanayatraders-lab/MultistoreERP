-- Supplier Master - Extended columns
-- Extend the existing suppliers table with full ERP fields

ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS supplier_code text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS print_name text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS contact_person text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS supplier_category text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS supplier_group text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS opening_balance numeric(15,2) NOT NULL DEFAULT 0;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS dr_cr text NOT NULL DEFAULT 'Dr';
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS alternate_mobile text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS telephone text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS billing_address text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS shipping_address text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS area text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS district text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS pincode text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS gstin text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS pan text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS tan text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS aadhaar_no text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS msme_no text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS gst_registered text NOT NULL DEFAULT 'No';
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS credit_limit numeric(15,2) NOT NULL DEFAULT 0;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS credit_days integer NOT NULL DEFAULT 0;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS payment_terms text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'INR';
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS tds_applicable boolean NOT NULL DEFAULT false;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS tds_section text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS supplier_ledger_name text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS ledger_group text NOT NULL DEFAULT 'Sundry Creditors';
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS account_holder_name text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS branch_name text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS account_no text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS ifsc text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS upi_id text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS default_gst_type text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS price_list text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS purchase_discount numeric(5,2) NOT NULL DEFAULT 0;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS freight_applicable boolean NOT NULL DEFAULT false;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS transporter_name text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS preferred_supplier boolean NOT NULL DEFAULT false;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS remarks text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS internal_notes text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS tags text[];
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id);
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Supplier attachments table
CREATE TABLE IF NOT EXISTS public.supplier_attachments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Supplier ledger entries (payable tracking)
CREATE TABLE IF NOT EXISTS public.supplier_ledger (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  reference_type text,
  reference_id uuid,
  debit numeric(15,2) NOT NULL DEFAULT 0,
  credit numeric(15,2) NOT NULL DEFAULT 0,
  balance numeric(15,2) NOT NULL DEFAULT 0,
  narration text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.supplier_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_ledger ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated full access" ON public.supplier_attachments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON public.supplier_ledger FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Index for duplicate checks
CREATE INDEX IF NOT EXISTS idx_suppliers_gstin ON public.suppliers(gstin);
CREATE INDEX IF NOT EXISTS idx_suppliers_pan ON public.suppliers(pan);
CREATE INDEX IF NOT EXISTS idx_suppliers_phone ON public.suppliers(phone);
CREATE INDEX IF NOT EXISTS idx_suppliers_supplier_code ON public.suppliers(supplier_code);
CREATE INDEX IF NOT EXISTS idx_supplier_attachments_supplier ON public.supplier_attachments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_ledger_supplier ON public.supplier_ledger(supplier_id);


-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User roles
CREATE TYPE public.user_role AS ENUM ('user', 'admin');

-- Profiles table (synced with auth.users)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  phone text,
  full_name text,
  designation text,
  role public.user_role NOT NULL DEFAULT 'user',
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-sync new users to profiles
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, phone, role)
  VALUES (NEW.id, NEW.email, NEW.phone, 'user'::public.user_role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Helper function to get user role (prevents RLS recursion)
CREATE OR REPLACE FUNCTION get_user_role(uid uuid)
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = uid;
$$;

-- Company settings table
CREATE TABLE public.company_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name text NOT NULL DEFAULT 'My Company',
  tagline text DEFAULT '',
  logo_url text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Insert default settings
INSERT INTO public.company_settings (company_name, tagline) VALUES ('ERP System', 'Manage Your Business Efficiently');

-- Warehouses / Locations
CREATE TABLE public.warehouses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  location text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.warehouses (name, location) VALUES
  ('Main Warehouse', 'Head Office'),
  ('Secondary Warehouse', 'Branch Office');

-- Product categories
CREATE TABLE public.product_categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.product_categories (name, description) VALUES
  ('Electronics', 'Electronic devices and components'),
  ('Office Supplies', 'Stationery and office materials'),
  ('Raw Materials', 'Manufacturing inputs'),
  ('Finished Goods', 'Ready-to-sell products');

-- Products table
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  sku text UNIQUE NOT NULL,
  barcode text,
  category_id uuid REFERENCES public.product_categories(id),
  description text,
  unit text NOT NULL DEFAULT 'pcs',
  purchase_price numeric(15,2) NOT NULL DEFAULT 0,
  selling_price numeric(15,2) NOT NULL DEFAULT 0,
  reorder_level integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Inventory (stock per product per warehouse)
CREATE TABLE public.inventory (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, warehouse_id)
);

-- Transaction types
CREATE TABLE public.transaction_types (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  description text,
  affects_stock text CHECK (affects_stock IN ('increase','decrease','none')) NOT NULL DEFAULT 'none',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.transaction_types (name, code, affects_stock) VALUES
  ('Sales Invoice', 'SALE', 'decrease'),
  ('Purchase Order', 'PUR', 'increase'),
  ('Sales Return', 'SR', 'increase'),
  ('Purchase Return', 'PR', 'decrease'),
  ('Stock Transfer', 'ST', 'none'),
  ('Damage Write-off', 'DMG', 'decrease');

-- Customers
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  email text,
  phone text,
  address text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.customers (name, email, phone) VALUES
  ('General Customer', 'general@example.com', '+1000000001'),
  ('Walk-in Customer', 'walkin@example.com', '+1000000002');

-- Suppliers
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  email text,
  phone text,
  address text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.suppliers (name, email, phone) VALUES
  ('Default Supplier', 'supplier@example.com', '+2000000001');

-- Sales orders
CREATE TABLE public.sales_orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number text UNIQUE NOT NULL,
  customer_id uuid REFERENCES public.customers(id),
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  status text CHECK (status IN ('draft','confirmed','completed','cancelled')) NOT NULL DEFAULT 'draft',
  subtotal numeric(15,2) NOT NULL DEFAULT 0,
  discount numeric(15,2) NOT NULL DEFAULT 0,
  total numeric(15,2) NOT NULL DEFAULT 0,
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Sales order items
CREATE TABLE public.sales_order_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sales_order_id uuid NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(15,2) NOT NULL DEFAULT 0,
  total numeric(15,2) NOT NULL DEFAULT 0
);

-- Purchase orders
CREATE TABLE public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number text UNIQUE NOT NULL,
  supplier_id uuid REFERENCES public.suppliers(id),
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  status text CHECK (status IN ('draft','confirmed','received','cancelled')) NOT NULL DEFAULT 'draft',
  subtotal numeric(15,2) NOT NULL DEFAULT 0,
  discount numeric(15,2) NOT NULL DEFAULT 0,
  total numeric(15,2) NOT NULL DEFAULT 0,
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Purchase order items
CREATE TABLE public.purchase_order_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(15,2) NOT NULL DEFAULT 0,
  total numeric(15,2) NOT NULL DEFAULT 0
);

-- Inter stock transfers
CREATE TABLE public.stock_transfers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_number text UNIQUE NOT NULL,
  from_warehouse_id uuid NOT NULL REFERENCES public.warehouses(id),
  to_warehouse_id uuid NOT NULL REFERENCES public.warehouses(id),
  transfer_date date NOT NULL DEFAULT CURRENT_DATE,
  status text CHECK (status IN ('draft','completed','cancelled')) NOT NULL DEFAULT 'draft',
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Stock transfer items
CREATE TABLE public.stock_transfer_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_id uuid NOT NULL REFERENCES public.stock_transfers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity integer NOT NULL DEFAULT 1
);

-- Damage & defect records
CREATE TABLE public.damage_records (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  record_number text UNIQUE NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id),
  warehouse_id uuid REFERENCES public.warehouses(id),
  quantity integer NOT NULL DEFAULT 1,
  reason text,
  damage_date date NOT NULL DEFAULT CURRENT_DATE,
  status text CHECK (status IN ('reported','written_off')) NOT NULL DEFAULT 'reported',
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Sales returns
CREATE TABLE public.sales_returns (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_number text UNIQUE NOT NULL,
  sales_order_id uuid REFERENCES public.sales_orders(id),
  customer_id uuid REFERENCES public.customers(id),
  return_date date NOT NULL DEFAULT CURRENT_DATE,
  total numeric(15,2) NOT NULL DEFAULT 0,
  reason text,
  status text CHECK (status IN ('draft','completed','cancelled')) NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Sales return items
CREATE TABLE public.sales_return_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sales_return_id uuid NOT NULL REFERENCES public.sales_returns(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(15,2) NOT NULL DEFAULT 0,
  total numeric(15,2) NOT NULL DEFAULT 0
);

-- Purchase returns
CREATE TABLE public.purchase_returns (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_number text UNIQUE NOT NULL,
  purchase_order_id uuid REFERENCES public.purchase_orders(id),
  supplier_id uuid REFERENCES public.suppliers(id),
  return_date date NOT NULL DEFAULT CURRENT_DATE,
  total numeric(15,2) NOT NULL DEFAULT 0,
  reason text,
  status text CHECK (status IN ('draft','completed','cancelled')) NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Purchase return items
CREATE TABLE public.purchase_return_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_return_id uuid NOT NULL REFERENCES public.purchase_returns(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(15,2) NOT NULL DEFAULT 0,
  total numeric(15,2) NOT NULL DEFAULT 0
);

-- Chart of accounts
CREATE TYPE public.account_type AS ENUM ('asset','liability','equity','income','expense');

CREATE TABLE public.accounts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  account_type public.account_type NOT NULL,
  parent_id uuid REFERENCES public.accounts(id),
  description text,
  is_active boolean NOT NULL DEFAULT true,
  opening_balance numeric(15,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed default chart of accounts
INSERT INTO public.accounts (code, name, account_type) VALUES
  ('1000', 'Assets', 'asset'),
  ('1100', 'Cash and Bank', 'asset'),
  ('1101', 'Cash in Hand', 'asset'),
  ('1102', 'Bank Account', 'asset'),
  ('1200', 'Accounts Receivable', 'asset'),
  ('1300', 'Inventory', 'asset'),
  ('2000', 'Liabilities', 'liability'),
  ('2100', 'Accounts Payable', 'liability'),
  ('2200', 'Short-term Loans', 'liability'),
  ('3000', 'Equity', 'equity'),
  ('3100', 'Owner Capital', 'equity'),
  ('3200', 'Retained Earnings', 'equity'),
  ('4000', 'Income', 'income'),
  ('4100', 'Sales Revenue', 'income'),
  ('4200', 'Other Income', 'income'),
  ('5000', 'Expenses', 'expense'),
  ('5100', 'Cost of Goods Sold', 'expense'),
  ('5200', 'Operating Expenses', 'expense'),
  ('5300', 'Salaries & Wages', 'expense');

-- Voucher types
CREATE TYPE public.voucher_type AS ENUM ('journal','payment','receipt','contra','debit_note','credit_note');

-- Vouchers
CREATE TABLE public.vouchers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  voucher_number text UNIQUE NOT NULL,
  voucher_type public.voucher_type NOT NULL,
  voucher_date date NOT NULL DEFAULT CURRENT_DATE,
  reference text,
  narration text,
  total_amount numeric(15,2) NOT NULL DEFAULT 0,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Voucher line items (double-entry)
CREATE TABLE public.voucher_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  voucher_id uuid NOT NULL REFERENCES public.vouchers(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.accounts(id),
  debit numeric(15,2) NOT NULL DEFAULT 0,
  credit numeric(15,2) NOT NULL DEFAULT 0,
  description text
);

-- Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Messages
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id uuid REFERENCES public.profiles(id),
  to_user_id uuid REFERENCES public.profiles(id),
  subject text,
  body text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Storage bucket for company assets
INSERT INTO storage.buckets (id, name, public) VALUES ('company-assets', 'company-assets', true);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.damage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Admins have full access to profiles" ON profiles
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin'::user_role);

CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id)
  WITH CHECK (role IS NOT DISTINCT FROM get_user_role(auth.uid()));

-- Company settings: all authenticated users can read; admins can write
CREATE POLICY "Authenticated users can read company settings" ON company_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can update company settings" ON company_settings
  FOR UPDATE TO authenticated USING (get_user_role(auth.uid()) = 'admin'::user_role);
CREATE POLICY "Admins can insert company settings" ON company_settings
  FOR INSERT TO authenticated WITH CHECK (get_user_role(auth.uid()) = 'admin'::user_role);

-- Generic authenticated access for all operational tables
CREATE POLICY "Authenticated full access" ON warehouses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON product_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON transaction_types FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON sales_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON sales_order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON purchase_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON purchase_order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON stock_transfers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON stock_transfer_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON damage_records FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON sales_returns FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON sales_return_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON purchase_returns FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON purchase_return_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON vouchers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON voucher_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Notifications: users see their own
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Authenticated can insert notifications" ON notifications
  FOR INSERT TO authenticated WITH CHECK (true);

-- Messages: users see their own
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT TO authenticated USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
CREATE POLICY "Users can insert messages" ON messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "Users can update own messages" ON messages
  FOR UPDATE TO authenticated USING (auth.uid() = to_user_id);

-- Storage policy for company-assets
CREATE POLICY "Authenticated can upload company assets" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'company-assets');
CREATE POLICY "Public can view company assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'company-assets');
CREATE POLICY "Authenticated can update company assets" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'company-assets');
CREATE POLICY "Authenticated can delete company assets" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'company-assets');

-- Public profiles view
CREATE VIEW public_profiles AS
  SELECT id, full_name, designation, role FROM profiles;

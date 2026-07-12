-- Branches and Warehouses management

-- Drop existing if recreating
DROP TABLE IF EXISTS public.branches CASCADE;

-- Branches table
CREATE TABLE public.branches (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id text UNIQUE,
  name text NOT NULL,
  contact_person text,
  contact_number text,
  location text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Warehouses table (fresh)
DROP TABLE IF EXISTS public.warehouses CASCADE;

CREATE TABLE public.warehouses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  warehouse_id text UNIQUE,
  name text NOT NULL,
  location text,
  contact_person text,
  contact_number text,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed default branches
INSERT INTO public.branches (branch_id, name, location) VALUES
  ('HO', 'Head Office', 'Main Location'),
  ('BR1', 'Branch 1', 'Branch Location 1'),
  ('BR2', 'Branch 2', 'Branch Location 2'),
  ('BR3', 'Branch 3', 'Branch Location 3'),
  ('BR4', 'Branch 4', 'Branch Location 4')
ON CONFLICT DO NOTHING;

-- Seed default warehouses linked to branches
INSERT INTO public.warehouses (warehouse_id, name, branch_id, location) VALUES
  ('WH-HO-01', 'Main Warehouse', (SELECT id FROM public.branches WHERE branch_id = 'HO'), 'Head Office'),
  ('WH-BR1-01', 'Branch 1 Warehouse', (SELECT id FROM public.branches WHERE branch_id = 'BR1'), 'Branch 1')
ON CONFLICT DO NOTHING;

-- Recreate inventory table with warehouse FK
DROP TABLE IF EXISTS public.inventory_transactions CASCADE;

CREATE TABLE public.inventory_transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id),
  product_id uuid NOT NULL REFERENCES public.products(id),
  transaction_type text NOT NULL CHECK (transaction_type IN (
    'OPENING', 'PURCHASE', 'SALE', 'TRANSFER_IN', 'TRANSFER_OUT',
    'PURCHASE_RETURN', 'SALES_RETURN', 'ADJUSTMENT', 'DAMAGE'
  )),
  quantity numeric(15,3) NOT NULL DEFAULT 0,
  unit_price numeric(15,2) DEFAULT 0,
  reference_no text,
  reference_id uuid,
  remarks text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inv_trans_date ON public.inventory_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_inv_trans_product ON public.inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inv_trans_warehouse ON public.inventory_transactions(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inv_trans_type ON public.inventory_transactions(transaction_type);

-- Recreate inventory table
DROP TABLE IF EXISTS public.inventory CASCADE;

CREATE TABLE public.inventory (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  quantity numeric(15,3) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, warehouse_id)
);

-- Enable RLS
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated full access" ON public.branches FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON public.warehouses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON public.inventory_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON public.inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);

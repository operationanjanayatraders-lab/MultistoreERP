-- Inventory Enhancements: Companies, Product Locations, Hierarchy

-- Companies table
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON public.companies FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed default company
INSERT INTO public.companies (name) VALUES ('Default Company')
ON CONFLICT DO NOTHING;

-- Add company_id to branches
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;

-- Set default company for existing branches
UPDATE public.branches SET company_id = (SELECT id FROM public.companies LIMIT 1) WHERE company_id IS NULL;

-- Add company_id to warehouses (direct company warehouse, not through branch)
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;

-- Product physical locations
CREATE TABLE IF NOT EXISTS public.product_locations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  location_code text NOT NULL,
  quantity numeric(15,3) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, warehouse_id, location_code)
);

ALTER TABLE public.product_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON public.product_locations FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_product_locations_product ON public.product_locations(product_id);
CREATE INDEX IF NOT EXISTS idx_product_locations_warehouse ON public.product_locations(warehouse_id);

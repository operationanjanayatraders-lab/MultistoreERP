-- Item Master Enhancements: units, brands_master, sub_brands, groups tables

-- Units table
CREATE TABLE IF NOT EXISTS public.units (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON public.units FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed default units
INSERT INTO public.units (name) VALUES
  ('pcs'), ('kg'), ('ltr'), ('box'), ('set'), ('mtr'), ('dozen'), ('pair')
ON CONFLICT (name) DO NOTHING;

-- Brands master table
CREATE TABLE IF NOT EXISTS public.brands_master (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.brands_master ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON public.brands_master FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Sub brands table
CREATE TABLE IF NOT EXISTS public.sub_brands (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  brand_id uuid REFERENCES public.brands_master(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sub_brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON public.sub_brands FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Groups table
CREATE TABLE IF NOT EXISTS public.groups (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON public.groups FOR ALL TO authenticated USING (true) WITH CHECK (true);

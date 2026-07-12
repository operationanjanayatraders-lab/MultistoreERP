
-- Add permissions column to profiles if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '{}'::jsonb;

-- Add status column to vouchers if not exists  
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'cancelled'));

-- Create designations table
CREATE TABLE IF NOT EXISTS designations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE designations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'designations' AND policyname = 'Admins manage designations'
  ) THEN
    CREATE POLICY "Admins manage designations" ON designations
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'designations' AND policyname = 'Authenticated can read designations'
  ) THEN
    CREATE POLICY "Authenticated can read designations" ON designations
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- Seed default designations
INSERT INTO designations (name) VALUES
  ('Manager'), ('Accountant'), ('Sales Executive'), ('Purchase Officer'), ('Store Keeper')
ON CONFLICT (name) DO NOTHING;

-- Inventory Transactions for stock movement tracking
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

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_inv_trans_date ON public.inventory_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_inv_trans_product ON public.inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inv_trans_warehouse ON public.inventory_transactions(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inv_trans_type ON public.inventory_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_inv_trans_ref ON public.inventory_transactions(reference_no);

-- Enable RLS
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policy
CREATE POLICY "Authenticated full access" ON public.inventory_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed OPENING transactions from current inventory (for demo / migration)
INSERT INTO public.inventory_transactions (transaction_date, warehouse_id, product_id, transaction_type, quantity, unit_price, remarks)
SELECT
  CURRENT_DATE,
  i.warehouse_id,
  i.product_id,
  'OPENING',
  i.quantity,
  COALESCE(p.purchase_price, 0),
  'Opening stock from migration'
FROM public.inventory i
JOIN public.products p ON p.id = i.product_id
WHERE i.quantity > 0
ON CONFLICT DO NOTHING;

-- Add branch_id to warehouses if not exists
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS branch_id uuid;
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS code text;

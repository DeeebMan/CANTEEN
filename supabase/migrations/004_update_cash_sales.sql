DROP TABLE IF EXISTS cash_sales;

CREATE TABLE cash_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  purchase_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  selling_price_per_piece NUMERIC(10,2) NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cash_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access to cash_sales" ON cash_sales FOR ALL TO authenticated USING (true) WITH CHECK (true);

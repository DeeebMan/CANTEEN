-- 1. Create months table
CREATE TABLE months (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE months ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users full access to months"
  ON months FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Insert default month for existing data
INSERT INTO months (id, name, is_current)
VALUES ('00000000-0000-0000-0000-000000000001', 'البيانات السابقة', TRUE);

-- 4. Add month_id to suppliers
ALTER TABLE suppliers
  ADD COLUMN month_id UUID REFERENCES months(id) ON DELETE CASCADE
  DEFAULT '00000000-0000-0000-0000-000000000001';
UPDATE suppliers SET month_id = '00000000-0000-0000-0000-000000000001' WHERE month_id IS NULL;
ALTER TABLE suppliers ALTER COLUMN month_id SET NOT NULL;

-- 5. Add month_id to invoices
ALTER TABLE invoices
  ADD COLUMN month_id UUID REFERENCES months(id) ON DELETE CASCADE
  DEFAULT '00000000-0000-0000-0000-000000000001';
UPDATE invoices SET month_id = '00000000-0000-0000-0000-000000000001' WHERE month_id IS NULL;
ALTER TABLE invoices ALTER COLUMN month_id SET NOT NULL;

-- 6. Add month_id to cash_sales
ALTER TABLE cash_sales
  ADD COLUMN month_id UUID REFERENCES months(id) ON DELETE CASCADE
  DEFAULT '00000000-0000-0000-0000-000000000001';
UPDATE cash_sales SET month_id = '00000000-0000-0000-0000-000000000001' WHERE month_id IS NULL;
ALTER TABLE cash_sales ALTER COLUMN month_id SET NOT NULL;

-- 7. Add month_id to carried_goods
ALTER TABLE carried_goods
  ADD COLUMN month_id UUID REFERENCES months(id) ON DELETE CASCADE
  DEFAULT '00000000-0000-0000-0000-000000000001';
UPDATE carried_goods SET month_id = '00000000-0000-0000-0000-000000000001' WHERE month_id IS NULL;
ALTER TABLE carried_goods ALTER COLUMN month_id SET NOT NULL;

-- 8. Add month_id to expenses
ALTER TABLE expenses
  ADD COLUMN month_id UUID REFERENCES months(id) ON DELETE CASCADE
  DEFAULT '00000000-0000-0000-0000-000000000001';
UPDATE expenses SET month_id = '00000000-0000-0000-0000-000000000001' WHERE month_id IS NULL;
ALTER TABLE expenses ALTER COLUMN month_id SET NOT NULL;

-- 9. Remove DEFAULT so new inserts must provide month_id
ALTER TABLE suppliers ALTER COLUMN month_id DROP DEFAULT;
ALTER TABLE invoices ALTER COLUMN month_id DROP DEFAULT;
ALTER TABLE cash_sales ALTER COLUMN month_id DROP DEFAULT;
ALTER TABLE carried_goods ALTER COLUMN month_id DROP DEFAULT;
ALTER TABLE expenses ALTER COLUMN month_id DROP DEFAULT;

-- 10. Indexes for fast filtering
CREATE INDEX idx_suppliers_month_id ON suppliers(month_id);
CREATE INDEX idx_invoices_month_id ON invoices(month_id);
CREATE INDEX idx_cash_sales_month_id ON cash_sales(month_id);
CREATE INDEX idx_carried_goods_month_id ON carried_goods(month_id);
CREATE INDEX idx_expenses_month_id ON expenses(month_id);

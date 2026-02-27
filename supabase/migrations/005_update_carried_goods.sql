-- تعديل جدول البضاعة المرحلة ليشمل أصناف بالتفصيل
-- حذف الجدول القديم وإنشاء جدول جديد

DROP TABLE IF EXISTS carried_goods;

CREATE TABLE carried_goods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  selling_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- تفعيل RLS
ALTER TABLE carried_goods ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة والكتابة
CREATE POLICY "Allow all for authenticated users" ON carried_goods
  FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE invoice_items RENAME COLUMN quantity TO quantity_per_carton;
ALTER TABLE invoice_items ADD COLUMN cartons_count NUMERIC(10,2) NOT NULL DEFAULT 1;
ALTER TABLE invoice_items RENAME COLUMN purchase_price TO total_purchase_price;
ALTER TABLE invoice_items RENAME COLUMN selling_price TO selling_price_per_piece;

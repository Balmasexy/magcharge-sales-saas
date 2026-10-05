CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  payment_method VARCHAR(40) NOT NULL DEFAULT 'cash',
  payment_status VARCHAR(30) NOT NULL DEFAULT 'paid',
  status VARCHAR(30) NOT NULL DEFAULT 'completed',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0),
  total NUMERIC(14,2) NOT NULL CHECK (total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sales_customer_idx
  ON sales(customer_id);

CREATE INDEX IF NOT EXISTS sales_created_by_idx
  ON sales(created_by);

CREATE INDEX IF NOT EXISTS sales_created_at_idx
  ON sales(created_at DESC);

CREATE INDEX IF NOT EXISTS sale_items_sale_idx
  ON sale_items(sale_id);

CREATE INDEX IF NOT EXISTS sale_items_product_idx
  ON sale_items(product_id);

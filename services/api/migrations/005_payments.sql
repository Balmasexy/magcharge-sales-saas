CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  sale_id UUID NOT NULL
    REFERENCES sales(id) ON DELETE RESTRICT,

  customer_id UUID
    REFERENCES customers(id) ON DELETE SET NULL,

  amount NUMERIC(14,2) NOT NULL
    CHECK (amount > 0),

  payment_method VARCHAR(40) NOT NULL DEFAULT 'cash',

  status VARCHAR(30) NOT NULL DEFAULT 'completed',

  reference VARCHAR(120),

  notes TEXT,

  received_by UUID NOT NULL
    REFERENCES users(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payments_sale_idx
  ON payments(sale_id);

CREATE INDEX IF NOT EXISTS payments_customer_idx
  ON payments(customer_id);

CREATE INDEX IF NOT EXISTS payments_received_by_idx
  ON payments(received_by);

CREATE INDEX IF NOT EXISTS payments_created_at_idx
  ON payments(created_at DESC);

CREATE INDEX IF NOT EXISTS payments_reference_idx
  ON payments(reference);

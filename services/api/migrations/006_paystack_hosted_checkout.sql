BEGIN;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS provider VARCHAR(40),
  ADD COLUMN IF NOT EXISTS environment VARCHAR(10),
  ADD COLUMN IF NOT EXISTS checkout_url TEXT,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payments_environment_check'
      AND conrelid = 'payments'::regclass
  ) THEN
    ALTER TABLE payments
      ADD CONSTRAINT payments_environment_check
      CHECK (environment IS NULL OR environment IN ('test', 'live'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS payments_paystack_reference_uq
  ON payments(reference)
  WHERE payment_method = 'paystack' AND reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS payments_paystack_status_created_idx
  ON payments(status, created_at DESC)
  WHERE payment_method = 'paystack';

COMMIT;

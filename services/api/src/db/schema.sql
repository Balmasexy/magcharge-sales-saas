CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(160) NOT NULL,
  role VARCHAR(40) NOT NULL DEFAULT 'sales',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) NOT NULL UNIQUE,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role VARCHAR(40) NOT NULL,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role, permission_id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(120) NOT NULL,
  resource VARCHAR(120),
  resource_id VARCHAR(120),
  metadata JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id
  ON sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_expires_at
  ON sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
  ON audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON audit_logs(created_at);

INSERT INTO permissions (code, description) VALUES
  ('sales.read', 'View sales'),
  ('sales.write', 'Create and modify sales'),
  ('inventory.read', 'View inventory'),
  ('inventory.write', 'Manage inventory'),
  ('customers.read', 'View customers'),
  ('customers.write', 'Manage customers'),
  ('orders.read', 'View orders'),
  ('orders.write', 'Manage orders'),
  ('payments.read', 'View payments'),
  ('payments.write', 'Manage payments'),
  ('dealers.read', 'View dealers'),
  ('dealers.write', 'Manage dealers'),
  ('warranty.read', 'View warranty and RMA records'),
  ('warranty.write', 'Manage warranty and RMA records'),
  ('analytics.read', 'View analytics'),
  ('admin.manage', 'Manage system administration'),
  ('ai.use', 'Use approved AI tools')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role, permission_id)
SELECT 'super_admin', id FROM permissions
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', id FROM permissions
WHERE code <> 'admin.manage'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_id)
SELECT 'sales', id FROM permissions
WHERE code IN (
  'sales.read',
  'sales.write',
  'customers.read',
  'customers.write',
  'orders.read',
  'orders.write',
  'payments.read',
  'payments.write',
  'inventory.read',
  'ai.use'
)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_id)
SELECT 'inventory', id FROM permissions
WHERE code IN (
  'inventory.read',
  'inventory.write',
  'orders.read',
  'ai.use'
)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_id)
SELECT 'dealer', id FROM permissions
WHERE code IN (
  'sales.read',
  'orders.read',
  'customers.read',
  'ai.use'
)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_id)
SELECT 'support', id FROM permissions
WHERE code IN (
  'customers.read',
  'orders.read',
  'warranty.read',
  'warranty.write',
  'ai.use'
)
ON CONFLICT DO NOTHING;

import { sql } from "../db/client.js";
import {
  createAccessToken,
  hashPassword,
  hashToken,
  verifyAccessToken,
  verifyPassword,
} from "./security.js";

export async function findUserByEmail(email) {
  const rows = await sql`
    SELECT id, email, password_hash, full_name, role, is_active
    FROM users
    WHERE LOWER(email) = LOWER(${email})
    LIMIT 1
  `;
  return rows[0] || null;
}

export async function getUserPermissions(role) {
  const rows = await sql`
    SELECT p.code
    FROM permissions p
    JOIN role_permissions rp ON rp.permission_id = p.id
    WHERE rp.role = ${role}
    ORDER BY p.code
  `;
  return rows.map((row) => row.code);
}

export async function registerUser({ email, password, fullName }) {
  const existing = await findUserByEmail(email);

  if (existing) {
    const error = new Error("An account with this email already exists");
    error.code = "EMAIL_EXISTS";
    throw error;
  }

  const passwordHash = await hashPassword(password);

  const rows = await sql`
    INSERT INTO users (
      email,
      password_hash,
      full_name,
      role
    )
    VALUES (
      ${email.toLowerCase()},
      ${passwordHash},
      ${fullName},
      'sales'
    )
    RETURNING id, email, full_name, role, is_active, created_at
  `;

  return rows[0];
}

export async function loginUser({ email, password }) {
  const user = await findUserByEmail(email);

  if (
    !user ||
    !user.is_active ||
    !(await verifyPassword(password, user.password_hash))
  ) {
    const error = new Error("Invalid email or password");
    error.code = "INVALID_CREDENTIALS";
    throw error;
  }

  const token = await createAccessToken(user);
  const tokenHash = hashToken(token);

  await sql`
    INSERT INTO sessions (
      user_id,
      token_hash,
      expires_at
    )
    VALUES (
      ${user.id},
      ${tokenHash},
      NOW() + INTERVAL '8 hours'
    )
  `;

  const permissions = await getUserPermissions(user.role);

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      permissions,
    },
  };
}

export async function authenticateToken(token) {
  const payload = await verifyAccessToken(token);
  const tokenHash = hashToken(token);

  const rows = await sql`
    SELECT
      u.id,
      u.email,
      u.full_name,
      u.role,
      u.is_active
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ${tokenHash}
      AND s.expires_at > NOW()
      AND u.is_active = TRUE
    LIMIT 1
  `;

  if (!rows[0] || rows[0].id !== payload.sub) {
    const error = new Error("Session is invalid or expired");
    error.code = "SESSION_INVALID";
    throw error;
  }

  const permissions = await getUserPermissions(rows[0].role);

  return {
    id: rows[0].id,
    email: rows[0].email,
    fullName: rows[0].full_name,
    role: rows[0].role,
    permissions,
  };
}

export async function logoutUser(token) {
  const tokenHash = hashToken(token);

  await sql`
    DELETE FROM sessions
    WHERE token_hash = ${tokenHash}
  `;
}

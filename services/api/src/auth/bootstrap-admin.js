import { sql } from "../db/client.js";
import { hashPassword } from "./security.js";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const fullName = process.env.ADMIN_NAME?.trim() || "MagCharge Sales Admin";

if (!email) {
  throw new Error("ADMIN_EMAIL is required");
}

if (!password || password.length < 8) {
  throw new Error("ADMIN_PASSWORD is required and must be at least 8 characters");
}

const passwordHash = await hashPassword(password);

const existing = await sql`
  SELECT id, email, full_name, role, is_active
  FROM users
  WHERE LOWER(email) = LOWER(${email})
  LIMIT 1
`;

if (existing.length) {
  const rows = await sql`
    UPDATE users
    SET
      password_hash = ${passwordHash},
      full_name = ${fullName},
      role = 'admin',
      is_active = true,
      updated_at = NOW()
    WHERE id = ${existing[0].id}
    RETURNING id, email, full_name, role, is_active
  `;

  console.log("ADMIN ACCOUNT UPDATED:");
  console.table(rows);
} else {
  const rows = await sql`
    INSERT INTO users (
      email,
      password_hash,
      full_name,
      role,
      is_active
    )
    VALUES (
      ${email},
      ${passwordHash},
      ${fullName},
      'admin',
      true
    )
    RETURNING id, email, full_name, role, is_active
  `;

  console.log("ADMIN ACCOUNT CREATED:");
  console.table(rows);
}

process.exit(0);

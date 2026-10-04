import { sql } from "../db/client.js";

export async function listCustomers(search = "") {
  const term = `%${search.trim()}%`;

  return sql`
    SELECT
      id,
      customer_code,
      full_name,
      email,
      phone,
      company_name,
      address,
      city,
      state,
      country,
      notes,
      status,
      created_at,
      updated_at
    FROM customers
    WHERE
      ${search.trim() === ""} OR
      full_name ILIKE ${term} OR
      email ILIKE ${term} OR
      phone ILIKE ${term} OR
      customer_code ILIKE ${term} OR
      company_name ILIKE ${term}
    ORDER BY created_at DESC
  `;
}

export async function getCustomer(id) {
  const rows = await sql`
    SELECT
      id,
      customer_code,
      full_name,
      email,
      phone,
      company_name,
      address,
      city,
      state,
      country,
      notes,
      status,
      created_at,
      updated_at
    FROM customers
    WHERE id = ${id}
    LIMIT 1
  `;

  return rows[0] || null;
}

export async function createCustomer({
  fullName,
  email,
  phone,
  companyName,
  address,
  city,
  state,
  country,
  notes,
  createdBy,
}) {
  const rows = await sql`
    INSERT INTO customers (
      customer_code,
      full_name,
      email,
      phone,
      company_name,
      address,
      city,
      state,
      country,
      notes,
      created_by
    )
    VALUES (
      'CUS-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
      UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8)),
      ${fullName},
      ${email || null},
      ${phone || null},
      ${companyName || null},
      ${address || null},
      ${city || null},
      ${state || null},
      ${country || "Nigeria"},
      ${notes || null},
      ${createdBy}
    )
    RETURNING
      id,
      customer_code,
      full_name,
      email,
      phone,
      company_name,
      address,
      city,
      state,
      country,
      notes,
      status,
      created_at,
      updated_at
  `;

  return rows[0];
}

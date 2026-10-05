import { sql } from "../db/client.js";

export async function listProducts(search = "") {
  const q = String(search || "").trim();

  if (!q) {
    return sql`
      SELECT
        id,
        sku,
        name,
        description,
        category,
        unit_price,
        cost_price,
        stock_quantity,
        reorder_level,
        status,
        created_at,
        updated_at
      FROM products
      ORDER BY created_at DESC
    `;
  }

  const pattern = `%${q}%`;

  return sql`
    SELECT
      id,
      sku,
      name,
      description,
      category,
      unit_price,
      cost_price,
      stock_quantity,
      reorder_level,
      status,
      created_at,
      updated_at
    FROM products
    WHERE
      sku ILIKE ${pattern}
      OR name ILIKE ${pattern}
      OR category ILIKE ${pattern}
    ORDER BY created_at DESC
  `;
}

export async function getProduct(id) {
  const rows = await sql`
    SELECT
      id,
      sku,
      name,
      description,
      category,
      unit_price,
      cost_price,
      stock_quantity,
      reorder_level,
      status,
      created_at,
      updated_at
    FROM products
    WHERE id = ${id}
    LIMIT 1
  `;

  return rows[0] || null;
}

export async function createProduct({
  sku,
  name,
  description = null,
  category = null,
  unit_price = 0,
  cost_price = 0,
  stock_quantity = 0,
  reorder_level = 0,
  status = "active",
  created_by = null,
}) {
  const rows = await sql`
    INSERT INTO products (
      sku,
      name,
      description,
      category,
      unit_price,
      cost_price,
      stock_quantity,
      reorder_level,
      status,
      created_by
    )
    VALUES (
      ${sku},
      ${name},
      ${description},
      ${category},
      ${unit_price},
      ${cost_price},
      ${stock_quantity},
      ${reorder_level},
      ${status},
      ${created_by}
    )
    RETURNING
      id,
      sku,
      name,
      description,
      category,
      unit_price,
      cost_price,
      stock_quantity,
      reorder_level,
      status,
      created_at,
      updated_at
  `;

  return rows[0];
}

export async function updateProduct(id, {
  sku,
  name,
  description = null,
  category = null,
  unit_price = 0,
  cost_price = 0,
  stock_quantity = 0,
  reorder_level = 0,
  status = "active",
}) {
  const rows = await sql`
    UPDATE products
    SET
      sku = ${sku},
      name = ${name},
      description = ${description},
      category = ${category},
      unit_price = ${unit_price},
      cost_price = ${cost_price},
      stock_quantity = ${stock_quantity},
      reorder_level = ${reorder_level},
      status = ${status},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING
      id,
      sku,
      name,
      description,
      category,
      unit_price,
      cost_price,
      stock_quantity,
      reorder_level,
      status,
      created_at,
      updated_at
  `;

  return rows[0] || null;
}

export async function deleteProduct(id) {
  const rows = await sql`
    DELETE FROM products
    WHERE id = ${id}
    RETURNING id, sku, name
  `;

  return rows[0] || null;
}

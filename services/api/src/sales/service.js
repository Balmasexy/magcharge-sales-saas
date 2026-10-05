import { sql } from "../db/client.js";

export async function listSales({ limit = 100 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 200);

  return sql`
    SELECT
      s.id,
      s.customer_id,
      c.full_name AS customer_name,
      s.subtotal,
      s.discount,
      s.total,
      s.payment_method,
      s.payment_status,
      s.status,
      s.notes,
      s.created_at,
      s.updated_at
    FROM sales s
    LEFT JOIN customers c ON c.id = s.customer_id
    ORDER BY s.created_at DESC
    LIMIT ${safeLimit}
  `;
}

export async function getSale(id) {
  const sales = await sql`
    SELECT
      s.id,
      s.customer_id,
      c.full_name AS customer_name,
      s.created_by,
      s.subtotal,
      s.discount,
      s.total,
      s.payment_method,
      s.payment_status,
      s.status,
      s.notes,
      s.created_at,
      s.updated_at
    FROM sales s
    LEFT JOIN customers c ON c.id = s.customer_id
    WHERE s.id = ${id}
    LIMIT 1
  `;

  if (!sales.length) {
    return null;
  }

  const items = await sql`
    SELECT
      si.id,
      si.product_id,
      p.sku,
      p.name AS product_name,
      si.quantity,
      si.unit_price,
      si.total
    FROM sale_items si
    JOIN products p ON p.id = si.product_id
    WHERE si.sale_id = ${id}
    ORDER BY si.created_at ASC
  `;

  return {
    ...sales[0],
    items,
  };
}

export async function createSale({
  customerId = null,
  items,
  discount = 0,
  paymentMethod = "cash",
  paymentStatus = "paid",
  notes = null,
  createdBy,
}) {
  if (!Array.isArray(items) || items.length === 0) {
    const error = new Error("At least one product is required");
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  const normalizedDiscount = Math.max(Number(discount) || 0, 0);

  return sql.begin(async (tx) => {
    let subtotal = 0;
    const normalizedItems = [];

    for (const item of items) {
      const productId = String(item.productId || "").trim();
      const quantity = Number(item.quantity);

      if (!productId || !Number.isInteger(quantity) || quantity <= 0) {
        const error = new Error(
          "Each sale item requires a valid product and quantity"
        );
        error.code = "VALIDATION_ERROR";
        throw error;
      }

      const products = await tx`
        SELECT
          id,
          sku,
          name,
          unit_price,
          stock_quantity,
          status
        FROM products
        WHERE id = ${productId}
        FOR UPDATE
      `;

      if (!products.length) {
        const error = new Error(`Product not found: ${productId}`);
        error.code = "NOT_FOUND";
        throw error;
      }

      const product = products[0];

      if (product.status !== "active") {
        const error = new Error(`${product.name} is not active`);
        error.code = "VALIDATION_ERROR";
        throw error;
      }

      if (Number(product.stock_quantity) < quantity) {
        const error = new Error(
          `Insufficient stock for ${product.name}. Available: ${product.stock_quantity}`
        );
        error.code = "INSUFFICIENT_STOCK";
        throw error;
      }

      const unitPrice = Number(product.unit_price);
      const lineTotal = unitPrice * quantity;

      subtotal += lineTotal;

      normalizedItems.push({
        productId: product.id,
        sku: product.sku,
        name: product.name,
        quantity,
        unitPrice,
        lineTotal,
      });
    }

    const total = Math.max(subtotal - normalizedDiscount, 0);

    const sales = await tx`
      INSERT INTO sales (
        customer_id,
        created_by,
        subtotal,
        discount,
        total,
        payment_method,
        payment_status,
        status,
        notes
      )
      VALUES (
        ${customerId || null},
        ${createdBy},
        ${subtotal.toFixed(2)},
        ${normalizedDiscount.toFixed(2)},
        ${total.toFixed(2)},
        ${paymentMethod},
        ${paymentStatus},
        'completed',
        ${notes || null}
      )
      RETURNING *
    `;

    const sale = sales[0];

    for (const item of normalizedItems) {
      await tx`
        INSERT INTO sale_items (
          sale_id,
          product_id,
          quantity,
          unit_price,
          total
        )
        VALUES (
          ${sale.id},
          ${item.productId},
          ${item.quantity},
          ${item.unitPrice.toFixed(2)},
          ${item.lineTotal.toFixed(2)}
        )
      `;

      await tx`
        UPDATE products
        SET
          stock_quantity = stock_quantity - ${item.quantity},
          updated_at = NOW()
        WHERE id = ${item.productId}
      `;
    }

    return {
      ...sale,
      items: normalizedItems,
    };
  });
}

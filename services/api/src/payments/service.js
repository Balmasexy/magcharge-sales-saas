import { sql } from "../db/client.js";

export async function listPayments({ limit = 100 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 200);

  return sql`
    SELECT
      p.id,
      p.sale_id,
      p.customer_id,
      c.full_name AS customer_name,
      p.amount,
      p.payment_method,
      p.status,
      p.reference,
      p.notes,
      p.received_by,
      u.email AS received_by_email,
      p.created_at,
      p.updated_at
    FROM payments p
    LEFT JOIN customers c ON c.id = p.customer_id
    JOIN users u ON u.id = p.received_by
    ORDER BY p.created_at DESC
    LIMIT ${safeLimit}
  `;
}

export async function getPayment(id) {
  const payments = await sql`
    SELECT
      p.id,
      p.sale_id,
      p.customer_id,
      c.full_name AS customer_name,
      p.amount,
      p.payment_method,
      p.status,
      p.reference,
      p.notes,
      p.received_by,
      u.email AS received_by_email,
      p.created_at,
      p.updated_at
    FROM payments p
    LEFT JOIN customers c ON c.id = p.customer_id
    JOIN users u ON u.id = p.received_by
    WHERE p.id = ${id}
    LIMIT 1
  `;

  return payments[0] || null;
}

export async function createPayment({
  saleId,
  amount,
  paymentMethod = "cash",
  status = "completed",
  reference = null,
  notes = null,
  receivedBy,
}) {
  const normalizedSaleId = String(saleId || "").trim();
  const normalizedAmount = Number(amount);

  if (!normalizedSaleId) {
    const error = new Error("Sale is required");
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    const error = new Error("Payment amount must be greater than zero");
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  return sql.begin(async (tx) => {
    const sales = await tx`
      SELECT
        id,
        customer_id,
        total
      FROM sales
      WHERE id = ${normalizedSaleId}
      FOR UPDATE
    `;

    if (!sales.length) {
      const error = new Error("Sale not found");
      error.code = "NOT_FOUND";
      throw error;
    }

    const sale = sales[0];

    const paidRows = await tx`
      SELECT COALESCE(SUM(amount), 0) AS paid_amount
      FROM payments
      WHERE sale_id = ${sale.id}
        AND status = 'completed'
    `;

    const paidAmount = Number(paidRows[0]?.paid_amount || 0);
    const saleTotal = Number(sale.total || 0);
    const balance = Math.max(saleTotal - paidAmount, 0);

    if (normalizedAmount > balance) {
      const error = new Error(
        `Payment exceeds outstanding balance. Outstanding: ${balance.toFixed(2)}`
      );
      error.code = "VALIDATION_ERROR";
      throw error;
    }

    const payments = await tx`
      INSERT INTO payments (
        sale_id,
        customer_id,
        amount,
        payment_method,
        status,
        reference,
        notes,
        received_by
      )
      VALUES (
        ${sale.id},
        ${sale.customer_id || null},
        ${normalizedAmount.toFixed(2)},
        ${paymentMethod},
        ${status},
        ${reference || null},
        ${notes || null},
        ${receivedBy}
      )
      RETURNING *
    `;

    const payment = payments[0];

    const newPaidAmount =
      paidAmount +
      (status === "completed" ? normalizedAmount : 0);

    const newPaymentStatus =
      newPaidAmount >= saleTotal
        ? "paid"
        : newPaidAmount > 0
          ? "partial"
          : "pending";

    await tx`
      UPDATE sales
      SET
        payment_status = ${newPaymentStatus},
        updated_at = NOW()
      WHERE id = ${sale.id}
    `;

    return {
      ...payment,
      saleTotal,
      previousPaidAmount: paidAmount,
      outstandingBalance: Math.max(saleTotal - newPaidAmount, 0),
    };
  });
}

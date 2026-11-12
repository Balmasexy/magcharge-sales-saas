import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { sql } from "../db/client.js";

function fail(code, message, statusCode = 400) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

export function getPaystackCredential(environment) {
  const mode = environment || String(process.env.PAYSTACK_ENVIRONMENT || "test").trim().toLowerCase();
  if (mode !== "test" && mode !== "live") return null;
  if (mode === "live" && process.env.PAYSTACK_LIVE_ENABLED !== "true") return null;
  const prefix = mode === "test" ? "sk_test_" : "sk_live_";
  const raw = mode === "test"
    ? process.env.PAYSTACK_TEST_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY
    : process.env.PAYSTACK_LIVE_SECRET_KEY;
  const secretKey = String(raw || "").trim();
  return secretKey.startsWith(prefix) ? { environment: mode, secretKey } : null;
}

function callbackUrl(reference) {
  const base = String(process.env.MAGCHARGE_WEB_URL || process.env.APP_BASE_URL || "").trim();
  try {
    const url = new URL(base);
    if (url.protocol !== "https:") return null;
    url.searchParams.set("paystack_reference", reference);
    return url.toString();
  } catch {
    return null;
  }
}

async function providerRequest(secretKey, path, init = {}) {
  const response = await fetch("https://api.paystack.co" + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  const body = await response.json().catch(() => ({}));
  return { ok: response.ok && body?.status === true, status: response.status, body };
}

function validReference(reference, environment) {
  return new RegExp(`^MAGCHARGE-PAYSTACK-${environment.toUpperCase()}-[0-9A-F]{32}$`).test(reference);
}

async function settleVerifiedCharge(reference, environment, amountMinor, providerData) {
  return sql.begin(async (tx) => {
    const rows = await tx`
      SELECT p.id, p.sale_id, p.amount, p.status, p.environment,
             s.total AS sale_total
        FROM payments p
        JOIN sales s ON s.id = p.sale_id
       WHERE p.payment_method = 'paystack'
         AND p.reference = ${reference}
       FOR UPDATE OF p, s
    `;
    const payment = rows[0];
    if (!payment) return { status: "not_found" };
    if (payment.environment !== environment) return { status: "environment_mismatch" };
    if (payment.status === "completed") return { status: "completed", duplicate: true, paymentId: payment.id };
    if (payment.status !== "pending") return { status: String(payment.status) };

    const expectedMinor = Math.round(Number(payment.amount) * 100);
    if (!Number.isSafeInteger(expectedMinor) || expectedMinor !== amountMinor) {
      await tx`UPDATE payments SET status = 'review', notes = COALESCE(notes, '') || ' [Paystack amount mismatch; manual reconciliation required]' WHERE id = ${payment.id}`;
      return { status: "review", reason: "amount_mismatch", paymentId: payment.id };
    }

    const totals = await tx`
      SELECT COALESCE(SUM(amount), 0) AS paid_amount
        FROM payments
       WHERE sale_id = ${payment.sale_id}
         AND status = 'completed'
    `;
    const alreadyPaid = Number(totals[0]?.paid_amount || 0);
    const amount = Number(payment.amount);
    const saleTotal = Number(payment.sale_total);
    if (alreadyPaid + amount > saleTotal + 0.000001) {
      await tx`UPDATE payments SET status = 'review', notes = COALESCE(notes, '') || ' [Paystack charge exceeds outstanding sale balance; manual reconciliation required]' WHERE id = ${payment.id}`;
      return { status: "review", reason: "sale_balance_exceeded", paymentId: payment.id };
    }

    await tx`
      UPDATE payments
         SET status = 'completed',
             provider = 'paystack',
             verified_at = NOW(),
             updated_at = NOW()
       WHERE id = ${payment.id}
         AND status = 'pending'
    `;
    const updatedTotals = await tx`
      SELECT COALESCE(SUM(amount), 0) AS paid_amount
        FROM payments
       WHERE sale_id = ${payment.sale_id}
         AND status = 'completed'
    `;
    const totalPaid = Number(updatedTotals[0]?.paid_amount || 0);
    const paymentStatus = totalPaid >= saleTotal ? "paid" : totalPaid > 0 ? "partial" : "pending";
    await tx`
      UPDATE sales SET payment_status = ${paymentStatus}, updated_at = NOW()
       WHERE id = ${payment.sale_id}
    `;
    return {
      status: "completed",
      duplicate: false,
      paymentId: payment.id,
      salePaymentStatus: paymentStatus,
      providerTransactionId: providerData?.id ?? null,
    };
  });
}

async function verifyAndSettle(reference, environment) {
  const credential = getPaystackCredential(environment);
  if (!credential) throw fail("PAYSTACK_CREDENTIALS_NOT_CONFIGURED", "Paystack credentials for this environment are not configured.", 503);
  if (!validReference(reference, environment)) throw fail("INVALID_PAYSTACK_REFERENCE", "Invalid Paystack reference.", 400);

  const verified = await providerRequest(
    credential.secretKey,
    `/transaction/verify/${encodeURIComponent(reference)}`,
  );
  const data = verified.body?.data || {};
  const amountMinor = Number(data.amount);
  if (!verified.ok || data.status !== "success" || data.domain !== environment ||
      data.reference !== reference || data.currency !== "NGN" ||
      !Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    return { status: "pending", verified: false };
  }
  const settled = await settleVerifiedCharge(reference, environment, amountMinor, data);
  return { ...settled, verified: true };
}

export async function initializePaystackCheckout({ saleId, amount, user }) {
  const environment = String(process.env.PAYSTACK_ENVIRONMENT || "test").trim().toLowerCase();
  const credential = getPaystackCredential(environment);
  if (!credential) throw fail("PAYSTACK_CREDENTIALS_NOT_CONFIGURED", "Paystack credentials for the selected environment are not configured.", 503);
  if (!user?.email || !String(user.email).includes("@")) throw fail("USER_EMAIL_REQUIRED", "A valid signed-in user email is required.", 400);

  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) throw fail("INVALID_PAYMENT_AMOUNT", "Payment amount must be greater than zero.", 400);
  const amountMinor = Math.round(numericAmount * 100);
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) throw fail("INVALID_PAYMENT_AMOUNT", "Payment amount is invalid.", 400);

  const reference = `MAGCHARGE-PAYSTACK-${environment.toUpperCase()}-${randomUUID().replaceAll("-", "").toUpperCase()}`;
  const callback = callbackUrl(reference);
  if (!callback) throw fail("PAYSTACK_CALLBACK_URL_REQUIRED", "Set MAGCHARGE_WEB_URL or APP_BASE_URL to the canonical HTTPS MagCharge web URL.", 503);

  const payment = await sql.begin(async (tx) => {
    const sales = await tx`
      SELECT id, customer_id, total, created_by
        FROM sales
       WHERE id = ${String(saleId || "").trim()}
       FOR UPDATE
    `;
    if (!sales.length) throw fail("SALE_NOT_FOUND", "Sale not found.", 404);
    const sale = sales[0];
    await tx`SELECT pg_advisory_xact_lock(hashtextextended(${String(sale.id)}, 0))`;
    if (user.role !== "admin" && user.role !== "super_admin" && sale.created_by !== user.id) {
      throw fail("SALE_ACCESS_DENIED", "You can only initiate Paystack checkout for a sale you created.", 403);
    }

    const pending = await tx`
      SELECT id FROM payments
       WHERE sale_id = ${sale.id}
         AND payment_method = 'paystack'
         AND status = 'pending'
       LIMIT 1
    `;
    if (pending.length) throw fail("PAYSTACK_CHECKOUT_ALREADY_PENDING", "A Paystack checkout is already pending for this sale. Verify or reconcile it before starting another.", 409);

    const paidRows = await tx`
      SELECT COALESCE(SUM(amount), 0) AS paid_amount
        FROM payments
       WHERE sale_id = ${sale.id}
         AND status = 'completed'
    `;
    const paidAmount = Number(paidRows[0]?.paid_amount || 0);
    const outstanding = Math.max(Number(sale.total) - paidAmount, 0);
    if (numericAmount > outstanding + 0.000001) {
      throw fail("PAYMENT_EXCEEDS_OUTSTANDING", `Payment exceeds the outstanding balance of ${outstanding.toFixed(2)}.`, 400);
    }

    const rows = await tx`
      INSERT INTO payments (
        sale_id, customer_id, amount, payment_method, status,
        reference, received_by, provider, environment
      )
      VALUES (
        ${sale.id}, ${sale.customer_id || null}, ${numericAmount.toFixed(2)},
        'paystack', 'pending', ${reference}, ${user.id}, 'paystack', ${environment}
      )
      RETURNING id, sale_id, amount, reference, status, environment
    `;
    return rows[0];
  });

  let initialized;
  try {
    initialized = await providerRequest(credential.secretKey, "/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email: user.email,
        amount: String(amountMinor),
        currency: "NGN",
        reference,
        callback_url: callback,
        metadata: {
          magcharge_payment_id: payment.id,
          magcharge_sale_id: payment.sale_id,
          magcharge_environment: environment,
        },
      }),
    });
  } catch {
    // The provider outcome is unknown after a network timeout. Keep the record pending for reconciliation.
    throw fail("PAYSTACK_CHECKOUT_OUTCOME_UNKNOWN", "Paystack did not return a definitive checkout result. The pending reference was retained for reconciliation.", 503);
  }

  const data = initialized.body?.data || {};
  const checkoutUrl = typeof data.authorization_url === "string" ? data.authorization_url : "";
  let safeCheckoutUrl = false;
  try {
    const url = new URL(checkoutUrl);
    safeCheckoutUrl = url.protocol === "https:" && url.hostname === "checkout.paystack.com";
  } catch {
    safeCheckoutUrl = false;
  }
  if (!initialized.ok || data.reference !== reference || !safeCheckoutUrl ||
      (data.domain !== undefined && data.domain !== environment)) {
    throw fail("PAYSTACK_CHECKOUT_INITIALIZATION_FAILED", "Paystack did not return a valid hosted checkout URL. The pending record was retained for reconciliation.", 502);
  }

  await sql`
    UPDATE payments
       SET checkout_url = ${checkoutUrl},
           updated_at = NOW()
     WHERE id = ${payment.id}
       AND status = 'pending'
  `;
  return { paymentId: payment.id, reference, environment, checkoutUrl, status: "pending" };
}

export async function getPaystackPaymentStatus(reference, user) {
  const ref = String(reference || "").trim();
  const rows = await sql`
    SELECT p.id, p.reference, p.amount, p.status, p.environment,
           p.checkout_url, p.verified_at, s.created_by
      FROM payments p
      JOIN sales s ON s.id = p.sale_id
     WHERE p.payment_method = 'paystack'
       AND p.reference = ${ref}
     LIMIT 1
  `;
  const payment = rows[0];
  if (!payment || (user.role !== "admin" && user.role !== "super_admin" && payment.created_by !== user.id)) {
    throw fail("PAYSTACK_PAYMENT_NOT_FOUND", "Paystack payment not found.", 404);
  }
  if (payment.status === "pending") {
    try {
      await verifyAndSettle(ref, payment.environment);
    } catch (error) {
      if (error?.code !== "PAYSTACK_CREDENTIALS_NOT_CONFIGURED") throw error;
    }
  }
  const latest = await sql`
    SELECT id, reference, amount, status, environment, checkout_url, verified_at
      FROM payments
     WHERE id = ${payment.id}
     LIMIT 1
  `;
  return { payment: latest[0] || payment };
}

export async function handlePaystackWebhook(req) {
  const pathname = new URL(req.url || "/", "http://localhost").pathname.replace(/\/+$/, "") || "/";
  if (!["/webhooks/paystack", "/webhooks/paystack/test", "/webhooks/paystack/live"].includes(pathname)) return null;

  const environment = pathname === "/webhooks/paystack/live" ? "live" : "test";
  const credential = getPaystackCredential(environment);
  if (!credential) return { status: 503, body: { error: "PAYSTACK_CREDENTIALS_NOT_CONFIGURED" } };

  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    const part = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += part.length;
    if (size > 65536) return { status: 413, body: { error: "PAYLOAD_TOO_LARGE" } };
    chunks.push(part);
  }
  const rawBody = Buffer.concat(chunks);
  const signature = String(req.headers["x-paystack-signature"] || "");
  if (!signature) return { status: 401, body: { error: "INVALID_WEBHOOK_SIGNATURE" } };
  const expected = createHmac("sha512", credential.secretKey).update(rawBody).digest();
  const actual = Buffer.from(signature, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return { status: 401, body: { error: "INVALID_WEBHOOK_SIGNATURE" } };
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return { status: 400, body: { error: "INVALID_JSON" } };
  }
  if (event?.event !== "charge.success") return { status: 200, body: { received: true, ignored: true } };

  const reference = String(event?.data?.reference || "").trim();
  if (!validReference(reference, environment)) {
    return { status: 200, body: { received: true, processed: false, reason: "REFERENCE_ENVIRONMENT_MISMATCH" } };
  }
  try {
    const result = await verifyAndSettle(reference, environment);
    if (result.status === "not_found") return { status: 200, body: { received: true, processed: false, reason: "PAYMENT_NOT_FOUND" } };
    if (result.status === "pending" && result.verified === false) return { status: 202, body: { received: true, processed: false, reason: "PROVIDER_VERIFICATION_PENDING" } };
    return { status: 200, body: { received: true, processed: result.status === "completed", ...result } };
  } catch {
    return { status: 503, body: { error: "PAYSTACK_WEBHOOK_RECONCILIATION_UNAVAILABLE" } };
  }
}

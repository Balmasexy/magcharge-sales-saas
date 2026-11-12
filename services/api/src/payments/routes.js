import {
  listPayments,
  getPayment,
  createPayment,
} from "./service.js";
import {
  initializePaystackCheckout,
  getPaystackPaymentStatus,
} from "./paystack.js";

export async function handlePayments(
  req,
  res,
  user,
  pathname,
  searchParams,
  audit
) {
  const canRead = user.permissions?.includes("payments.read");
  const canWrite = user.permissions?.includes("payments.write");

  if (req.method === "POST" && pathname === "/api/payments/paystack/checkout") {
    if (!canWrite) return { status: 403, body: { error: "Permission denied" } };
    let body;
    try { body = await readJson(req); }
    catch { return { status: 400, body: { error: "Invalid JSON payload" } }; }
    try {
      const result = await initializePaystackCheckout({
        saleId: body.saleId,
        amount: body.amount,
        user,
      });
      await audit(user.id, "payment.paystack.checkout.initialize", "payment", result.paymentId, {
        reference: result.reference,
        environment: result.environment,
      }, req.socket.remoteAddress || null);
      return { status: 201, body: result };
    } catch (error) {
      const status = Number(error?.statusCode) || 502;
      return {
        status,
        body: {
          error: String(error?.code || "PAYSTACK_CHECKOUT_FAILED"),
          message: String(error?.message || "Paystack checkout could not be initialized"),
        },
      };
    }
  }

  if (req.method === "GET" && pathname === "/api/payments/paystack/status") {
    if (!canRead) return { status: 403, body: { error: "Permission denied" } };
    try {
      const result = await getPaystackPaymentStatus(searchParams.get("reference"), user);
      return { status: 200, body: result };
    } catch (error) {
      return {
        status: Number(error?.statusCode) || 502,
        body: {
          error: String(error?.code || "PAYSTACK_STATUS_FAILED"),
          message: String(error?.message || "Paystack payment status is unavailable"),
        },
      };
    }
  }

  if (req.method === "GET") {
    if (!canRead) {
      return {
        status: 403,
        body: { error: "Permission denied" },
      };
    }

    if (pathname === "/api/payments") {
      const payments = await listPayments({
        limit: searchParams.get("limit"),
      });

      return {
        status: 200,
        body: { payments },
      };
    }

    const match = pathname.match(/^\/api\/payments\/([^/]+)$/);

    if (match) {
      const payment = await getPayment(match[1]);

      if (!payment) {
        return {
          status: 404,
          body: { error: "Payment not found" },
        };
      }

      return {
        status: 200,
        body: { payment },
      };
    }
  }

  if (req.method === "POST" && pathname === "/api/payments") {
    if (!canWrite) {
      return {
        status: 403,
        body: { error: "Permission denied" },
      };
    }

    const body = await readJson(req);
    if (String(body.paymentMethod || "").trim().toLowerCase() === "paystack") {
      return {
        status: 400,
        body: { error: "PAYSTACK_CHECKOUT_REQUIRED", message: "Paystack payments must use the hosted checkout endpoint and verified webhook." },
      };
    }

    const payment = await createPayment({
      saleId: body.saleId,
      amount: body.amount,
      paymentMethod: body.paymentMethod || "cash",
      status: body.status || "completed",
      reference: body.reference || null,
      notes: body.notes || null,
      receivedBy: user.id,
    });

    await audit(
      user.id,
      "payment.create",
      "payment",
      payment.id,
      {
        saleId: payment.sale_id,
        amount: payment.amount,
        paymentMethod: payment.payment_method,
        status: payment.status,
      },
      req.socket.remoteAddress || null
    );

    return {
      status: 201,
      body: { payment },
    };
  }

  return null;
}

async function readJson(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
    if (Buffer.concat(chunks).length > 8192) {
      const error = new Error("Payload too large");
      error.code = "PAYLOAD_TOO_LARGE";
      throw error;
    }
  }

  if (!chunks.length) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString("utf8");

  if (!raw.trim()) {
    return {};
  }

  return JSON.parse(raw);
}

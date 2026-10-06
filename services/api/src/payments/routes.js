import {
  listPayments,
  getPayment,
  createPayment,
} from "./service.js";

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

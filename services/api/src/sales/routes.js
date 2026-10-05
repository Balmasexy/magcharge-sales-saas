import {
  listSales,
  getSale,
  createSale,
} from "./service.js";

export async function handleSales(
  req,
  res,
  user,
  pathname,
  searchParams,
  audit
) {
  const canRead = user.permissions?.includes("sales.read");
  const canWrite = user.permissions?.includes("sales.write");

  if (req.method === "GET") {
    if (!canRead) {
      return {
        status: 403,
        body: { error: "Permission denied" },
      };
    }

    if (pathname === "/api/sales") {
      const sales = await listSales({
        limit: searchParams.get("limit"),
      });

      return {
        status: 200,
        body: { sales },
      };
    }

    const match = pathname.match(/^\/api\/sales\/([^/]+)$/);

    if (match) {
      const sale = await getSale(match[1]);

      if (!sale) {
        return {
          status: 404,
          body: { error: "Sale not found" },
        };
      }

      return {
        status: 200,
        body: { sale },
      };
    }
  }

  if (req.method === "POST" && pathname === "/api/sales") {
    if (!canWrite) {
      return {
        status: 403,
        body: { error: "Permission denied" },
      };
    }

    const body = await readJson(req);

    const sale = await createSale({
      customerId: body.customerId || null,
      items: body.items,
      discount: body.discount || 0,
      paymentMethod: body.paymentMethod || "cash",
      paymentStatus: body.paymentStatus || "paid",
      notes: body.notes || null,
      createdBy: user.id,
    });

    await audit(
      user.id,
      "sale.create",
      "sale",
      sale.id,
      {
        total: sale.total,
        itemCount: sale.items.length,
      },
      req.socket.remoteAddress || null
    );

    return {
      status: 201,
      body: { sale },
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

import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from "./service.js";

function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

async function readJson(req) {
  let body = "";

  for await (const chunk of req) {
    body += chunk;
  }

  if (!body.trim()) return {};

  try {
    return JSON.parse(body);
  } catch {
    const error = new Error("Request body must be valid JSON");
    error.statusCode = 400;
    throw error;
  }
}

function validateProduct(body, partial = false) {
  const errors = [];

  if (!partial || body.sku !== undefined) {
    if (
      typeof body.sku !== "string" ||
      body.sku.trim().length < 2 ||
      body.sku.trim().length > 80
    ) {
      errors.push("SKU must be between 2 and 80 characters");
    }
  }

  if (!partial || body.name !== undefined) {
    if (
      typeof body.name !== "string" ||
      body.name.trim().length < 2 ||
      body.name.trim().length > 180
    ) {
      errors.push("Product name must be between 2 and 180 characters");
    }
  }

  for (const field of [
    "unit_price",
    "cost_price",
    "stock_quantity",
    "reorder_level",
  ]) {
    if (body[field] !== undefined) {
      const value = Number(body[field]);

      if (!Number.isFinite(value) || value < 0) {
        errors.push(`${field} must be a non-negative number`);
      }
    }
  }

  if (
    body.status !== undefined &&
    !["active", "inactive"].includes(body.status)
  ) {
    errors.push("status must be active or inactive");
  }

  return errors;
}

function normalizeProduct(body) {
  return {
    sku: String(body.sku || "").trim(),
    name: String(body.name || "").trim(),
    description:
      body.description === undefined || body.description === ""
        ? null
        : String(body.description).trim(),
    category:
      body.category === undefined || body.category === ""
        ? null
        : String(body.category).trim(),
    unit_price: Number(body.unit_price ?? 0),
    cost_price: Number(body.cost_price ?? 0),
    stock_quantity: Number(body.stock_quantity ?? 0),
    reorder_level: Number(body.reorder_level ?? 0),
    status: body.status || "active",
  };
}

export async function handleProducts(req, res, user, pathname, searchParams, audit) {
  const parts = pathname.split("/").filter(Boolean);
  const id = parts.length === 3 ? parts[2] : null;

  const canRead = user.permissions?.includes("inventory.read");
  const canWrite = user.permissions?.includes("inventory.write");

  if (req.method === "GET") {
    if (!canRead) {
      return sendJson(res, 403, { error: "Forbidden" });
    }

    if (id) {
      const product = await getProduct(id);

      if (!product) {
        return sendJson(res, 404, { error: "Product not found" });
      }

      return sendJson(res, 200, product);
    }

    const products = await listProducts(searchParams.get("search") || "");

    return sendJson(res, 200, { products });
  }

  if (!canWrite) {
    return sendJson(res, 403, { error: "Forbidden" });
  }

  if (req.method === "POST") {
    const body = await readJson(req);
    const errors = validateProduct(body);

    if (errors.length) {
      return sendJson(res, 400, { error: errors.join("; ") });
    }

    const product = await createProduct({
      ...normalizeProduct(body),
      created_by: user.id,
    });

    if (audit) {
      await audit(user.id, "product.create", "product", product.id, {
        sku: product.sku,
      });
    }

    return sendJson(res, 201, product);
  }

  if ((req.method === "PUT" || req.method === "PATCH") && id) {
    const body = await readJson(req);

    const errors = validateProduct(
      body,
      req.method === "PATCH"
    );

    if (errors.length) {
      return sendJson(res, 400, { error: errors.join("; ") });
    }

    const existing = await getProduct(id);

    if (!existing) {
      return sendJson(res, 404, { error: "Product not found" });
    }

    const normalized =
      req.method === "PATCH"
        ? {
            sku: body.sku ?? existing.sku,
            name: body.name ?? existing.name,
            description: body.description ?? existing.description,
            category: body.category ?? existing.category,
            unit_price: body.unit_price ?? existing.unit_price,
            cost_price: body.cost_price ?? existing.cost_price,
            stock_quantity:
              body.stock_quantity ?? existing.stock_quantity,
            reorder_level:
              body.reorder_level ?? existing.reorder_level,
            status: body.status ?? existing.status,
          }
        : normalizeProduct(body);

    const product = await updateProduct(id, normalized);

    if (audit) {
      await audit(user.id, "product.update", "product", product.id, {
        product_id: product.id,
        sku: product.sku,
      });
    }

    return sendJson(res, 200, product);
  }

  if (req.method === "DELETE" && id) {
    const existing = await getProduct(id);

    if (!existing) {
      return sendJson(res, 404, { error: "Product not found" });
    }

    const product = await deleteProduct(id);

    if (audit) {
      await audit(user.id, "product.delete", "product", product.id, {
        product_id: product.id,
        sku: product.sku,
      });
    }

    return sendJson(res, 200, product);
  }

  return sendJson(res, 405, { error: "Method not allowed" });
}

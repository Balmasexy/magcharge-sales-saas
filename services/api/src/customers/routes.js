import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "./service.js";

function validationError(message) {
  const error = new Error(message);
  error.code = "VALIDATION_ERROR";
  return error;
}

function validateCustomer(body, { requireName = true } = {}) {
  const fullName = String(body.fullName || "").trim();

  if (
    requireName &&
    (fullName.length < 2 || fullName.length > 160)
  ) {
    throw validationError(
      "Customer name must be between 2 and 160 characters"
    );
  }

  const email = String(body.email || "").trim();

  if (email && !email.includes("@")) {
    throw validationError("Customer email is invalid");
  }

  const status = String(body.status || "active").trim();

  if (!["active", "inactive", "blocked"].includes(status)) {
    throw validationError("Customer status is invalid");
  }

  return {
    fullName,
    email,
    phone: String(body.phone || "").trim(),
    companyName: String(body.companyName || "").trim(),
    address: String(body.address || "").trim(),
    city: String(body.city || "").trim(),
    state: String(body.state || "").trim(),
    country: String(body.country || "Nigeria").trim(),
    notes: String(body.notes || "").trim(),
    status,
  };
}

async function readBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw validationError("Request body must contain valid JSON");
  }
}

function customerId(url) {
  return url.pathname.slice("/api/customers/".length).trim();
}

export async function customerRoute(req, user, audit) {
  const url = new URL(
    req.url,
    `http://${req.headers.host || "localhost"}`
  );

  if (req.method === "GET" && url.pathname === "/api/customers") {
    if (!user.permissions.includes("customers.read")) {
      return {
        status: 403,
        body: { error: "Customer read permission required" },
      };
    }

    const search = url.searchParams.get("search") || "";
    const customers = await listCustomers(search);

    return {
      status: 200,
      body: { customers },
    };
  }

  if (
    req.method === "GET" &&
    url.pathname.startsWith("/api/customers/") &&
    customerId(url)
  ) {
    if (!user.permissions.includes("customers.read")) {
      return {
        status: 403,
        body: { error: "Customer read permission required" },
      };
    }

    const customer = await getCustomer(customerId(url));

    if (!customer) {
      return {
        status: 404,
        body: { error: "Customer not found" },
      };
    }

    return {
      status: 200,
      body: { customer },
    };
  }

  if (
    req.method === "POST" &&
    url.pathname === "/api/customers"
  ) {
    if (!user.permissions.includes("customers.write")) {
      return {
        status: 403,
        body: { error: "Customer write permission required" },
      };
    }

    const body = await readBody(req);
    const input = validateCustomer(body);

    const customer = await createCustomer({
      ...input,
      createdBy: user.id,
    });

    await audit(
      user.id,
      "customer.create",
      "customer",
      customer.id,
      {
        customerCode: customer.customer_code,
        name: customer.full_name,
      },
      req.socket.remoteAddress || null
    );

    return {
      status: 201,
      body: { customer },
    };
  }

  if (
    (req.method === "PUT" || req.method === "PATCH") &&
    url.pathname.startsWith("/api/customers/") &&
    customerId(url)
  ) {
    if (!user.permissions.includes("customers.write")) {
      return {
        status: 403,
        body: { error: "Customer write permission required" },
      };
    }

    const id = customerId(url);
    const existing = await getCustomer(id);

    if (!existing) {
      return {
        status: 404,
        body: { error: "Customer not found" },
      };
    }

    const body = await readBody(req);
    const input = validateCustomer(body);

    const customer = await updateCustomer(id, input);

    await audit(
      user.id,
      "customer.update",
      "customer",
      customer.id,
      {
        customerCode: customer.customer_code,
        name: customer.full_name,
      },
      req.socket.remoteAddress || null
    );

    return {
      status: 200,
      body: { customer },
    };
  }

  if (
    req.method === "DELETE" &&
    url.pathname.startsWith("/api/customers/") &&
    customerId(url)
  ) {
    if (!user.permissions.includes("customers.write")) {
      return {
        status: 403,
        body: { error: "Customer write permission required" },
      };
    }

    const id = customerId(url);
    const customer = await deleteCustomer(id);

    if (!customer) {
      return {
        status: 404,
        body: { error: "Customer not found" },
      };
    }

    await audit(
      user.id,
      "customer.delete",
      "customer",
      customer.id,
      {
        customerCode: customer.customer_code,
        name: customer.full_name,
      },
      req.socket.remoteAddress || null
    );

    return {
      status: 200,
      body: { customer },
    };
  }

  return null;
}

import {
  listCustomers,
  getCustomer,
  createCustomer,
} from "./service.js";

function validationError(message) {
  const error = new Error(message);
  error.code = "VALIDATION_ERROR";
  return error;
}

function validateCustomer(body) {
  const fullName = String(body.fullName || "").trim();

  if (fullName.length < 2 || fullName.length > 160) {
    throw validationError(
      "Customer name must be between 2 and 160 characters"
    );
  }

  const email = String(body.email || "").trim();

  if (email && !email.includes("@")) {
    throw validationError("Customer email is invalid");
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

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
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
    url.pathname.startsWith("/api/customers/")
  ) {
    if (!user.permissions.includes("customers.read")) {
      return {
        status: 403,
        body: { error: "Customer read permission required" },
      };
    }

    const id = url.pathname.split("/").pop();
    const customer = await getCustomer(id);

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

  return null;
}

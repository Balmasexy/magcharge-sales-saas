import http from "node:http";
import { validateConfig } from "./config.js";
import {
  registerUser,
  loginUser,
  logoutUser,
} from "./auth/service.js";
import {
  authenticate,
  getBearerToken,
} from "./middleware/auth.js";
import { sql } from "./db/client.js";
import { customerRoute } from "./customers/routes.js";

validateConfig();

const PORT = process.env.PORT || 4000;

function json(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json",
  });

  res.end(JSON.stringify(body));
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

function validationError(message) {
  const error = new Error(message);
  error.code = "VALIDATION_ERROR";
  return error;
}

function validateRegistration(body) {
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const fullName = String(body.fullName || "").trim();

  if (!email || !email.includes("@")) {
    throw validationError("A valid email address is required");
  }

  if (password.length < 8) {
    throw validationError("Password must be at least 8 characters");
  }

  if (fullName.length < 2 || fullName.length > 160) {
    throw validationError("Full name must be between 2 and 160 characters");
  }

  return {
    email,
    password,
    fullName,
  };
}

function validateLogin(body) {
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!email || !email.includes("@") || !password) {
    throw validationError("Email and password are required");
  }

  return {
    email,
    password,
  };
}

async function audit(userId, action, resource = null, resourceId = null, metadata = null, ipAddress = null) {
  await sql`
    INSERT INTO audit_logs (
      user_id,
      action,
      resource,
      resource_id,
      metadata,
      ip_address
    )
    VALUES (
      ${userId},
      ${action},
      ${resource},
      ${resourceId},
      ${metadata ? JSON.stringify(metadata) : null},
      ${ipAddress}
    )
  `;
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url === "/health" && req.method === "GET") {
      return json(res, 200, {
        status: "ok",
        service: "magcharge-sales-api",
      });
    }

    if (req.url === "/api/auth/status" && req.method === "GET") {
      let database = "not-configured";

      if (process.env.DATABASE_URL) {
        try {
          await sql`SELECT 1`;
          database = "connected";
        } catch {
          database = "connection-failed";
        }
      }

      return json(res, 200, {
        authentication: "ready",
        rbac: "ready",
        database,
      });
    }

    if (
      req.url.startsWith("/api/customers") &&
      ["GET", "POST", "PUT", "PATCH", "DELETE"].includes(req.method)
    ) {
      const user = await authenticate(req, res);

      if (!user) {
        return;
      }

      const result = await customerRoute(req, res, user, audit);

      if (result) {
        return json(res, result.status, result.body);
      }
    }

    if (req.url === "/api/auth/register" && req.method === "POST") {
      const body = await readJson(req);
      const input = validateRegistration(body);

      const user = await registerUser(input);

      await audit(
        user.id,
        "auth.register",
        "user",
        user.id,
        { email: user.email },
        req.socket.remoteAddress || null
      );

      return json(res, 201, {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
        },
      });
    }

    if (req.url === "/api/auth/login" && req.method === "POST") {
      const body = await readJson(req);
      const input = validateLogin(body);

      const result = await loginUser(input);

      await audit(
        result.user.id,
        "auth.login",
        "user",
        result.user.id,
        null,
        req.socket.remoteAddress || null
      );

      return json(res, 200, result);
    }

    if (req.url === "/api/auth/logout" && req.method === "POST") {
      const token = getBearerToken(req);

      if (!token) {
        return json(res, 401, {
          error: "Authentication required",
        });
      }

      const user = await authenticate(req, res);

      if (!user) {
        return;
      }

      await logoutUser(token);

      await audit(
        user.id,
        "auth.logout",
        "user",
        user.id,
        null,
        req.socket.remoteAddress || null
      );

      return json(res, 200, {
        success: true,
      });
    }

    if (req.url === "/api/auth/me" && req.method === "GET") {
      const user = await authenticate(req, res);

      if (!user) {
        return;
      }

      return json(res, 200, {
        user,
      });
    }

    return json(res, 404, {
      error: "Not found",
    });
  } catch (error) {
    console.error(error);

    if (error.code === "EMAIL_EXISTS") {
      return json(res, 409, {
        error: error.message,
      });
    }

    if (
      error.code === "INVALID_CREDENTIALS" ||
      error.code === "SESSION_INVALID"
    ) {
      return json(res, 401, {
        error: error.message,
      });
    }

    if (error.code === "VALIDATION_ERROR") {
      return json(res, 400, {
        error: error.message,
      });
    }

    return json(res, 500, {
      error: "Internal server error",
    });
  }
});

server.listen(PORT, () => {
  console.log(`MagCharge Sales API running on port ${PORT}`);
});

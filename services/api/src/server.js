import http from "node:http";
import { validateConfig } from "./config.js";
import {
  createAccessToken,
  hashPassword,
  verifyPassword,
} from "./auth/security.js";

validateConfig();

const PORT = process.env.PORT || 4000;

function json(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json",
  });

  res.end(JSON.stringify(body));
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
      return json(res, 200, {
        authentication: "ready",
        rbac: "ready",
        database: process.env.DATABASE_URL ? "configured" : "not-configured",
      });
    }

    if (req.url === "/api/auth/test" && req.method === "POST") {
      const password = "MagCharge-development-test";
      const hash = await hashPassword(password);
      const valid = await verifyPassword(password, hash);

      const token = await createAccessToken({
        id: "00000000-0000-0000-0000-000000000001",
        email: "development@magcharge.local",
        role: "super_admin",
      });

      return json(res, 200, {
        passwordHashing: valid,
        tokenGeneration: Boolean(token),
        role: "super_admin",
      });
    }

    return json(res, 404, {
      error: "Not found",
    });
  } catch (error) {
    console.error(error);

    return json(res, 500, {
      error: "Internal server error",
    });
  }
});

server.listen(PORT, () => {
  console.log(`MagCharge Sales API running on port ${PORT}`);
});

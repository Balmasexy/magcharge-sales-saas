import { authenticateToken } from "../auth/service.js";

export async function authenticate(req, res) {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    res.writeHead(401, {
      "Content-Type": "application/json",
    });
    res.end(JSON.stringify({
      error: "Authentication required",
    }));
    return null;
  }

  const token = header.slice(7).trim();

  if (!token) {
    res.writeHead(401, {
      "Content-Type": "application/json",
    });
    res.end(JSON.stringify({
      error: "Authentication required",
    }));
    return null;
  }

  try {
    return await authenticateToken(token);
  } catch {
    res.writeHead(401, {
      "Content-Type": "application/json",
    });
    res.end(JSON.stringify({
      error: "Invalid or expired session",
    }));
    return null;
  }
}

export function getBearerToken(req) {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return null;
  }

  return header.slice(7).trim() || null;
}

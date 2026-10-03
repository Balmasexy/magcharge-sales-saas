import { verifyAccessToken } from "../auth/security.js";

export async function authenticate(req, res) {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    res.writeHead(401);
    res.end(JSON.stringify({ error: "Authentication required" }));
    return null;
  }

  const token = header.slice(7);

  try {
    return await verifyAccessToken(token);
  } catch {
    res.writeHead(401);
    res.end(JSON.stringify({ error: "Invalid or expired token" }));
    return null;
  }
}

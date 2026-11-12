export function getPaystackCredential(environment) {
  const mode = environment || String(process.env.PAYSTACK_ENVIRONMENT || "test").trim().toLowerCase();
  if (mode !== "test" && mode !== "live") return null;
  if (mode === "live" && process.env.PAYSTACK_LIVE_ENABLED !== "true") return null;
  const prefix = mode === "test" ? "sk_test_" : "sk_live_";
  const raw = mode === "test"
    ? process.env.PAYSTACK_TEST_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY
    : process.env.PAYSTACK_LIVE_SECRET_KEY;
  const secretKey = String(raw || "").trim();
  return secretKey.startsWith(prefix) ? { environment: mode, secretKey } : null;
}

export function validPaystackReference(reference, environment) {
  return new RegExp(`^MAGCHARGE-PAYSTACK-${String(environment).toUpperCase()}-[0-9A-F]{32}$`).test(String(reference || ""));
}

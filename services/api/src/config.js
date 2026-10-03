const required = ["DATABASE_URL", "JWT_SECRET"];

export function validateConfig() {
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length) {
    console.warn(
      `Missing environment variables: ${missing.join(", ")}`
    );
  }
}

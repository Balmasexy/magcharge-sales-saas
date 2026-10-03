import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn("DATABASE_URL is not configured.");
}

export const sql = postgres(databaseUrl || "", {
  max: 5,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false,
});

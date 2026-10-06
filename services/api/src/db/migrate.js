import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = postgres(databaseUrl, {
  max: 1,
  connect_timeout: 15,
});

async function run() {
  try {
    const schemaPath = path.join(__dirname, "schema.sql");

    const customersPath = path.join(
      __dirname,
      "../../migrations/002_customers.sql"
    );

    const productsPath = path.join(
      __dirname,
      "../../migrations/003_products_inventory.sql"
    );

    const salesPath = path.join(
      __dirname,
      "../../migrations/004_sales.sql"
    );

    const paymentsPath = path.join(
      __dirname,
      "../../migrations/005_payments.sql"
    );

    const schema = await fs.readFile(schemaPath, "utf8");
    const customers = await fs.readFile(customersPath, "utf8");
    const products = await fs.readFile(productsPath, "utf8");
    const sales = await fs.readFile(salesPath, "utf8");
    const payments = await fs.readFile(paymentsPath, "utf8");

    console.log("Applying base database schema...");
    await sql.unsafe(schema);

    console.log("Applying customers migration...");
    await sql.unsafe(customers);

    console.log("Applying products and inventory migration...");
    await sql.unsafe(products);

    console.log("Applying sales migration...");
    await sql.unsafe(sales);

    console.log("Applying payments migration...");
    await sql.unsafe(payments);

    console.log("Database migration completed successfully.");
  } finally {
    await sql.end();
  }
}

run().catch((error) => {
  console.error("Database migration failed:");
  console.error(error);
  process.exit(1);
});

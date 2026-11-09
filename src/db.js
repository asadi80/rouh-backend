// import pg from "pg";
// import dotenv from "dotenv";

// dotenv.config();

// const { Pool } = pg;

// export const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
// });

// pool.on("error", (err) => {
//   console.error("Unexpected Postgres pool error", err);
// });

import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("🔴 DATABASE_URL IS MISSING");
  throw new Error("DATABASE_URL is not configured");
}

let databaseHost;

try {
  const parsed = new URL(databaseUrl);

  databaseHost = parsed.hostname;

  console.log("\n========== DATABASE CONFIGURATION ==========");
  console.log("Database host:", parsed.hostname);
  console.log("Database port:", parsed.port || "5432");
  console.log("Database name:", parsed.pathname);
  console.log("Database URL exists:", true);
  console.log("============================================\n");
} catch (error) {
  console.error("🔴 INVALID DATABASE_URL:", error.message);
  throw error;
}

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl:
    process.env.DATABASE_SSL === "true"
      ? { rejectUnauthorized: false }
      : false,
});

pool.on("connect", () => {
  console.log("🟢 PostgreSQL connection established");
});

pool.on("error", (error) => {
  console.error("🔴 PostgreSQL pool error:", error.message);
  console.error("Error code:", error.code);
});

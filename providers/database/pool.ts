import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

const globalForPool = globalThis as unknown as { __pgPool?: Pool };

function createPool(): Pool {
  const p = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: process.env.NODE_ENV === "production" ? 10 : 3,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  p.on("error", (err) => {
    console.error("Unexpected error on idle database client", err);
    process.exit(-1);
  });

  return p;
}

// Reuse the pool across hot reloads in development
export const pool = globalForPool.__pgPool ?? (globalForPool.__pgPool = createPool());

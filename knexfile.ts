import type { Knex } from "knex";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const config: { [key: string]: Knex.Config } = {
  development: {
    client: "pg",
    connection: process.env.DATABASE_URL,
    migrations: {
      directory: "./database/migrations",
      tableName: "knex_migrations",
      extension: "ts",
    },
    pool: {
      min: 0,
      max: 5,
    },
  },
  production: {
    client: "pg",
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    },
    migrations: {
      directory: "./database/migrations",
      tableName: "knex_migrations",
      extension: "ts",
    },
    pool: {
      min: 2,
      max: 10,
    },
  },
};

export default config;

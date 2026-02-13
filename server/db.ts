import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Remove sslmode from URL to prevent conflict with explicit ssl config
const rawUrl = process.env.DATABASE_URL.trim();
const connectionString = rawUrl.replace(/[?&]sslmode=[^&]*/g, "").replace(/\?$/, "");

export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: process.env.NODE_ENV === "production" ? 1 : 10,
});
export const db = drizzle(pool, { schema });

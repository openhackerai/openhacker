import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { getEnv } from "../env";
import * as appSchema from "./app-schema";
import * as authSchema from "./auth-schema";

const schema = { ...authSchema, ...appSchema };

const databaseUrl = getEnv("DATABASE_URL");

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to use OpenHacker auth.");
}

const sql = neon(databaseUrl);

export const db = drizzle(sql, { schema });

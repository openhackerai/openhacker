import { defineConfig } from "drizzle-kit";
import { getEnv } from "./lib/env";

const databaseUrl = getEnv("DATABASE_URL");

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run Drizzle.");
}

export default defineConfig({
  schema: ["./lib/db/auth-schema.ts", "./lib/db/app-schema.ts"],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});

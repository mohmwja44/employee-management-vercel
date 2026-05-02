import { defineConfig } from "drizzle-kit";

let connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

// Add SSL parameters for TiDB Cloud
if (connectionString && connectionString.includes('tidbcloud.com')) {
  const separator = connectionString.includes('?') ? '&' : '?';
  connectionString = connectionString + separator + 'ssl={"rejectUnauthorized":false}';
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: connectionString,
  },
  strict: true,
});

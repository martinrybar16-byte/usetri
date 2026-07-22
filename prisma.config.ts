import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Used by the Prisma CLI (migrate/introspect). The runtime client gets its
    // connection via the pg driver adapter in src/lib/db.ts.
    url: process.env.DATABASE_URL,
  },
});

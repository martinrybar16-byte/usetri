/**
 * Promote a user to ADMIN role.
 * Usage: npx tsx scripts/make-admin.ts email@example.com
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const email = process.argv[2];
if (!email) {
  console.error("Usage: npx tsx scripts/make-admin.ts <email>");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

prisma.user
  .update({ where: { email: email.toLowerCase() }, data: { role: "ADMIN" } })
  .then((u) => console.log(`${u.email} is now ADMIN`))
  .catch((e) => {
    console.error(e.code === "P2025" ? `No user with email ${email}` : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

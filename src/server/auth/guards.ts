import "server-only";
import { redirect } from "next/navigation";

import { auth } from "@/auth";

/** Server-side gate for admin pages/actions (proxy.ts is the first gate). */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");
  return session.user;
}

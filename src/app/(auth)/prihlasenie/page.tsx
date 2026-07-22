import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Prihlásenie" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ obnovene?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/");

  const { obnovene } = await searchParams;
  return <LoginForm resetDone={obnovene === "1"} />;
}

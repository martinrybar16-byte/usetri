import Link from "next/link";
import { ClipboardCheck, FileUp, LayoutDashboard } from "lucide-react";

import { requireAdmin } from "@/server/auth/guards";

const NAV = [
  { href: "/admin", label: "Prehľad", icon: LayoutDashboard },
  { href: "/admin/letaky", label: "Letáky", icon: FileUp },
  { href: "/admin/kontrola", label: "Kontrola AI", icon: ClipboardCheck },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="mx-auto flex max-w-7xl gap-8 px-4 py-8 sm:px-6">
      <aside className="hidden w-48 shrink-0 md:block">
        <p className="px-3 pb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Administrácia
        </p>
        <nav className="space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Mobile nav */}
        <nav className="mb-6 flex gap-2 overflow-x-auto md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg border border-border/60 px-3 py-1.5 text-sm whitespace-nowrap"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {children}
      </div>
    </div>
  );
}

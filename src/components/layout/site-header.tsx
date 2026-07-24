import Link from "next/link";
import { Search } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { MobileNav } from "@/components/layout/mobile-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { SearchBox } from "@/components/search/search-box";

const NAV_ITEMS = [
  { href: "/zlavy", key: "discounts" },
  { href: "/produkty", key: "products" },
  { href: "/letaky", key: "leaflets" },
  { href: "/obchody", key: "stores" },
  { href: "/kategorie", key: "categories" },
] as const;

export async function SiteHeader() {
  const t = await getTranslations();
  const session = await auth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <MobileNav />

        <Link href="/" className="text-xl font-bold tracking-tight">
          Ušetri<span className="text-primary">.</span>
        </Link>

        <nav className="ml-6 hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {t(`nav.${item.key}`)}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden w-64 lg:block">
            <SearchBox />
          </div>
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label={t("common.search")}
          >
            <Link href="/vyhladavanie">
              <Search className="size-5" />
            </Link>
          </Button>

          <ThemeToggle />

          {session?.user ? (
            <UserMenu
              name={session.user.name ?? null}
              email={session.user.email ?? ""}
              isAdmin={session.user.role === "ADMIN"}
            />
          ) : (
            <>
              <Button asChild variant="ghost" className="hidden sm:inline-flex">
                <Link href="/prihlasenie">{t("nav.login")}</Link>
              </Button>
              <Button asChild>
                <Link href="/registracia">{t("nav.register")}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

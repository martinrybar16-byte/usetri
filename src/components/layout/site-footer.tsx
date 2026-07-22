import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function SiteFooter() {
  const t = await getTranslations();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/60 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <p className="text-lg font-bold tracking-tight">
              Ušetri<span className="text-primary">.</span>
            </p>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              {t("footer.description")}
            </p>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold">{t("footer.explore")}</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/zlavy" className="transition-colors hover:text-foreground">{t("nav.discounts")}</Link></li>
              <li><Link href="/letaky" className="transition-colors hover:text-foreground">{t("nav.leaflets")}</Link></li>
              <li><Link href="/obchody" className="transition-colors hover:text-foreground">{t("nav.stores")}</Link></li>
              <li><Link href="/kategorie" className="transition-colors hover:text-foreground">{t("nav.categories")}</Link></li>
            </ul>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold">{t("footer.account")}</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/prihlasenie" className="transition-colors hover:text-foreground">{t("nav.login")}</Link></li>
              <li><Link href="/registracia" className="transition-colors hover:text-foreground">{t("nav.register")}</Link></li>
              <li><Link href="/zoznamy" className="transition-colors hover:text-foreground">{t("nav.shoppingLists")}</Link></li>
              <li><Link href="/oblubene" className="transition-colors hover:text-foreground">{t("nav.favorites")}</Link></li>
            </ul>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold">{t("footer.legal")}</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/ochrana-sukromia" className="transition-colors hover:text-foreground">{t("footer.privacy")}</Link></li>
              <li><Link href="/podmienky" className="transition-colors hover:text-foreground">{t("footer.terms")}</Link></li>
              <li><Link href="/kontakt" className="transition-colors hover:text-foreground">{t("footer.contact")}</Link></li>
            </ul>
          </div>
        </div>

        <p className="mt-10 border-t border-border/60 pt-6 text-xs text-muted-foreground">
          {t("footer.copyright", { year })}
        </p>
      </div>
    </footer>
  );
}

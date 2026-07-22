import Link from "next/link";
import { ArrowRight, Bell, ScanSearch, ShoppingCart } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { getHomepageData } from "@/server/services/catalog";
import { getRecommendations } from "@/server/services/recommendations";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OfferSection, SectionHeader } from "@/components/catalog/section";
import { LeafletCard } from "@/components/catalog/leaflet-card";

const FEATURES = [
  {
    icon: ScanSearch,
    title: "Všetky letáky na jednom mieste",
    description:
      "Umelá inteligencia každý týždeň prečíta akciové letáky všetkých reťazcov a premení ich na prehľadné ponuky s cenami a zľavami.",
  },
  {
    icon: ShoppingCart,
    title: "Porovnanie celého nákupu",
    description:
      "Vytvorte si nákupný zoznam a Ušetri spočíta, kde nakúpite najlacnejšie — vrátane rozdelenia nákupu medzi dva obchody.",
  },
  {
    icon: Bell,
    title: "Upozornenia na vaše obľúbené",
    description:
      "Sledujte produkty, značky aj obchody. Keď sa objaví zľava, pošleme vám e-mail — okamžite alebo v prehľadnom súhrne.",
  },
];

export default async function HomePage() {
  const t = await getTranslations("home");
  const [{ topDiscounts, endingSoon, newest, leaflets, chains }, session] =
    await Promise.all([getHomepageData(), auth()]);
  const recommended = session?.user
    ? await getRecommendations(session.user.id)
    : [];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,--theme(--color-primary/8%),transparent)]"
        />
        <div className="mx-auto max-w-7xl px-4 pt-16 pb-12 text-center sm:px-6 sm:pt-24 sm:pb-16">
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-6xl">
            {t("heroTitle")}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-pretty text-muted-foreground">
            {t("heroSubtitle")}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="gap-2">
              <Link href="/zlavy">
                {t("heroCta")}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/registracia">{t("heroSecondaryCta")}</Link>
            </Button>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-2">
            {chains.map((chain) => (
              <Link
                key={chain.id}
                href={`/obchody/${chain.slug}`}
                className="rounded-full border border-border/60 bg-muted/40 px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-border hover:text-foreground"
              >
                {chain.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <OfferSection
        title={t("recommended")}
        offers={recommended}
      />

      <OfferSection
        title={t("todaysBest")}
        href="/zlavy"
        linkLabel={t("showAllLink")}
        offers={topDiscounts}
      />

      {/* Newest leaflets */}
      {leaflets.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <SectionHeader
            title={t("newestLeaflets")}
            href="/letaky"
            linkLabel={t("showAllLink")}
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
            {leaflets.map((leaflet) => (
              <LeafletCard key={leaflet.id} leaflet={leaflet} />
            ))}
          </div>
        </section>
      )}

      <OfferSection
        title={t("endingSoon")}
        href="/zlavy?zoradenie=konci"
        linkLabel={t("showAllLink")}
        offers={endingSoon}
      />

      <OfferSection
        title={t("newDeals")}
        href="/zlavy?zoradenie=najnovsie"
        linkLabel={t("showAllLink")}
        offers={newest}
      />

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-5 md:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card key={feature.title} className="border-border/60">
              <CardContent className="space-y-3">
                <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10">
                  <feature.icon className="size-5 text-primary" />
                </div>
                <h2 className="text-lg font-semibold tracking-tight">
                  {feature.title}
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

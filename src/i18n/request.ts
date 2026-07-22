import { getRequestConfig } from "next-intl/server";

/**
 * Single-locale setup for launch (Slovak). Multi-country expansion later
 * switches this to cookie/domain-based locale resolution — message catalogs
 * and all UI strings are already externalized, so no component changes needed.
 */
export default getRequestConfig(async () => {
  const locale = "sk";

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
    timeZone: "Europe/Bratislava",
  };
});

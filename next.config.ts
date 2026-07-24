import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "fexuxibvzksnlgokgwfr.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        // Open Food Facts product photos (ODbL — attributed in the UI)
        protocol: "https",
        hostname: "images.openfoodfacts.org",
        pathname: "/images/products/**",
      },
    ],
  },
};

export default withNextIntl(nextConfig);

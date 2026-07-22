import { inngest } from "@/inngest/client";
import { db } from "@/lib/db";

/** Hourly: expire offers/leaflets past validity. History rows stay forever. */
export const expireOffers = inngest.createFunction(
  {
    id: "expire-offers",
    triggers: [{ cron: "TZ=Europe/Bratislava 5 * * * *" }],
  },
  async ({ step }) => {
    const now = new Date();

    const offers = await step.run("expire-offers", () =>
      db.offer.updateMany({
        where: { status: "PUBLISHED", validTo: { lt: now } },
        data: { status: "EXPIRED" },
      })
    );

    const leaflets = await step.run("expire-leaflets", () =>
      db.leaflet.updateMany({
        where: { status: "PUBLISHED", validTo: { lt: now } },
        data: { status: "EXPIRED" },
      })
    );

    return { expiredOffers: offers.count, expiredLeaflets: leaflets.count };
  }
);

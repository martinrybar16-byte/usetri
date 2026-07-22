import { inngest } from "@/inngest/client";
import { fanOutOffers } from "@/server/services/notify";

/** After a leaflet publish: match new offers to user preferences and notify. */
export const notifyOffers = inngest.createFunction(
  {
    id: "notify-offers",
    retries: 2,
    triggers: [{ event: "offers/published" }],
  },
  async ({ event, step }) => {
    const { offerIds } = event.data as { offerIds: string[] };

    return step.run("fan-out", () => fanOutOffers(offerIds));
  }
);

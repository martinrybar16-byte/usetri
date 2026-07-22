import { serve } from "inngest/next";

import { inngest } from "@/inngest/client";
import { processLeaflet } from "@/inngest/functions/process-leaflet";
import { expireOffers } from "@/inngest/functions/expire-offers";
import { notifyOffers } from "@/inngest/functions/notify-offers";
import { dailyDigest, weeklyDigest } from "@/inngest/functions/digests";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processLeaflet, expireOffers, notifyOffers, dailyDigest, weeklyDigest],
});

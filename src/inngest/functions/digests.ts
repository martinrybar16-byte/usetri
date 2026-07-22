import { inngest } from "@/inngest/client";
import { runDigest } from "@/server/services/notify";

/** Daily digest — 07:00 Bratislava. */
export const dailyDigest = inngest.createFunction(
  {
    id: "daily-digest",
    triggers: [{ cron: "TZ=Europe/Bratislava 0 7 * * *" }],
  },
  async ({ step }) => {
    const sent = await step.run("send-daily", () => runDigest("DAILY"));
    return { sent };
  }
);

/** Weekly digest — Thursday 07:00 Bratislava (leaflet turnover day). */
export const weeklyDigest = inngest.createFunction(
  {
    id: "weekly-digest",
    triggers: [{ cron: "TZ=Europe/Bratislava 0 7 * * 4" }],
  },
  async ({ step }) => {
    const sent = await step.run("send-weekly", () => runDigest("WEEKLY"));
    return { sent };
  }
);

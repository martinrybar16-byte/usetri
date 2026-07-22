import { Inngest } from "inngest";

/**
 * Events:
 *  - "leaflet/uploaded"  data: { leafletId: string }
 *  - "offers/published"  data: { leafletId: string; offerIds: string[] }
 */
export const inngest = new Inngest({ id: "usetri" });

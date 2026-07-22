import { NextRequest, NextResponse } from "next/server";

import { suggest } from "@/server/services/search";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const suggestions = await suggest(q);

  return NextResponse.json(suggestions, {
    headers: {
      // Same query strings are cacheable at the edge for a minute
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}

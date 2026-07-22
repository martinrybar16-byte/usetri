import "server-only";
import Anthropic from "@anthropic-ai/sdk";

import {
  extractionResponseSchema,
  type ExtractedItemRaw,
} from "@/server/services/extraction/schema";

/**
 * Vendor seam (ARCHITECTURE.md §2.4): the pipeline only knows this interface.
 * Default implementation targets Anthropic Claude vision; an OpenAI
 * implementation can be added and selected via EXTRACTION_PROVIDER.
 */
export interface ExtractionProvider {
  readonly model: string;
  extractPage(pageImage: Buffer, context: PageContext): Promise<ExtractedItemRaw[]>;
}

export type PageContext = {
  chainName: string;
  validFrom: string; // ISO date
  validTo: string;
  pageNumber: number;
};

const SYSTEM_PROMPT = `You are an expert at reading Slovak supermarket promotional leaflets (akciové letáky).

You receive one leaflet page image. Extract EVERY distinct product offer visible on the page.

Rules:
- "name": full product name in Slovak exactly as printed (without the brand if the brand is a separate field). Fix obvious OCR-style casing issues.
- "brand": brand name if identifiable (e.g. "Rajo", "Coca-Cola", "Milka"), else null.
- "unit_size": package size as printed ("1 l", "500 g", "4×100 g"), else null.
- "price": the promotional price in EUR as a number. Prices like "0,89" mean 0.89. A price printed as "189" with a small superscript usually means 1.89 — use the visually correct interpretation.
- "original_price": the crossed-out / previous price in EUR, else null.
- "discount_pct": the printed discount percentage (e.g. "-30%"), else null. Do not compute it yourself.
- "conditions": purchase conditions if printed ("s kartou", "pri kúpe 2 ks", "od 2 kusov"), else null.
- "category_guess": one of: mlieko, syry, jogurty, maslo-tuky, vajcia, kuracie, bravcove, hovadzie, udeniny, ryby, chlieb, rozky-bagety, sladke-pecivo, cestoviny, ryza-strukoviny, konzervy, olej-ocot, muka-cukor, omacky-korenie, cokolady, susienky, cipsy-slane, voda, dzusy-limonady, kava-caj, energeticke-napoje, pivo, vino, liehoviny, mrazena-zelenina, zmrzlina, mrazene-jedla, bio, proteinove, bezlepkove, pranie-cistenie, osobna-hygiena, kozmetika, detska-vyziva, plienky, krmivo-psy, krmivo-macky, ovocie, zelenina, domacnost. Pick the closest, else null.
- "flags": mark bio/vegan/glutenFree/lactoseFree only when explicitly printed.
- "bbox": bounding box of the product tile in RELATIVE coordinates (0-1), where x,y is the top-left corner: {"x":0.1,"y":0.2,"w":0.25,"h":0.3}. Estimate generously so the product photo is inside the box.
- "confidence": your confidence 0-1 that name AND price are correct. Use < 0.7 when the price or name is partially obscured or ambiguous.

Skip: navigation elements, store info, prize competitions, pure branding without a price.
Do not invent products. If the page has no product offers, return {"items":[]}.

Respond with ONLY valid JSON: {"items":[...]} — no markdown, no commentary.`;

class AnthropicExtractionProvider implements ExtractionProvider {
  readonly model = process.env.EXTRACTION_MODEL || "claude-sonnet-5";
  private client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  async extractPage(pageImage: Buffer, ctx: PageContext): Promise<ExtractedItemRaw[]> {
    const userText = `Leaflet: ${ctx.chainName}, page ${ctx.pageNumber}. Offer validity: ${ctx.validFrom} to ${ctx.validTo}. Extract all product offers.`;

    const attempt = async (extraHint?: string): Promise<ExtractedItemRaw[]> => {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/webp",
                  data: pageImage.toString("base64"),
                },
              },
              { type: "text", text: extraHint ? `${userText}\n${extraHint}` : userText },
            ],
          },
        ],
      });

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("");

      // Tolerate accidental markdown fences
      const jsonText = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      const parsed = extractionResponseSchema.safeParse(JSON.parse(jsonText));
      if (!parsed.success) {
        throw new Error(`Schema validation failed: ${parsed.error.issues[0]?.message}`);
      }
      return parsed.data.items;
    };

    try {
      return await attempt();
    } catch (firstError) {
      // One retry with an explicit format reminder
      try {
        return await attempt(
          'REMINDER: respond with ONLY the JSON object {"items":[...]} and nothing else.'
        );
      } catch {
        console.error(
          `[extraction] page ${ctx.pageNumber} failed twice:`,
          firstError instanceof Error ? firstError.message : firstError
        );
        return [];
      }
    }
  }
}

export function getExtractionProvider(): ExtractionProvider {
  // EXTRACTION_PROVIDER env switches vendors; only Anthropic is implemented now.
  return new AnthropicExtractionProvider();
}

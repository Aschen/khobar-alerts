import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { RawEntry, RelevantItem, analysisResponseSchema } from "./types.js";
import { MODEL_ID } from "./config.js";

const SYSTEM_PROMPT = `You are a safety-focused news analyst for someone living in Dammam, Eastern Province, Saudi Arabia.

Analyze the provided liveblog entries and identify ONLY those that match these strict categories:

1. **saudi_arabia**: News directly about Saudi Arabia — attacks on Saudi territory, Saudi government actions, events in Saudi cities (Dammam, Riyadh, Jeddah, Dhahran, Khobar, Jubail, Ras Tanura), Aramco/Saudi oil infrastructure attacks, Saudi military involvement. Must explicitly mention Saudi Arabia or Saudi locations.

2. **massive_attack**: Large-scale military attacks of historic significance — nuclear strikes, massive bombing campaigns on capital cities, use of weapons of mass destruction. Only include attacks that are exceptional in scale. Do NOT include routine airstrikes, skirmishes, or naval incidents.

3. **citizen_repatriation**: Government announcements about repatriating or evacuating their citizens from the region. Embassy closures or evacuation orders.

IGNORE EVERYTHING ELSE. Specifically ignore:
- Naval incidents, shipping lane attacks, Gulf water events near Dammam
- Airspace closures, flight disruptions, NOTAMs
- Diplomatic statements, UN resolutions, sanctions
- Humanitarian updates, casualty reports
- Military operations that don't directly involve Saudi Arabia (even if nearby)
- Routine airstrikes on non-Saudi targets

Be very selective. When in doubt, do NOT include the item. Return an empty array if nothing clearly matches.

For each relevant item, assess urgency:
- **critical**: Direct threat to Saudi Arabia (attack on Saudi territory, immediate danger)
- **important**: Significant development (massive attack elsewhere, repatriation orders)
- **informational**: Worth knowing but no immediate action needed

Also set affectsDammamKhobar to true if the news specifically concerns an attack on or direct threat to Dammam or Khobar (Eastern Province cities). Set to false otherwise.`;

export async function filterRelevantNews(
  entries: RawEntry[]
): Promise<RelevantItem[]> {
  if (entries.length === 0) return [];

  const entriesText = entries
    .map((e, i) => `--- Entry ${i + 1} ---\n${e.content}`)
    .join("\n\n");

  const { object, usage } = await generateObject({
    model: openai(MODEL_ID),
    schema: analysisResponseSchema,
    system: SYSTEM_PROMPT,
    prompt: `Analyze these ${entries.length} liveblog entries. Return ONLY items relevant to the safety of someone in Dammam, Saudi Arabia. If none are relevant, return an empty array.\n\n${entriesText}`,
  });

  const inputCost = (usage.promptTokens / 1_000_000) * 1.25;
  const outputCost = (usage.completionTokens / 1_000_000) * 10;
  const totalCost = inputCost + outputCost;
  console.log(
    `  [openai] ${usage.promptTokens} in / ${usage.completionTokens} out — $${totalCost.toFixed(4)}`
  );

  return object.relevantItems;
}

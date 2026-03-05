import { z } from "zod";

export interface AppState {
  currentUrl: string;
  seenHashes: string[];
  postedHeadlines: string[];
  lastChecked: string;
}

export interface RawEntry {
  content: string;
  hash: string;
}

export const relevantItemSchema = z.object({
  headline: z.string().describe("Short headline summarizing the news"),
  summary: z
    .string()
    .describe("2-3 sentence summary of why this is relevant to safety"),
  category: z
    .enum(["saudi_arabia", "massive_attack", "citizen_repatriation"])
    .describe("Classification category"),
  urgency: z
    .enum(["critical", "important", "informational"])
    .describe("How urgent this is for someone in Dammam"),
  sourceExcerpt: z
    .string()
    .describe("Brief quote from the original entry"),
  publishedDate: z
    .string()
    .describe("The publication date/time of the entry as written in the liveblog, e.g. '3 March 2026, 14:32 GMT'"),
  affectsDammamKhobar: z
    .boolean()
    .describe("True if the news specifically concerns an attack on or direct threat to Dammam or Khobar"),
});

export const analysisResponseSchema = z.object({
  relevantItems: z.array(relevantItemSchema),
});

export type RelevantItem = z.infer<typeof relevantItemSchema>;
export type AnalysisResponse = z.infer<typeof analysisResponseSchema>;

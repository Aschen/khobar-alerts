import FirecrawlApp from "@mendable/firecrawl-js";
import { RawEntry } from "./types.js";
import { BASE_URL } from "./config.js";
import { hashContent } from "./state.js";

const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY!,
});

export async function scrapeLiveblog(
  url: string
): Promise<string | null> {
  const response = await firecrawl.scrapeUrl(url, {
    formats: ["markdown"],
    onlyMainContent: false,
    waitFor: 3000,
  });

  if (!response.success) {
    console.error("Firecrawl scrape failed:", response.error);
    return null;
  }

  return response.markdown ?? null;
}

export function parseEntries(markdown: string): RawEntry[] {
  // Try splitting by H2/H3 headers first
  const headerPattern = /^#{2,3}\s+/m;
  let sections: string[];

  if (headerPattern.test(markdown)) {
    sections = markdown
      .split(/(?=^#{2,3}\s+)/m)
      .map((s) => s.trim())
      .filter((s) => s.length > 50);
  } else if (markdown.includes("---")) {
    // Fallback: split by horizontal rules
    sections = markdown
      .split(/^---+$/m)
      .map((s) => s.trim())
      .filter((s) => s.length > 50);
  } else {
    // Last resort: treat entire page as single entry
    sections = markdown.trim().length > 50 ? [markdown.trim()] : [];
  }

  return sections.map((content) => ({
    content,
    hash: hashContent(content),
  }));
}

export function detectNextDayUrl(markdown: string): string | null {
  // Look for "This live page is now closed" or similar
  const closedPattern =
    /this live (?:page|blog|coverage) is (?:now )?closed/i;

  if (!closedPattern.test(markdown)) {
    return null;
  }

  // Extract the next-day link — look for a link near the "closed" text
  const closedSection = markdown.slice(
    Math.max(0, markdown.search(closedPattern) - 200)
  );

  // Match markdown links
  const linkPattern = /\[([^\]]*)\]\(([^)]+)\)/g;
  let match;

  while ((match = linkPattern.exec(closedSection)) !== null) {
    const href = match[2];
    if (
      href.includes("liveblog") ||
      href.includes("live-") ||
      href.includes("/live/")
    ) {
      // Return absolute URL
      if (href.startsWith("http")) return href;
      return `${BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`;
    }
  }

  return null;
}

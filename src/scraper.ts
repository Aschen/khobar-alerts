import { writeFileSync } from "fs";
import { RawEntry } from "./types.js";
import { BASE_URL } from "./config.js";
import { hashContent } from "./state.js";

function stripHtml(html: string): string {
  // Extract just the liveblog article body
  const articleMatch = html.match(
    /<article[^>]*class="[^"]*liveblog[^"]*"[^>]*>([\s\S]*?)<\/article>/i
  );
  const body = articleMatch?.[1] ?? html;

  return (
    body
      // Remove script/style/noscript tags and contents
      .replace(/<(script|style|noscript|svg|head)[^>]*>[\s\S]*?<\/\1>/gi, "")
      // Remove HTML comments
      .replace(/<!--[\s\S]*?-->/g, "")
      // Remove all attributes except href
      .replace(/<([a-z][a-z0-9]*)\s+(?:[^>]*?(href="[^"]*")[^>]*|[^>]*)>/gi, "<$1 $2>")
      // Remove tags that carry no text content
      .replace(/<\/?(?:img|br|hr|input|meta|link|source|picture|figure|figcaption|button|form|nav|footer|header|aside|iframe)[^>]*>/gi, "")
      // Collapse remaining tags to simple markers
      .replace(/<\/(?:div|section|article|p|li|ul|ol|blockquote)>/gi, "\n")
      .replace(/<(?:div|section|article|p|li|ul|ol|blockquote)[^>]*>/gi, "")
      .replace(/<h([1-6])[^>]*>/gi, "\n## ")
      .replace(/<\/h[1-6]>/gi, "\n")
      .replace(/<a\s*href="([^"]*)"[^>]*>/gi, "[$1](")
      .replace(/<\/a>/gi, ")")
      // Strip remaining tags
      .replace(/<[^>]+>/g, "")
      // Decode common HTML entities
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&nbsp;/g, " ")
      // Clean up whitespace
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

export async function scrapeLiveblog(
  url: string
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://production-sfo.browserless.io/chrome/content?timeout=60000&token=${process.env.BROWSERLESS_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      }
    );

    if (!res.ok) {
      console.error(`Browserless failed: ${res.status} ${res.statusText}`);
      return null;
    }

    const html = await res.text();
    writeFileSync("data/last-scrape.html", html);
    const text = stripHtml(html);
    writeFileSync("data/last-scrape.txt", text);
    console.log(
      `  [debug] Scraped ${html.length} chars HTML → ${text.length} chars text`
    );

    return text;
  } catch (error) {
    console.error("Scrape failed:", error);
    return null;
  }
}

export function parseEntries(text: string): RawEntry[] {
  // Split by H2 headers (## ...)
  const headerPattern = /^## /m;
  let sections: string[];

  if (headerPattern.test(text)) {
    sections = text
      .split(/(?=^## )/m)
      .map((s) => s.trim())
      .filter((s) => s.length > 50);
  } else if (text.includes("---")) {
    sections = text
      .split(/^---+$/m)
      .map((s) => s.trim())
      .filter((s) => s.length > 50);
  } else {
    sections = text.trim().length > 50 ? [text.trim()] : [];
  }

  return sections.map((content) => ({
    content,
    hash: hashContent(content),
  }));
}

export function detectNextDayUrl(text: string): string | null {
  const closedPattern =
    /this live (?:page|blog|coverage) is (?:now )?closed/i;

  if (!closedPattern.test(text)) {
    return null;
  }

  const closedSection = text.slice(
    Math.max(0, text.search(closedPattern) - 200)
  );

  // Match markdown-style links we created: [href](text)
  const linkPattern = /\[([^\]]*)\]\(([^)]*)\)/g;
  let match;

  while ((match = linkPattern.exec(closedSection)) !== null) {
    const href = match[1]; // href is now in brackets
    if (
      href.includes("liveblog") ||
      href.includes("live-") ||
      href.includes("/live/")
    ) {
      if (href.startsWith("http")) return href;
      return `${BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`;
    }
  }

  // Also check raw URLs in the text
  const urlPattern = /(https?:\/\/[^\s)]+(?:liveblog|live-|\/live\/)[^\s)]*)/g;
  while ((match = urlPattern.exec(closedSection)) !== null) {
    return match[1];
  }

  return null;
}

import { appendFileSync, mkdirSync, existsSync } from "fs";
import { dirname } from "path";
import { RelevantItem } from "./types.js";
import { TIMEZONE, ALERTS_LOG } from "./config.js";

const URGENCY_ICONS: Record<string, string> = {
  critical: "[!!!]",
  important: "[!!]",
  informational: "[i]",
};

const CATEGORY_LABELS: Record<string, string> = {
  saudi_arabia: "SAUDI ARABIA",
  massive_attack: "MASSIVE ATTACK",
  citizen_repatriation: "REPATRIATION",
};

function timestamp(): string {
  return new Date().toLocaleString("en-US", { timeZone: TIMEZONE });
}

export function displayResults(items: RelevantItem[]): void {
  if (items.length === 0) {
    console.log(`\n[${timestamp()}] No new relevant alerts.`);
    return;
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`  IRAN WATCH ALERT — ${timestamp()}`);
  console.log(`${"=".repeat(60)}`);

  for (const item of items) {
    const icon = URGENCY_ICONS[item.urgency] ?? "[?]";
    const category = CATEGORY_LABELS[item.category] ?? item.category;

    console.log(`\n${icon} ${category} | ${item.urgency.toUpperCase()} | ${item.publishedDate}`);
    console.log(`    ${item.headline}`);
    console.log(`    ${item.summary}`);
    console.log(`    > "${item.sourceExcerpt}"`);
  }

  console.log(`\n${"=".repeat(60)}\n`);
}

export function logToFile(items: RelevantItem[]): void {
  if (items.length === 0) return;

  const dir = dirname(ALERTS_LOG);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const ts = timestamp();
  const lines = items.map((item) => {
    const icon = URGENCY_ICONS[item.urgency] ?? "[?]";
    const category = CATEGORY_LABELS[item.category] ?? item.category;
    return `[${ts}] ${icon} ${category} | ${item.headline} — ${item.summary}`;
  });

  appendFileSync(ALERTS_LOG, lines.join("\n") + "\n");
}

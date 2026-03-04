import "dotenv/config";
import cron from "node-cron";
import { CRON_SCHEDULE, TIMEZONE } from "./config.js";
import { loadState, saveState } from "./state.js";
import { scrapeLiveblog, parseEntries, detectNextDayUrl } from "./scraper.js";
import { filterRelevantNews } from "./analyzer.js";
import { displayResults, logToFile } from "./display.js";
import { publishToSlack } from "./slack.js";
import { sendTelegramAlert } from "./telegram.js";

function validateEnv(): void {
  const required = ["OPENAI_API_KEY", "SLACK_BOT_TOKEN"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`Missing environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }
}

let isRunning = false;

async function check(): Promise<void> {
  if (isRunning) {
    console.log("Previous check still running, skipping...");
    return;
  }

  isRunning = true;

  try {
    const state = loadState();
    console.log(`\nChecking: ${state.currentUrl}`);

    // Scrape the liveblog
    const markdown = await scrapeLiveblog(state.currentUrl);
    if (!markdown) {
      console.error("Failed to scrape, will retry next cycle");
      return;
    }

    // Parse entries and deduplicate
    const allEntries = parseEntries(markdown);
    const seenSet = new Set(state.seenHashes);
    const newEntries = allEntries.filter((e) => !seenSet.has(e.hash));

    console.log(
      `Found ${allEntries.length} entries, ${newEntries.length} new`
    );

    // Mark all entries as seen (before analysis, to avoid re-processing on failure)
    for (const entry of newEntries) {
      const title = entry.content.split("\n")[0].replace(/^#+\s*/, "").trim();
      console.log(`  • ${title.slice(0, 100)}`);
      state.seenHashes.push(entry.hash);
    }

    // Analyze new entries with AI
    if (newEntries.length > 0) {
      const relevant = await filterRelevantNews(newEntries);
      displayResults(relevant);
      logToFile(relevant);
      await publishToSlack(relevant, state.currentUrl);
      await sendTelegramAlert(relevant, state.currentUrl);
    } else {
      console.log("No new entries to analyze.");
    }

    // Check for page transition
    const nextUrl = detectNextDayUrl(markdown);
    if (nextUrl && nextUrl !== state.currentUrl) {
      console.log(`\nPage closed. Following to: ${nextUrl}`);
      state.currentUrl = nextUrl;
      saveState(state);

      // Immediately check the new page
      isRunning = false;
      await check();
      return;
    }

    saveState(state);
  } catch (error) {
    console.error("Check failed:", error);
  } finally {
    isRunning = false;
  }
}

async function main(): Promise<void> {
  validateEnv();

  console.log("Iran Watch — Liveblog Monitor");
  console.log("Monitoring for safety-relevant news in Dammam, Saudi Arabia");
  console.log(`Schedule: every 5 minutes (${TIMEZONE})\n`);

  // Run initial check
  await check();

  // Schedule periodic checks
  cron.schedule(CRON_SCHEDULE, () => {
    check();
  });

  console.log("Scheduler started. Press Ctrl+C to exit.");
}

main();

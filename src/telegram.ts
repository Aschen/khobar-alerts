import { RelevantItem } from "./types.js";
import { TELEGRAM_CHAT_ID } from "./config.js";

const URGENCY_ICONS: Record<string, string> = {
  critical: "\u{1F6A8}",
  important: "\u26A0\uFE0F",
  informational: "\u2139\uFE0F",
};

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

export async function sendTelegramAlert(
  items: RelevantItem[],
  sourceUrl: string
): Promise<void> {
  if (!process.env.TELEGRAM_BOT_TOKEN) return;

  const dammamItems = items.filter((item) => item.affectsDammamKhobar);
  if (dammamItems.length === 0) return;

  for (const item of dammamItems) {
    const icon = URGENCY_ICONS[item.urgency] ?? "\u2753";
    const message = `${icon} *IRAN WATCH — Dammam/Khobar Alert*\n\n*${item.headline}*\n${item.summary}\n\n_"${item.sourceExcerpt}"_\n${item.publishedDate} · [Source](${sourceUrl})`;

    try {
      const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: "Markdown",
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        console.error(`Telegram alert failed: ${res.status} ${body}`);
      }
    } catch (error) {
      console.error(`Telegram alert failed: ${error}`);
    }
  }
}

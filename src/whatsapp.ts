import { RelevantItem } from "./types.js";
import { WHATSAPP_PHONE } from "./config.js";

const URGENCY_ICONS: Record<string, string> = {
  critical: "🚨",
  important: "⚠️",
  informational: "ℹ️",
};

export async function sendWhatsAppAlert(
  items: RelevantItem[]
): Promise<void> {
  const apiKey = process.env.CALLMEBOT_API_KEY;
  if (!apiKey) return;

  const dammamItems = items.filter((item) => item.affectsDammamKhobar);
  if (dammamItems.length === 0) return;

  for (const item of dammamItems) {
    const icon = URGENCY_ICONS[item.urgency] ?? "❓";
    const message = `${icon} *IRAN WATCH — Dammam/Khobar Alert*\n\n*${item.headline}*\n${item.summary}\n\n_"${item.sourceExcerpt}"_`;

    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(WHATSAPP_PHONE)}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(apiKey)}`;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`WhatsApp alert failed: ${res.status} ${res.statusText}`);
      }
    } catch (error) {
      console.error(`WhatsApp alert failed: ${error}`);
    }
  }
}

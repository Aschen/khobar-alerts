import { WebClient } from "@slack/web-api";
import { RelevantItem } from "./types.js";
import { SLACK_CHANNEL_ID, SLACK_TAG_USER_ID } from "./config.js";

const URGENCY_EMOJIS: Record<string, string> = {
  critical: ":rotating_light:",
  important: ":warning:",
  informational: ":information_source:",
};

const CATEGORY_LABELS: Record<string, string> = {
  saudi_arabia: "SAUDI ARABIA",
  massive_attack: "MASSIVE ATTACK",
  citizen_repatriation: "REPATRIATION",
};

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

export async function publishToSlack(items: RelevantItem[], sourceUrl: string): Promise<void> {
  if (items.length === 0) return;

  for (const item of items) {
    const emoji = URGENCY_EMOJIS[item.urgency] ?? ":question:";
    const category = CATEGORY_LABELS[item.category] ?? item.category;

    const tagLine = item.affectsDammamKhobar
      ? `\n\n<@${SLACK_TAG_USER_ID}> ^^^ Dammam/Khobar alert`
      : "";

    try {
      await slack.chat.postMessage({
        channel: SLACK_CHANNEL_ID,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: `${emoji} ${item.headline}`,
              emoji: true,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: item.summary + tagLine,
            },
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `*${category}* · ${item.urgency.toUpperCase()} · ${item.publishedDate} · <${sourceUrl}|Source>`,
              },
              {
                type: "mrkdwn",
                text: `> _${item.sourceExcerpt}_`,
              },
            ],
          },
        ],
        text: `${emoji} ${item.headline} — ${item.summary}${tagLine}`,
        unfurl_links: false,
        unfurl_media: false,
      });
    } catch (error) {
      console.error(`Failed to post to Slack: ${error}`);
    }
  }
}

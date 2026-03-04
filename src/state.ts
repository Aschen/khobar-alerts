import { createHash } from "crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname } from "path";
import { AppState } from "./types.js";
import { INITIAL_URL, STATE_FILE, MAX_SEEN_HASHES } from "./config.js";

const defaultState: AppState = {
  currentUrl: INITIAL_URL,
  seenHashes: [],
  lastChecked: "",
};

export function loadState(): AppState {
  if (!existsSync(STATE_FILE)) {
    return { ...defaultState, seenHashes: [] };
  }

  try {
    const raw = readFileSync(STATE_FILE, "utf-8");
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed.currentUrl || !Array.isArray(parsed.seenHashes)) {
      console.warn("Corrupted state file, resetting to defaults");
      return { ...defaultState, seenHashes: [] };
    }
    return parsed;
  } catch {
    console.warn("Failed to parse state file, resetting to defaults");
    return { ...defaultState, seenHashes: [] };
  }
}

export function saveState(state: AppState): void {
  const dir = dirname(STATE_FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Trim hashes if over limit
  if (state.seenHashes.length > MAX_SEEN_HASHES) {
    state.seenHashes = state.seenHashes.slice(-MAX_SEEN_HASHES);
  }

  state.lastChecked = new Date().toISOString();
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export function hashContent(content: string): string {
  return createHash("sha256").update(content.trim()).digest("hex");
}

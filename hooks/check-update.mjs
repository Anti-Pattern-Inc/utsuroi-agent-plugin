#!/usr/bin/env node
// SessionStart hook: tells the agent when a newer version of this plugin is published.
//
// Notify-only. It never installs or updates anything, and it never blocks the session:
// offline, timeouts and malformed data all end silently with exit code 0.
//
// - Checks at most once a day (a failed check is retried after an hour); the result is cached.
// - The only request is a GET of this plugin's own manifest on GitHub.
// - Opt out with UTSUROI_PLUGIN_UPDATE_CHECK=0 (or CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1).

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const REMOTE_MANIFEST_URL =
  "https://raw.githubusercontent.com/Anti-Pattern-Inc/utsuroi-agent-plugin/main/.claude-plugin/plugin.json";
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const RETRY_INTERVAL_MS = 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 2500;

/** Only plain MAJOR.MINOR.PATCH is accepted, so nothing from the network can reach the agent's context. */
export function parseVersion(value) {
  const match = /^(\d{1,6})\.(\d{1,6})\.(\d{1,6})$/.exec(typeof value === "string" ? value.trim() : "");
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

export function isNewer(latest, installed) {
  const a = parseVersion(latest);
  const b = parseVersion(installed);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
}

export function updateNotice(installed, latest) {
  return [
    `UTSUROI plugin update available: installed ${installed}, latest ${latest}. The skill instructions you are following may be out of date.`,
    "Early in this conversation, tell the user once, in their language, that an update is available and how to apply it:",
    "run `claude plugin marketplace update utsuroi`, then `claude plugin update utsuroi@utsuroi`, then restart Claude Code (or run /reload-plugins).",
    "Do not run these commands yourself unless the user asks. Do not repeat the notice later in the conversation.",
    "The user can turn this check off by setting UTSUROI_PLUGIN_UPDATE_CHECK=0.",
  ].join(" ");
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

async function fetchLatestVersion(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!response.ok) return null;
  const manifest = await response.json();
  return parseVersion(manifest?.version) ? manifest.version.trim() : null;
}

export async function run(env = process.env, now = Date.now()) {
  if (env.UTSUROI_PLUGIN_UPDATE_CHECK === "0" || env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC) return null;

  const root = env.CLAUDE_PLUGIN_ROOT ?? dirname(dirname(fileURLToPath(import.meta.url)));
  const installed = readJson(join(root, ".claude-plugin", "plugin.json"))?.version;
  if (!parseVersion(installed)) return null;

  const cacheDir = env.CLAUDE_PLUGIN_DATA ?? join(tmpdir(), "utsuroi-agent-plugin");
  const cachePath = join(cacheDir, "update-check.json");
  const cache = readJson(cachePath);
  const fresh =
    cache && typeof cache.checkedAt === "number" && now - cache.checkedAt < (cache.latest ? CHECK_INTERVAL_MS : RETRY_INTERVAL_MS);

  let latest = fresh ? cache.latest : null;
  if (!fresh) {
    try {
      latest = await fetchLatestVersion(env.UTSUROI_PLUGIN_UPDATE_URL ?? REMOTE_MANIFEST_URL);
    } catch {
      latest = null;
    }
    try {
      mkdirSync(cacheDir, { recursive: true });
      writeFileSync(cachePath, JSON.stringify({ checkedAt: now, latest }));
    } catch {
      // A read-only data directory only means we check again next time.
    }
  }

  if (!latest || !isNewer(latest, installed)) return null;
  return {
    hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: updateNotice(installed, latest) },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const output = await run();
    if (output) process.stdout.write(`${JSON.stringify(output)}\n`);
  } catch {
    // Never fail the session over an update check.
  }
}

#!/usr/bin/env node
// Release guard: every manifest and the marketplace entry must carry the same version.
// The update check compares the installed version with `main`, so a forgotten bump means no one is told.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => JSON.parse(readFileSync(join(root, path), "utf8"));

const versions = {
  ".claude-plugin/plugin.json": read(".claude-plugin/plugin.json").version,
  ".claude-plugin/marketplace.json": read(".claude-plugin/marketplace.json").plugins?.[0]?.version,
  ".codex-plugin/plugin.json": read(".codex-plugin/plugin.json").version,
  "plugin.json": read("plugin.json").version,
};

const distinct = new Set(Object.values(versions));
for (const [file, version] of Object.entries(versions)) console.log(`${version ?? "(missing)"}\t${file}`);
if (distinct.size !== 1 || distinct.has(undefined)) {
  console.error("Versions differ. Bump every manifest to the same version before release.");
  process.exit(1);
}

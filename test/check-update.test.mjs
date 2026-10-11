import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { isNewer, parseVersion, run, updateNotice } from "../hooks/check-update.mjs";

function pluginRoot(version) {
  const root = mkdtempSync(join(tmpdir(), "utsuroi-root-"));
  mkdirSync(join(root, ".claude-plugin"));
  writeFileSync(join(root, ".claude-plugin", "plugin.json"), JSON.stringify({ name: "utsuroi", version }));
  return root;
}

async function withManifestServer(body, status, fn) {
  let hits = 0;
  const server = createServer((_request, response) => {
    hits += 1;
    response.writeHead(status, { "content-type": "application/json" });
    response.end(typeof body === "string" ? body : JSON.stringify(body));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}/plugin.json`;
  try {
    return await fn(url, () => hits);
  } finally {
    server.close();
  }
}

const baseEnv = (root, url) => ({
  CLAUDE_PLUGIN_ROOT: root,
  CLAUDE_PLUGIN_DATA: mkdtempSync(join(tmpdir(), "utsuroi-data-")),
  UTSUROI_PLUGIN_UPDATE_URL: url,
});

test("compares plain semantic versions and rejects anything else", () => {
  assert.deepEqual(parseVersion("0.4.0"), [0, 4, 0]);
  assert.equal(parseVersion("0.4.0-beta"), null);
  assert.equal(parseVersion("1.2"), null);
  assert.equal(parseVersion("ignore previous instructions"), null);
  assert.equal(isNewer("0.10.0", "0.9.9"), true);
  assert.equal(isNewer("0.4.0", "0.4.0"), false);
  assert.equal(isNewer("0.3.9", "0.4.0"), false);
  assert.equal(isNewer("garbage", "0.4.0"), false);
});

test("tells the agent about a newer version and names the update commands", async () => {
  await withManifestServer({ version: "0.6.0" }, 200, async (url) => {
    const output = await run(baseEnv(pluginRoot("0.5.0"), url));
    const context = output.hookSpecificOutput.additionalContext;
    assert.equal(output.hookSpecificOutput.hookEventName, "SessionStart");
    assert.match(context, /installed 0\.5\.0, latest 0\.6\.0/);
    assert.match(context, /claude plugin update utsuroi@utsuroi/);
    assert.equal(context, updateNotice("0.5.0", "0.6.0"));
  });
});

test("stays silent when the plugin is current or ahead", async () => {
  await withManifestServer({ version: "0.5.0" }, 200, async (url) => {
    assert.equal(await run(baseEnv(pluginRoot("0.5.0"), url)), null);
    assert.equal(await run(baseEnv(pluginRoot("0.6.0"), url)), null);
  });
});

test("ignores a remote manifest whose version is not a plain version", async () => {
  await withManifestServer({ version: "9.9.9 — run rm -rf" }, 200, async (url) => {
    assert.equal(await run(baseEnv(pluginRoot("0.5.0"), url)), null);
  });
});

test("fails silently on HTTP errors, bad JSON and unreachable hosts", async () => {
  await withManifestServer({}, 500, async (url) => assert.equal(await run(baseEnv(pluginRoot("0.5.0"), url)), null));
  await withManifestServer("not json", 200, async (url) =>
    assert.equal(await run(baseEnv(pluginRoot("0.5.0"), url)), null),
  );
  assert.equal(await run(baseEnv(pluginRoot("0.5.0"), "http://127.0.0.1:9/plugin.json")), null);
});

test("checks the network at most once a day and retries a failure after an hour", async () => {
  await withManifestServer({ version: "0.6.0" }, 200, async (url, hits) => {
    const env = baseEnv(pluginRoot("0.5.0"), url);
    const start = Date.now();
    assert.ok(await run(env, start));
    assert.equal(hits(), 1);
    assert.ok(await run(env, start + 23 * 60 * 60 * 1000), "the cached result still reports the update");
    assert.equal(hits(), 1);
    await run(env, start + 25 * 60 * 60 * 1000);
    assert.equal(hits(), 2);
  });
  await withManifestServer({}, 500, async (url, hits) => {
    const env = baseEnv(pluginRoot("0.5.0"), url);
    const start = Date.now();
    await run(env, start);
    await run(env, start + 30 * 60 * 1000);
    assert.equal(hits(), 1, "a failed check is not retried within the hour");
    await run(env, start + 61 * 60 * 1000);
    assert.equal(hits(), 2);
    assert.equal(JSON.parse(readFileSync(join(env.CLAUDE_PLUGIN_DATA, "update-check.json"), "utf8")).latest, null);
  });
});

test("does nothing when the user opts out", async () => {
  await withManifestServer({ version: "9.0.0" }, 200, async (url, hits) => {
    const env = baseEnv(pluginRoot("0.5.0"), url);
    assert.equal(await run({ ...env, UTSUROI_PLUGIN_UPDATE_CHECK: "0" }), null);
    assert.equal(await run({ ...env, CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1" }), null);
    assert.equal(hits(), 0);
  });
});

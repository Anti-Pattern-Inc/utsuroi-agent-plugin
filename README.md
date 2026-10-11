# UTSUROI Agent Plugin

![UTSUROI leaf](./assets/icon.svg)

Connect Codex, Claude Code, or Kiro to [UTSUROI](https://utsuroi.nil0.io) through the official OAuth-protected remote MCP server.

The plugin includes a shared `utsuroi` Agent Skill for reliable task workflows: discovering boards and lanes, searching work, creating and updating tasks, assigning members, managing labels, reviewing activity, safely archiving or restoring tasks, and optionally reading and updating board settings and Slack notifications.

## 0.5.0 — Update notice (Claude Code)

At the start of a Claude Code session the plugin checks once a day whether a newer version is published and, if so, has the agent tell you how to update. It only notifies; it never installs anything. See [Keeping the plugin up to date](#keeping-the-plugin-up-to-date). Plugins older than 0.5.0 have no such check, so update them once by hand.

## 0.4.0 — Edit existing Knowledge

Ask the agent to correct or reorganize an existing document. The `update_knowledge` tool edits its title and/or body, requiring the version read beforehand. Conflicting edits are rejected; the agent must read and merge the latest content before retrying. Routine recording still uses append. Requires a server with this tool; no additional OAuth scope is needed. The existing UI editor remains a whole-body save without conflict detection.

## 0.3.0 — Project knowledge and AI review

With a server that provides the four Knowledge tools, the shared skill reads relevant project knowledge before work and appends durable decisions, constraints, and verified findings afterward. It reports the saved document URL. Read-only lookups do not generate notes. Human review uses the existing AI review label and ball holder; bots still act as the connecting user.

Start with: “Work on this UTSUROI project, keep its decisions in Knowledge, and hand review back to me.” Set the board and project once; subsequent work uses that destination unless you change it. You can also keep one project per bot. This is an organizational convention, not a permissions boundary.

No new OAuth scopes are required. Existing connections with task read/write access do not need reauthorization for Knowledge. Read-only connections still need write access to record results. There are no recording hooks: recording depends on the client loading and following the skill, and only verified durable outcomes are saved. If the tools are missing, update the server before using the loop.

## Supported clients

| Client | Package | Invocation |
| --- | --- | --- |
| Codex | Codex plugin and marketplace | `@UTSUROI` or `$utsuroi` |
| Claude Code | Claude plugin and marketplace | `/utsuroi:utsuroi` or automatic skill use |
| Kiro | Agent Plugins-compatible Power | Automatic activation from UTSUROI task keywords |

## Let your AI set it up

In Claude Code or Codex, give the agent this one sentence:

```text
Set up https://github.com/Anti-Pattern-Inc/utsuroi-agent-plugin
```

**For the agent:** slash commands such as `/plugin` cannot be run by you, so use the shell equivalents of the steps below.

- Claude Code: `claude plugin marketplace add Anti-Pattern-Inc/utsuroi-agent-plugin`, then `claude plugin install utsuroi@utsuroi`
- Codex: `codex plugin marketplace add Anti-Pattern-Inc/utsuroi-agent-plugin`, then `codex plugin add utsuroi@utsuroi`

Then tell the user the two things only they can do: sign in in the browser and approve the connection, and reload (`/reload-plugins` in Claude Code, a new chat in Codex). Do not ask for tokens or write MCP settings by hand. Kiro has no command-line install; point the user to the steps below.

## Install in Codex

Add the GitHub marketplace once:

```sh
codex plugin marketplace add Anti-Pattern-Inc/utsuroi-agent-plugin
```

Then install from the Codex app's Plugins Directory, or with the CLI:

```sh
codex plugin add utsuroi@utsuroi
```

Start a new chat after installation. Select `UTSUROI` with `@UTSUROI`, invoke the skill with `$utsuroi`, or ask naturally for a UTSUROI task operation.

## Install in Claude Code

Run these commands inside Claude Code:

```text
/plugin marketplace add Anti-Pattern-Inc/utsuroi-agent-plugin
/plugin install utsuroi@utsuroi
```

Run `/reload-plugins` if Claude Code asks you to reload. The shared skill is available as `/utsuroi:utsuroi` and can also be invoked automatically.

## Install in Kiro

1. Open the Powers panel.
2. Choose **Add Custom Power**.
3. Choose **Import power from GitHub**.
4. Enter `https://github.com/Anti-Pattern-Inc/utsuroi-agent-plugin`.

Kiro reads the root `plugin.json`, `mcp.json`, and `skills/` directory using the vendor-neutral Agent Plugins format.

## Keeping the plugin up to date

The tools themselves always come from the remote server, so they are current in every session. What can go stale is the local part: the bundled skill instructions. Claude Code, Codex and Kiro each update it differently.

**Claude Code**

- Third-party marketplaces do not auto-update by default. To turn it on: `/plugin` → **Marketplaces** → `utsuroi` → **Enable auto-update**. Updates then arrive after a session starts and apply on the next restart or `/reload-plugins`.
- To update by hand: `claude plugin marketplace update utsuroi`, then `claude plugin update utsuroi@utsuroi`, then restart or `/reload-plugins`.
- Update notice: a `SessionStart` hook (`hooks/check-update.mjs`) compares the installed version with `main` on GitHub at most once a day and asks the agent to tell you when a newer one exists. The only request is a GET of this plugin's own manifest; a failed check is retried after an hour and never blocks the session. Set `UTSUROI_PLUGIN_UPDATE_CHECK=0` to turn it off. It also stays off when `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` is set.

**Codex and Kiro**: the update notice runs only in Claude Code. Refresh the marketplace or re-import the repository from your client's plugin manager.

**Maintainers**: clients decide what is new from the version, so bump all four manifests together (`node scripts/check-versions.mjs` checks they match) and run `node --test test/check-update.test.mjs`.

## Authenticate

The plugin connects to:

```text
https://api.utsuroi.nil0.io/mcp
```

The MCP server supports Dynamic Client Registration. Use your client's MCP or plugin authentication control and complete the browser-based UTSUROI sign-in. No token, client secret, database credential, or backend source code is included in this repository.

The available OAuth scopes are:

- `mcp:tasks.read` for workspace metadata, members, task search and reads, due tasks, events, activity, and Knowledge reads.
- `mcp:tasks.write` for task creation, updates, moves, assignees, labels, comments, archive, restore, and Knowledge creation, append, and version-checked updates.
- `mcp:boards.settings` for reading and updating board settings, card defaults, and board-local Slack connections and notifications.

Board settings access is **off by default** on the connection consent screen, including when the client requests it. Turn on **Read and update board settings** only for a connection that should manage these settings. Existing connections and refresh tokens never gain this permission automatically.

To enable it on an existing connection, use the client's MCP authentication controls to reauthorize and select the new permission. If the option is disabled, the client registration only permits the older task scopes: register the client again, then reconnect. Role restrictions still apply after consent.

## What the agent can do

- Discover boards, lanes, members, labels, and projects.
- Search tasks and list personal or due work.
- Review recent events and cursor-paginated task activity.
- Create individual, bulk, and recurring tasks.
- Update task fields, position, parent, assignees, ball holder, and labels.
- Add comments and create board labels or projects.
- Soft-archive and restore tasks, optionally including subtasks.
- With settings access, read/update board name, color, group, sizing, and new-card defaults.
- With settings access, manage the selected board's Slack channel mappings, notification destinations and schedules, unanswered-mention task selection, and card-comment notifications.

The settings tools are `get_board_settings`, `update_board_settings`, `list_board_slack_channels`, `set_board_slack_channels`, `set_board_slack_unresponded_config`, and `set_board_slack_comment_notify_config`. Settings access does not add guest permission management, recurring-template management, board creation/archive/deletion, or workspace-wide Slack configuration. Existing task tools are unchanged.

Physical deletion and lane-wide bulk mutation are intentionally not exposed.

## Updating to 0.2.0

Update this plugin through your client's plugin manager after the server and consent screen support board settings. Updating the plugin alone does not grant the new OAuth scope. Reauthorize as described above and start a new conversation to load the updated skill and tool list. Older servers without settings tools remain usable for the existing task workflows.

## Security

- Authentication is handled by each client and the UTSUROI OAuth server.
- Credentials are never stored in this repository.
- Task write tools require `mcp:tasks.write`; board settings tools require `mcp:boards.settings`. Settings updates require an owner, admin, or member with all-board access, and reject archived boards or restricted workspaces.
- The Agent Skill resolves board-local IDs before mutations and treats bulk creation as non-atomic.

Report problems through [GitHub Issues](https://github.com/Anti-Pattern-Inc/utsuroi-agent-plugin/issues).

## License

Licensed under the Apache License 2.0. See [LICENSE](./LICENSE).

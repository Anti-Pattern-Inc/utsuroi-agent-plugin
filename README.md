# UTSUROI Agent Plugin

![UTSUROI leaf](./assets/icon.svg)

Connect Codex, Claude Code, or Kiro to [UTSUROI](https://utsuroi.nil0.io) through the official OAuth-protected remote MCP server.

The plugin includes a shared `utsuroi` Agent Skill for reliable task workflows: discovering boards and lanes, searching work, creating and updating tasks, assigning members, managing labels, reviewing activity, and safely archiving or restoring tasks.

## Supported clients

| Client | Package | Invocation |
| --- | --- | --- |
| Codex | Codex plugin and marketplace | `@UTSUROI` or `$utsuroi` |
| Claude Code | Claude plugin and marketplace | `/utsuroi:utsuroi` or automatic skill use |
| Kiro | Agent Plugins-compatible Power | Automatic activation from UTSUROI task keywords |

## Install in Codex

Add the GitHub marketplace once:

```sh
codex plugin marketplace add Anti-Pattern-Inc/utsuroi-agent-plugin
```

Then install from the Codex app's Plugins Directory, or with the CLI:

```sh
codex plugin add utsuroi-agent-plugin@utsuroi
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

## Authenticate

The plugin connects to:

```text
https://api.utsuroi.nil0.io/mcp
```

The MCP server supports Dynamic Client Registration. Use your client's MCP or plugin authentication control and complete the browser-based UTSUROI sign-in. No token, client secret, database credential, or backend source code is included in this repository.

The available OAuth scopes are:

- `mcp:tasks.read` for workspace metadata, members, task search and reads, due tasks, events, and activity.
- `mcp:tasks.write` for task creation, updates, moves, assignees, labels, comments, archive, and restore.

## What the agent can do

- Discover boards, lanes, members, labels, and projects.
- Search tasks and list personal or due work.
- Review recent events and cursor-paginated task activity.
- Create individual, bulk, and recurring tasks.
- Update task fields, position, parent, assignees, ball holder, and labels.
- Add comments and create board labels or projects.
- Soft-archive and restore tasks, optionally including subtasks.

Physical deletion and lane-wide bulk mutation are intentionally not exposed.

## Security

- Authentication is handled by each client and the UTSUROI OAuth server.
- Credentials are never stored in this repository.
- Write tools require both `mcp:tasks.write` and an authorized UTSUROI role.
- The Agent Skill resolves board-local IDs before mutations and treats bulk creation as non-atomic.

Report problems through [GitHub Issues](https://github.com/Anti-Pattern-Inc/utsuroi-agent-plugin/issues).

## License

Licensed under the Apache License 2.0. See [LICENSE](./LICENSE).

---
name: utsuroi
description: Manage UTSUROI workspaces and tasks through the UTSUROI MCP server. Use when the user wants to inspect boards, lanes, members, labels, projects, tasks, due work, activity, or recurring tasks, or to create, update, move, assign, label, comment on, archive, or restore UTSUROI tasks.
---

# UTSUROI

Use the `utsuroi` MCP server as the source of truth for live workspace data. Follow the user's language for all questions and results.

## Core workflow

1. Identify whether the request is a read, a mutation, or a mixed workflow.
2. Verify that the UTSUROI MCP server is connected. If authentication is required, ask the user to complete the client's OAuth flow and then retry.
3. Resolve human-readable board, lane, member, label, project, and task names to IDs with read tools. Never invent or reuse an ID from another board.
4. If one candidate matches, continue. If several plausible candidates remain and the choice changes the result, ask a concise disambiguation question.
5. Use the narrowest tool that expresses the user's intent. Do not simulate a mutation with unrelated tools.
6. Report what was found or changed and include direct UTSUROI URLs returned by the server.

## Reads

- Run unambiguous read requests without asking for confirmation.
- Prefer a purpose-built list tool over broad search when the user asks about their work, due dates, recent changes, or recurring templates.
- Exclude archived tasks unless the user asks for archived or complete results.
- Follow activity cursors until exhausted only when the user asks for the complete history. Otherwise return the first relevant page and say when more results exist.
- Preserve the distinction between task events and comments; do not present one as the other.

## Mutations

- Read [references/workflows.md](references/workflows.md) before any mutation, bulk operation, recurring-task operation, or complex activity query.
- Proceed directly when the target, scope, and requested values are explicit. Ask only for information that materially changes the mutation.
- Use `update_task_fields` only for base fields. Use `move_task`, `set_task_assignees`, `set_task_labels`, and `add_task_comment` for their respective intents.
- Treat assignee and label setters as full replacement operations. For add/remove requests, fetch the task, merge the current IDs, and submit the complete intended set.
- Treat bulk task creation as non-atomic. Report successes and failures by input item, and never retry successful items automatically.
- Archive descendants only when the user explicitly includes subtasks or confirms that scope. Explain that archive is reversible; do not claim that the task was physically deleted.

## Failure handling

- On authentication failure, direct the user to the current client's MCP authentication control; never request or expose an access token.
- On insufficient scope or permission, name the missing read/write access without attempting a workaround.
- On validation failure, retain the user's intended values, correct only the invalid input, and retry only after the correction is clear.
- On partial bulk failure, preserve the returned indices and URLs so the user can distinguish created items from failed items.

## Output

- Match the user's language even though the skill instructions are in English.
- Keep summaries concise. For lists, include title, relevant status or date, and a direct URL when available.
- After a mutation, state exactly what changed. Do not imply that omitted fields were modified.
- If nothing matches, say so plainly and mention the filters used.

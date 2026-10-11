# UTSUROI workflow reference

Use this reference for tool selection and mutation safeguards. Treat the MCP tool schemas returned by the server as authoritative if they differ from this guide.

## Resolve context

1. Call `list_boards` when the board is not already known.
2. Call `get_board_context` after selecting a board to resolve its lanes, labels, and projects in one request.
3. Use `list_lanes`, `list_labels`, or `list_projects` only when a narrower refresh is sufficient.
4. Call `list_members` before resolving assignees or the ball holder.
5. Match names case-insensitively only when the match is unique. Ask the user when multiple active candidates remain.
6. Validate parent tasks, lanes, labels, and projects against the selected board before writing.

Never transfer a lane, label, project, or parent ID between boards merely because the display names match.

## Route reads

| User goal | Preferred tool | Notes |
| --- | --- | --- |
| Find tasks by text | `search_tasks` | Scope by board when known; include archived tasks only when requested. |
| Read or record project knowledge | `list_knowledge`, `get_knowledge`, `create_knowledge`, `append_knowledge` | Follow [knowledge.md](knowledge.md). |
| Correct or reorganize existing knowledge | `get_knowledge`, then `update_knowledge` | Pass the exact `updatedAt` as `expectedUpdatedAt`; re-read and merge on conflict. See [knowledge.md](knowledge.md). |
| Open one exact task | `get_task` | Use before a partial assignee or label change. |
| Show the user's work | `list_my_tasks` | Covers assigned, held, or created tasks. |
| Show overdue, today, or date-window work | `list_due_tasks` | Convert relative dates using the user's current locale and timezone. |
| Summarize recent changes | `list_recent_task_events` | Use for a concise tenant- or board-level feed. |
| Audit filtered or complete history | `list_task_activities` | Apply the requested filters and follow `nextCursor` only for complete results. |
| Read board settings, card defaults, and Slack configuration | `get_board_settings` | Requires `mcp:boards.settings`; existing board context only contains part of these settings. |
| Find Slack channels for a board | `list_board_slack_channels` | Use `available`, `linked`, and `laneId` to resolve mapping changes. |
| Show recurring templates | `list_recurring_tasks` | This lists templates, not generated task instances. |

When the user says “all,” account for tool limits and pagination. Do not describe a limited first page as exhaustive.

## Create tasks

1. Resolve the board and lane.
2. Resolve optional parent, project, assignee, ball-holder, and label IDs.
3. Preserve dates in the server-supported date format. Ask when a relative date or timezone is genuinely ambiguous.
4. Use `create_task` for one task.
5. Use `create_tasks` for 2–20 independent tasks when the user intends a bulk operation.
6. Return each created task's direct URL.

`create_tasks` is non-atomic: valid items may be created even when other items fail. Use returned input indices to report each result. Retry only failed items and only after correcting them; never resubmit the full original batch.

## Create recurring tasks

1. Resolve board, lane, and optional related IDs as for a normal task.
2. Determine `daily`, `weekly`, or `monthly` frequency.
3. For weekly schedules, resolve the intended weekdays. For monthly schedules, resolve the day of month.
4. Resolve the execution timezone and run hour when they are not safely implied by the user's request.
5. Clarify start/due offsets and end date when those materially affect generated tasks.
6. Call `create_recurring_task` once and report the returned board URL and schedule summary.

Do not invent a timezone or silently convert a calendar schedule into a fixed interval.

## Update task fields

Use `update_task_fields` for title, description, start date, due date, baseline dates, project, and size. Send only fields the user intends to change. Use explicit `null` only when the user asks to clear a nullable field.

Do not use this tool for lanes, parent relationships, ordering, assignees, ball holder, labels, comments, or archive state.

## Move tasks

Use `move_task` for lane, parent, or order changes.

1. Fetch the task when its current board or parent is not known.
2. Resolve the target lane on that same board.
3. Obtain an explicit or unambiguous target order. Ask whether the task should go to the top, bottom, or a specific position when placement is unclear.
4. Pass `parentId` only when the parent relationship should change; use `null` to make the task top-level.

Do not describe a field update as a move, and do not move a task to an ID from another board.

## Assign people

`set_task_assignees` replaces the complete assignee set and updates the ball holder.

- For “add Alice,” fetch the task, merge Alice into the current assignee IDs, preserve the current ball holder unless the user changes it, and submit the full result.
- For “remove Alice,” fetch the task, remove only Alice, preserve every other assignee and the ball holder, and submit the full result.
- Send an empty assignee list only when the user explicitly clears all assignees.
- Use `null` for the ball holder only when the user explicitly clears it.

## Apply labels

`set_task_labels` replaces the complete label set.

- For add/remove requests, fetch the task and merge against its current label IDs.
- Send an empty list only when the user explicitly clears every label.
- Use `create_label` when the user asks to create a missing board label or when the project handoff loop in [knowledge.md](knowledge.md) needs its review label. Resolve existing equivalents first; do not create near-duplicates.

Use `create_project` only when the user asks to create a project. Resolve an existing matching project before creating another one.

## Comments

Use `add_task_comment` only for content the user intends to post as a comment. Preserve the user's meaning and language. Do not convert internal reasoning or inferred notes into comments. A concise, factual handoff summary is allowed for the project work loop in [knowledge.md](knowledge.md); durable facts belong in Knowledge under that reference, not in task comments.

## Archive and restore

- `archive_task` is a reversible soft archive, not physical deletion.
- `restore_task` reverses that archive state.
- Set descendant inclusion only when the user explicitly mentions subtasks or confirms the scope.
- Report the target task URL and the number of changed task IDs when available.

## Board settings and Slack configuration

All six settings tools require `mcp:boards.settings`. It is off by default on the connection consent screen, even when requested by a client. Existing connections do not gain it through token refresh. If these tools are missing, ask the user to reauthorize with settings access; an older client registration may need to be registered again. If the server version does not provide the tools, explain that limitation instead of substituting task tools or a direct API call.

1. Resolve the board with `list_boards` and related lane, project, or label IDs with `get_board_context` when needed.
2. Read current values with `get_board_settings`. The result contains `settings`, `slackUnresponded` (including mappings and selected channels), `slackCommentNotify`, and the board URL.
3. Use the narrowest matching tool below and preserve fields or selections outside the requested change.
4. Report the saved values and board URL. For multiple independent calls, report successful changes separately if a later call fails; do not claim the sequence was atomic.

| Requested change | Tool and arguments | Preservation rule |
| --- | --- | --- |
| Name, color, group, sizing, card defaults, or Slack notification fields | `update_board_settings` with `boardId` and the changed fields at the top level | Omitted fields stay unchanged. `cardDefaults` replaces the complete object: merge with the current defaults for a partial change. Use `null` only to clear a nullable field explicitly. |
| Link/unlink Slack channels or change their destination lane | `set_board_slack_channels` with `boardId` and `mappings: [{channelId, laneId}]` | Replaces this board's entire mapping list. Read current mappings and merge for add/remove requests. Empty mappings unlinks every channel for this board. |
| Unanswered-mention task creation | `set_board_slack_unresponded_config` with `boardId`, `enabled`, and `channelIds` | Sends the complete selected channel set. Preserve existing selections when only toggling enabled. Channels must already be mapped to this board. |
| Card-comment notifications | `set_board_slack_comment_notify_config` with `boardId`, `enabled`, and optional `channelId` | Omit `channelId` to retain it; use `null` only to explicitly clear it. |

For channel selection, use `list_board_slack_channels` and resolve names uniquely. A channel with `available: false` is linked to another board; do not unlink it elsewhere to work around the conflict. Mapping changes may join the Slack bot to the selected channel, and unlinking removes that channel from this board's unanswered-mention selections. Follow the server's validation and report Slack connection or channel-join failures.

Settings updates require an owner, admin, or member with all-board access. Archived boards are read-only, and restricted workspaces cannot use this settings scope. Do not offer board creation, archive/deletion, guest access changes, recurring-template management, or workspace-wide Slack configuration as part of these tools. Existing recurring task tools retain their original task scopes.

## Handle failures

| Failure | Response |
| --- | --- |
| Authentication required | Ask the user to authenticate the UTSUROI MCP connection in the current client, then retry. |
| Missing `mcp:tasks.read` | Explain that read access is required. |
| Missing `mcp:tasks.write` | Explain that write access is required for the requested mutation. |
| Missing `mcp:boards.settings` | Reauthorize the MCP connection and explicitly enable board settings; register the client again if the option is disabled. |
| Viewer or board permission error | Identify the affected board or task without attempting another board. |
| Ambiguous name | Present the smallest useful set of candidates and ask for one choice. |
| Invalid input | Correct only the invalid field; preserve the rest of the user's intent. |
| Rate limit | Report the limit and retry later only when the user asks or the client safely supports it. |
| Partial bulk result | Separate created and failed items and never duplicate the created items. |

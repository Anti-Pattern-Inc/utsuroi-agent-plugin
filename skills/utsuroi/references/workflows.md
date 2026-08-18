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
| Open one exact task | `get_task` | Use before a partial assignee or label change. |
| Show the user's work | `list_my_tasks` | Covers assigned, held, or created tasks. |
| Show overdue, today, or date-window work | `list_due_tasks` | Convert relative dates using the user's current locale and timezone. |
| Summarize recent changes | `list_recent_task_events` | Use for a concise tenant- or board-level feed. |
| Audit filtered or complete history | `list_task_activities` | Apply the requested filters and follow `nextCursor` only for complete results. |
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
- Use `create_label` only when the user asks to create a missing board label; do not create near-duplicates automatically.

Use `create_project` only when the user asks to create a project. Resolve an existing matching project before creating another one.

## Comments

Use `add_task_comment` only for content the user intends to post as a comment. Preserve the user's meaning and language. Do not convert internal reasoning, summaries, or inferred notes into comments.

## Archive and restore

- `archive_task` is a reversible soft archive, not physical deletion.
- `restore_task` reverses that archive state.
- Set descendant inclusion only when the user explicitly mentions subtasks or confirms the scope.
- Report the target task URL and the number of changed task IDs when available.

## Handle failures

| Failure | Response |
| --- | --- |
| Authentication required | Ask the user to authenticate the UTSUROI MCP connection in the current client, then retry. |
| Missing `mcp:tasks.read` | Explain that read access is required. |
| Missing `mcp:tasks.write` | Explain that write access is required for the requested mutation. |
| Viewer or board permission error | Identify the affected board or task without attempting another board. |
| Ambiguous name | Present the smallest useful set of candidates and ask for one choice. |
| Invalid input | Correct only the invalid field; preserve the rest of the user's intent. |
| Rate limit | Report the limit and retry later only when the user asks or the client safely supports it. |
| Partial bulk result | Separate created and failed items and never duplicate the created items. |

Improve subtask UI.

# 4. Broken subtask button

- [ ] Consume `creationDialogState` and `closeCreateDialog` from context in task rendering
- [ ] Add inline creation input in `task-item.tsx` subtask area when `creationDialogState.parentTaskId === task.id`
- [ ] Handle root-level creation (from Enter in name editing) in `tasks-list.tsx` when `creationDialogState.parentTaskId === null`
- [ ] Input behavior: auto-focus, Enter → create task & close, Escape → close

Not responding. **Root cause: no component consumes `creationDialogState` to render an inline creation UI.** The Plus button calls `openCreateDialog` which sets state, but nothing reads it. `tasks-list.tsx` has its own local creation state, ignoring context.

## Files

- `src/components/tasks/task-item.tsx` — render inline input in subtask area
- `src/components/tasks/tasks-list.tsx` — render inline input for root-level
- `src/components/tasks/task-context.tsx` — context already has the state, no changes needed

# P29-EX1: Project Settings Dialog (Name, Description, Slug)

## Goal

Introduce a project preferences dialog accessible from the sidebar settings menu. Admin users can edit project name/description and change the project slug. Name/description edits reflect immediately on the page; slug changes navigate to the new URL.

## Prerequisites

- [x] Project slug field exists in schema with unique index (`projects_slug_idx`)
- [x] `updateProject` service already accepts `{ name?, description?, slug? }` and validates slug format
- [x] `updateProjectAction` server action exists (currently only handles name/description)
- [x] `requireAdminProjectWorker` permission check exists

## Architecture Decisions

- **Two separate forms in one dialog** — name/description form and slug form are visually separated sections. Both call the same `updateProjectAction` but slug changes trigger navigation.
- **Server action, not API route** — follow existing pattern (`updateProjectAction`). No new API PATCH endpoint needed since dialogs are client-side only (no external consumers).
- **No optimistic updates** — settings dialogs are low-frequency; simplicity > perceived speed. Invalidate `['projects', 'withWorker']` query after success.
- **Slug uniqueness error** — the DB unique index will throw on conflict. Catch the Postgres unique violation (code `23505`) in the service layer and return a user-friendly error.

## Tasks

### Task 1: Update `updateProjectAction` to support slug changes

- [x] `src/app/app/actions.ts` — modify `updateProjectAction` signature:
  ```
  updateProjectAction(
    projectSlug: string,
    data: { name?: string; description?: string; slug?: string },
  ): Promise<ReturnResult<{ slug: string }>>
  ```

  - Pass `data` fields through to `updateProject(project.id, data)`
  - Change return type to `ReturnResult<{ slug: string }>` so the caller knows the (possibly new) slug
  - On success, return `ok({ slug: data.slug ?? projectSlug })`
  - `revalidatePath('/app')` on success (already done)

### Task 2: Handle slug uniqueness conflict in service

- [x] `src/server/services/project.ts` — in `updateProject`, wrap the `db.update()` call in try/catch:
  - Catch Postgres error with `code === '23505'` (unique violation)
  - Return `err(new ConflictError('A project with this slug already exists'))` — `ConflictError` already exists in `src/server/services/errors.ts`
  - Let other errors propagate

### Task 3: Create `ProjectSettingsDialog` component

- [x] `src/components/projects/project-settings-dialog.tsx` — new file, following `create-project-dialog.tsx` pattern:

  **Props:**

  ```typescript
  type ProjectSettingsDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
  }
  ```

  State is controlled externally (opened from sidebar dropdown).

  **Context:** read `useProjectContext()` to get `projectSlug`, `projectName`, `projectId`, `currentWorker`.

  **Layout:** single `<DialogContent>` with two `<form>` elements (each with own submit handler):

  **Form 1 — General settings:**
  - Fields: `name` (Input, required), `description` (Input, optional)
  - Initialize from project data. Use `useProjects()` hook to get current project's name/description.
  - Submit: call `updateProjectAction(projectSlug, { name, description })`
  - On success: invalidate `['projects', 'withWorker']` query via `queryClient.invalidateQueries()`
  - Button label: "Save" / "Saving..."

  **Form 2 — Change slug:**
  - Field: `slug` (Input, required, `pattern='[a-z0-9-]+'`)
  - Initialize with current slug from context
  - Submit: call `updateProjectAction(projectSlug, { slug })`
  - On success: `router.replace(`/app/projects/${result.data.slug}/issues`)` to navigate to new URL
  - On error: show error message inline (especially for slug conflict)
  - Button label: "Change slug" / "Changing..."
  - Visually separated from Form 1 (e.g., border-top or a section heading like "Danger zone" or "URL settings")

  **Imports needed:**
  - `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription` from `@/components/ui/dialog`
  - `Button` from `@/components/ui/button`
  - `Input` from `@/components/ui/input`
  - `Label` from `@/components/ui/label`
  - `useAction` from `@/lib/use-action`
  - `updateProjectAction` from `@/app/app/actions`
  - `useProjectContext` from `@/components/app/project-context`
  - `useProjects` from `@/hooks/use-projects`
  - `useQueryClient` from `@tanstack/react-query`
  - `useRouter` from `next/navigation`

  **Behavior:**
  - When dialog opens, populate fields from current project data
  - Only admin users should see this option (checked in sidebar, Task 4)
  - Reset form state when dialog `open` changes (use `useEffect` on `open`)

### Task 4: Wire dialog into sidebar settings menu

- [x] `src/components/app/app-mode-sidebar.tsx`:
  - Import `ProjectSettingsDialog` and `useProjectContext`
  - Add `open` state for the dialog: `const [settingsOpen, setSettingsOpen] = useState(false)`
  - Add "Project Settings" `DropdownMenuItem` above Logout in the settings dropdown (only if `currentWorker.role === 'admin'`):
    ```
    <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
      <Pencil className='mr-2 h-4 w-4' />
      Project Settings
    </DropdownMenuItem>
    ```
  - Render `<ProjectSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />` outside the dropdown
  - Import `Pencil` from `lucide-react` (or use another fitting icon)
  - Get `currentWorker` from `useProjectContext()`

## Notes

- `updateProject` service already validates slug format with `/^[a-z0-9-]+$/` — no need to duplicate in the action
- The unique index on `slug` is global (not per-user), so slug conflicts can happen across users
- No Textarea component exists — use `Input` for description (consistent with create dialog)
- After slug change, all existing bookmarks/links using the old slug will break — this is expected and the user should understand this (consider a small warning text near the slug field)

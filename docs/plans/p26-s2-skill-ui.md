# P26-S2: Skill Management UI

## Goal

Add a Skills settings page where users can view, create, edit, and delete skills for a project. Add React Query hooks for skill CRUD with optimistic updates.

## Prerequisites

- p26-s1 (skill storage) — DONE

## UI Design

### Skills List Page (`/app/projects/{projectId}/skills`)

Follows the same layout as the workers page:

```
┌─────────────────────────────────────┐
│ [☰]  [ProjectSwitcher ▾]     [＋]  │  ← header bar (+ button to create)
├─────────────────────────────────────┤
│ Skills                              │  ← section title (text-sm, muted)
├─────────────────────────────────────┤
│                                     │
│  🧩 elaborate-plan                  │  ← skill item (click → edit dialog)
│     Download issue context and...   │
│                                     │
│  🧩 push-plan                       │
│     Upload elaborated plan as...    │
│                                     │
│  🧩 ship-plan                       │
│     Execute an elaborated plan...   │
│                                     │
└─────────────────────────────────────┘
```

**Skill item layout** — same as WorkerItem pattern:

- `Puzzle` icon (lucide `Puzzle`, size-4, muted-foreground)
- Primary: skill name (text-sm, font-medium, truncate)
- Secondary: description parsed from frontmatter in content (text-xs, muted-foreground, truncate). If no frontmatter `description`, show first line of content body or empty.

**States:**

- Loading: "Loading..."
- Empty: "No skills in this project"
- Populated: list of SkillItem buttons

**Create button**: `Plus` icon button (icon-sm) in the header bar, right side. Opens `SkillEditorDialog` in create mode.

### Skill Editor Dialog

A single dialog component used for both create and edit. Uses a larger dialog (`sm:max-w-2xl`) since skill content can be long.

```
┌──────────────────────────────────────────┐
│ Create Skill                   / Edit X  │
│ Define a skill for your project.         │
├──────────────────────────────────────────┤
│                                          │
│ Name *                                   │
│ ┌──────────────────────────────────────┐ │
│ │ elaborate-plan                       │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ Content *                                │
│ ┌──────────────────────────────────────┐ │
│ │ ---                                  │ │
│ │ description: Download issue context  │ │
│ │ ---                                  │ │
│ │                                      │ │
│ │ # Elaborate Plan                     │ │
│ │                                      │ │
│ │ ...                                  │ │
│ │                                      │ │
│ │                                      │ │
│ └──────────────────────────────────────┘ │
│                                          │
│              [Cancel]  [Create Skill]    │
│              [Cancel]  [Save Changes]    │
└──────────────────────────────────────────┘
```

**Fields:**

- **Name** — `Input` component, required, placeholder "e.g. elaborate-plan", autoFocus
- **Content** — `<textarea>` with monospace font (`font-mono text-sm`), required, placeholder with example frontmatter. Fixed height (`min-h-[300px]`), vertically resizable. This is the full SKILL.md content including frontmatter.

**Modes:**

- **Create**: Title "Create Skill", submit button "Create Skill", calls `useCreateSkill`
- **Edit**: Title "Edit Skill", submit button "Save Changes", calls `useUpdateSkill`. Pre-fills name and content from the existing skill. Also shows a "Delete" button (destructive, bottom-left or in footer).

**Delete flow**: "Delete" button in footer left side, shows confirmation (`window.confirm` is fine — keeps it simple). Calls `useDeleteSkill`, closes dialog on success.

### Frontmatter Description Parsing

Need a small utility to extract `description` from YAML frontmatter in content:

```ts
// e.g. parseFrontmatterDescription("---\ndescription: foo\n---\n# Bar")
// → "foo"
```

Used by SkillItem to show the description line. If parsing fails or no description, show nothing (just the name).

## Tasks

### Task 1: Add skill React Query hooks

- [ ] `src/hooks/use-skills.ts` — create file with:
  - `Skill` type: `{ id: string, name: string, content: string, position: number, createdAt: string, updatedAt: string }`
  - `useSkills(projectId)` — `useQuery` with key `['skills', projectId]`, endpoint `GET /api/projects/${projectId}/skills`, staleTime 60s, return `{ skills: data ?? [], isLoading, error }`
  - `useCreateSkill(projectId)` — `useMutation` calling `POST /api/projects/${projectId}/skills` with `{ name, content }`. Optimistic update: cancel query, snapshot previous, append `{ id: 'temp-' + Date.now(), name, content, position: skills.length, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }` to cache. On error: rollback + toast. On settled: invalidate `['skills', projectId]`.
  - `useUpdateSkill(projectId)` — `useMutation` calling `PATCH /api/projects/${projectId}/skills/${skillId}` with `{ name?, content? }`. Optimistic update: merge changed fields into cache entry matching skillId. On error: rollback + toast. On settled: invalidate.
  - `useDeleteSkill(projectId)` — `useMutation` calling `DELETE /api/projects/${projectId}/skills/${skillId}`. Optimistic update: filter out the skill from cache. On error: rollback + toast. On settled: invalidate.

### Task 2: Add frontmatter description parser utility

- [ ] `src/lib/parse-frontmatter-description.ts` — export `parseFrontmatterDescription(content: string): string | null`. Logic:
  - Check if content starts with `---\n`
  - Find the closing `---\n`
  - Extract the YAML block between them
  - Look for a line matching `description: <value>` (simple regex, no need for a YAML parser)
  - Return the value trimmed, or `null` if not found

### Task 3: Add skill editor dialog component

- [ ] `src/components/skills/skill-editor-dialog.tsx` — export `SkillEditorDialog`:
  - Props: `{ projectId: string, skill?: Skill | null, open: boolean, onOpenChange: (open: boolean) => void }`
  - When `skill` is provided → edit mode. When `null`/`undefined` → create mode.
  - State: `name` (string), `content` (string) — initialized from `skill` prop when provided (reset on open via `useEffect` on `open` + `skill`)
  - Form with `name` Input and `content` textarea (`<textarea className='min-h-[300px] w-full rounded-md border bg-transparent px-3 py-2 font-mono text-sm resize-y focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50' />`)
  - Dialog uses `sm:max-w-2xl` for wider content area
  - Submit: if create mode, call `createSkill({ name, content })`. If edit mode, call `updateSkill({ skillId: skill.id, name, content })`.
  - On successful create/edit: close dialog, reset state
  - Delete button: only in edit mode. Placed in `DialogFooter` on the left side (using `flex justify-between` in footer). Shows `Trash2` icon + "Delete" text, `variant='ghost'` with `text-destructive`. On click: `window.confirm('Delete this skill?')`, if confirmed call `deleteSkill({ skillId: skill.id })`, close dialog.
  - Disable submit when `name` is empty or `content` is empty or mutation is pending

### Task 4: Add skills list page

- [ ] `src/app/app/projects/[projectId]/skills/page.tsx` — export default `SkillsPage`:
  - Same structure as workers page:
    1. Header bar: `AppModeMenu` (mobile) + `ProjectSwitcher` + create button (`Plus` icon, `icon-sm`, opens `SkillEditorDialog` in create mode)
    2. Section title: "Skills" (text-sm, font-semibold, muted-foreground)
    3. Scrollable list: loading/empty/populated states
  - State: `editorOpen` (boolean), `editingSkill` (Skill | null)
  - Click on a SkillItem → set `editingSkill` to that skill, set `editorOpen` to true
  - Create button → set `editingSkill` to null, set `editorOpen` to true
  - Render `SkillEditorDialog` once at page level (controlled via `open`/`onOpenChange`)
  - Inline `SkillItem` component (same file, not exported):
    - Props: `{ skill: Skill, onClick: () => void }`
    - `<button>` with same classes as WorkerItem: `flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-accent`
    - `Puzzle` icon (lucide-react), size-4, muted-foreground
    - Primary text: `skill.name` (text-sm, font-medium, truncate)
    - Secondary text: `parseFrontmatterDescription(skill.content)` (text-xs, muted-foreground, truncate). If null, don't render the secondary line.

### Task 5: Add Skills to sidebar and mobile menu

- [ ] `src/components/app/app-mode-sidebar.tsx`:
  - Add `import { Puzzle } from 'lucide-react'`
  - Add a new `ToolSidebarButton` between Workers and the spacing, with `isActive={currentMode === 'skills'}`, tooltip `'Skills'`, onClick navigates to `/app/projects/${currentProjectId}/skills`
  - Icon: `<Puzzle className='size-5' />`
- [ ] `src/components/app/app-mode-menu.tsx`:
  - Add `import { Puzzle } from 'lucide-react'`
  - Add a new `DropdownMenuItem` between Workers and the separator
  - Icon: `<Puzzle className='mr-2 h-4 w-4' />`
  - Label: "Skills"
  - onClick navigates to `/app/projects/${currentProjectId}/skills`

## Notes

- The content textarea uses monospace font because users are writing markdown with frontmatter — it's essentially a code/document editor.
- No separate detail page (unlike workers which navigate to `/workers/{id}`) — skills use a dialog because the data is simpler (just name + content). No sub-sections like tokens.
- `parseFrontmatterDescription` is intentionally simple (regex, not a YAML parser) since we only need one field from the frontmatter. If we need more fields later, switch to a proper YAML parser.
- Dialog is controlled from the page level (not via `DialogTrigger`) because both the create button and skill item clicks need to open it with different state.

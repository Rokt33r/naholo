@src/components/logs/logs-list.tsx

# Improve log creation UI

## Problem

The input area in LogsList has buttons ("Close issue" / "Reopen issue" + "Send") displayed below the textarea, taking too much vertical space. The labeled buttons feel heavy for a chat-like interface.

## Goal

Embed icon-only buttons inside the textarea container (bottom-right corner), making the input area more compact and chat-like.

## Current layout

```
┌──────────────────────────────┐
│ AutoResizeTextarea           │
│ (min-h-[80px])              │
│                              │
└──────────────────────────────┘
  [Close issue]  [Send ►]       ← separate row below
```

- Textarea and buttons are in separate divs
- Buttons have full text labels ("Close issue", "Reopen issue", "Close with log", "Send")
- Extra `mt-2` gap between textarea and button row

## Target layout

```
┌──────────────────────────────┐
│ AutoResizeTextarea           │
│                              │
│                      [⊘] [↵]│  ← icons inside container
└──────────────────────────────┘
```

- Single container div styled to look like a textarea (border, rounded, focus ring)
- Actual textarea inside is unstyled (no border/ring) and fills the space
- Icon buttons positioned at bottom-right inside the container
- `[⊘]` = Close/Reopen issue (toggle based on `isClosed`)
- `[↵]` = Send (CornerDownLeft icon, already imported)

## Implementation

### File: `src/components/logs/logs-list.tsx`

**Step 1: Restructure the input area**

Replace the current two-div structure (textarea + button row) with a single container:

```tsx
<div className='border-t p-2'>
  <div className='group relative rounded-md border focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]'>
    <AutoResizeTextarea
      ref={textareaRef}
      value={message}
      onChange={(e) => setMessage(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder='Type a message... (Shift+Enter for new line)'
      className='min-h-[80px] w-full resize-none bg-transparent px-3 py-2 pb-10 text-sm outline-none'
    />
    <div className='absolute right-2 bottom-2 flex gap-1'>
      {/* icon buttons here */}
    </div>
  </div>
</div>
```

Key changes:

- Wrapper div gets the border/focus-ring styles (using `focus-within:` to react to textarea focus)
- Textarea loses its own border/ring styles
- `pb-10` on textarea ensures text doesn't overlap with buttons
- Buttons absolutely positioned at bottom-right

**Step 2: Convert buttons to icon-only**

Replace labeled buttons with icon buttons using Lucide icons:

- **Send**: Keep `CornerDownLeft` icon (already imported). Use `size='icon-sm'` variant or small square button.
- **Close issue**: Use `CircleCheck` from lucide-react (purple, consistent with issue-item.tsx closed state).
- **Reopen issue**: Use `CircleDot` from lucide-react (green, consistent with issue-item.tsx open state).

```tsx
<div className='absolute right-2 bottom-2 flex gap-1'>
  {isClosed ? (
    <Button
      variant='ghost'
      size='icon-sm'
      onClick={handleReopen}
      disabled={isReopening}
      title='Reopen issue'
    >
      <CircleDot className='h-4 w-4 text-green-600' />
    </Button>
  ) : (
    <Button
      variant='ghost'
      size='icon-sm'
      onClick={handleClose}
      disabled={isClosing}
      title={message.trim() ? 'Close with log' : 'Close issue'}
    >
      <CircleCheck className='h-4 w-4 text-purple-600' />
    </Button>
  )}
  <Button
    size='icon-sm'
    onClick={handleSendMessage}
    disabled={!message.trim() || createLoading}
    title='Send (Enter)'
  >
    <CornerDownLeft className='h-4 w-4' />
  </Button>
</div>
```

- Use `title` attribute for hover tooltips so users can discover what each button does
- Ghost variant for close/reopen (secondary action), default variant for send (primary action)

**Step 3: Add imports**

Add `CircleCheck` and `CircleDot` to the lucide-react import (consistent with [issue-item.tsx](src/components/issues/issue-item.tsx)):

```tsx
import { CornerDownLeft, CircleCheck, CircleDot } from 'lucide-react'
```

Remove unused `ButtonGroup` import if no longer needed.

**Step 4: Use `size='icon-sm'` (size-8)**

The Button component already has `icon-sm` which is `size-8` — use this for all icon buttons.

## Notes

- No API or hook changes needed — this is purely a UI/layout refactor
- Tooltip via `title` is sufficient; no need for Radix Tooltip component
- The `focus-within:` pseudo-class ensures the container shows focus ring when the textarea inside is focused
- Keep existing keyboard behavior (Enter to send, Shift+Enter for newline)

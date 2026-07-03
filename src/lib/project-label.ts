import { z } from 'zod'

// Label names allow alphanumeric and any-language letters, emoji, spaces,
// plus `-`. Shift-key special chars (e.g. !@#$%^&*()_+=`":;'[]/.) are
// reserved and rejected — emoji are matched via Unicode pictographic/modifier properties
// (plus ZWJ + variation selector for compound emoji), not `\p{Emoji}`, so
// `#`/`*`/digits stay reserved. Leading/trailing spaces are trimmed first.
export const projectLabelNameSchema = z
  .string()
  .trim()
  .min(1, 'Label name is required')
  .max(50, 'Label name is too long')
  .regex(
    /^[\p{L}\p{N}\p{Extended_Pictographic}\p{Emoji_Modifier}\u200d\uFE0F -]+$/u,
    'Label name has invalid characters',
  )

// Label colors are stored as a strict 6-digit hex string, e.g. `#1f6feb`.
// The readable per-theme triplet is derived from this base at render time.
export const projectLabelColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a 6-digit hex like #1f6feb')

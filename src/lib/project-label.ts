import { z } from 'zod'

// Label names allow alphanumeric and any-language letters plus `-`. Shift-key
// special chars (e.g. !@#$%^&*()_+=`":;'[]/.) are reserved and rejected.
export const projectLabelNameSchema = z
  .string()
  .trim()
  .min(1, 'Label name is required')
  .max(50, 'Label name is too long')
  .regex(/^[\p{L}\p{N}-]+$/u, 'Label name has invalid characters')

// Label colors are stored as a strict 6-digit hex string, e.g. `#1f6feb`.
// The readable per-theme triplet is derived from this base at render time.
export const projectLabelColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a 6-digit hex like #1f6feb')

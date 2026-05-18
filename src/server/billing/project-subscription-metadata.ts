import 'server-only'
import { z } from 'zod'

const projectSubscriptionMetadataSchema = z.object({
  projectId: z.uuid(),
  projectOperatorId: z.uuid(),
})

export type ProjectSubscriptionMetadata = z.infer<
  typeof projectSubscriptionMetadataSchema
>

export function formatProjectSubscriptionMetadata(
  input: ProjectSubscriptionMetadata,
): Record<string, string> {
  const parsed = projectSubscriptionMetadataSchema.parse(input)
  return {
    projectId: parsed.projectId,
    projectOperatorId: parsed.projectOperatorId,
  }
}

export type ParseProjectSubscriptionMetadataResult =
  | { ok: true; data: ProjectSubscriptionMetadata }
  | { ok: false; reason: 'no-metadata' | 'malformed' }

export function parseProjectSubscriptionMetadata(
  raw: unknown,
): ParseProjectSubscriptionMetadataResult {
  if (raw == null || typeof raw !== 'object') {
    return { ok: false, reason: 'no-metadata' }
  }
  const result = projectSubscriptionMetadataSchema.safeParse(raw)
  if (!result.success) {
    return { ok: false, reason: 'malformed' }
  }
  return { ok: true, data: result.data }
}

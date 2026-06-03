import type { z } from 'zod'
import type { AgentSessionStatsError } from './types'

export function mapValidationError(
  zodError: z.ZodError,
): AgentSessionStatsError {
  const issue = zodError.issues[0]
  return {
    kind: 'validation_failed',
    message: issue.message,
    path: issue.path.map(String).join('.') || null,
  }
}

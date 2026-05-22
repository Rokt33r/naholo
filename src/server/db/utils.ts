export function isUniqueViolationError(error: unknown): boolean {
  return (
    error != null &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code: unknown }).code === '23505'
  )
}

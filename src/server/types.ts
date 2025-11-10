// Shared types for server actions

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: Error }

// Helper function to create success result
export function success(): ActionResult<undefined>
export function success<T>(data: T): ActionResult<T>
export function success<T>(data?: T): ActionResult<T | undefined> {
  return { success: true, data: data as T | undefined }
}

// Helper function to create error result
export function failure<T>(error: Error): ActionResult<T> {
  return { success: false, error }
}

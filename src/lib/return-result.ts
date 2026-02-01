export type ReturnResult<T> =
  | { success: true; data: T }
  | { success: false; error: Error }

export function ok(): ReturnResult<undefined>
export function ok<T>(data: T): ReturnResult<T>
export function ok<T>(data?: T): ReturnResult<T | undefined> {
  return { success: true, data: data as T | undefined }
}

export function err<T>(error: Error): ReturnResult<T> {
  return { success: false, error }
}

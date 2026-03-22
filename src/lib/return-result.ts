export type ReturnResult<T> = SuccessResult<T> | ErrorResult
export type SuccessResult<T> = { success: true; data: T }
export type ErrorResult = { success: false; error: Error }

export function ok(): SuccessResult<undefined>
export function ok<T>(data: T): SuccessResult<T>
export function ok<T>(data?: T): SuccessResult<T | undefined> {
  return { success: true, data: data as T | undefined }
}

export function err(error: Error): ErrorResult {
  return { success: false, error }
}

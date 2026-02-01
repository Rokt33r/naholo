import { useState, useCallback } from 'react'
import type { ReturnResult } from './return-result'

type ActionFunction<TArgs extends any[], TResult> = (
  ...args: TArgs
) => Promise<ReturnResult<TResult>>

export function useAction<TArgs extends any[], TResult>(
  action: ActionFunction<TArgs, TResult>,
) {
  const [loading, setLoading] = useState(false)

  const execute = useCallback(
    async (...args: TArgs): Promise<ReturnResult<TResult>> => {
      setLoading(true)
      try {
        const result = await action(...args)

        if (!result.success) {
          console.error(result.error)
        }
        return result
      } catch (error) {
        console.error('Unhandled server action error:', error)
        return {
          success: false,
          error: error as Error,
        }
      } finally {
        setLoading(false)
      }
    },
    [action],
  )

  return { execute, loading }
}

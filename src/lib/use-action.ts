import { useState, useCallback } from 'react'
import type { ActionResult } from '@/server/types'

type ActionFunction<TArgs extends any[], TResult> = (
  ...args: TArgs
) => Promise<ActionResult<TResult>>

export function useAction<TArgs extends any[], TResult>(
  action: ActionFunction<TArgs, TResult>,
) {
  const [loading, setLoading] = useState(false)

  const execute = useCallback(
    async (...args: TArgs): Promise<ActionResult<TResult>> => {
      setLoading(true)
      try {
        const result = await action(...args)
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
import useSWR, { mutate as globalMutate } from 'swr'
import { useCallback } from 'react'
import { toast } from 'sonner'
import { fetcher } from '@/lib/fetcher'

type Issue = {
  id: string
  projectId: string
  title: string
  closed: boolean
  closedAt: Date | null
  createdAt: Date
  updatedAt: Date
  lastLogPreview: string | null
  totalTasks: number
  completedTasks: string | null
}

// Type for issue list items (subset of Issue)
type IssueListItem = Pick<
  Issue,
  | 'id'
  | 'title'
  | 'closed'
  | 'closedAt'
  | 'updatedAt'
  | 'lastLogPreview'
  | 'totalTasks'
  | 'completedTasks'
>

// Type for issue detail (subset of Issue)
type IssueDetail = Pick<
  Issue,
  | 'id'
  | 'projectId'
  | 'title'
  | 'closed'
  | 'closedAt'
  | 'createdAt'
  | 'updatedAt'
>

/**
 * Hook to fetch issues list for a project
 */
export function useIssues(projectId: string, filter: 'open' | 'closed') {
  const url = `/api/projects/${projectId}/issues?closed=${filter === 'closed'}`

  const { data, error, isLoading, mutate } = useSWR<IssueListItem[]>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
    },
  )

  return {
    issues: data ?? [],
    isLoading,
    error,
    mutate,
  }
}

/**
 * Hook to fetch a single issue
 */
export function useIssue(projectId: string, issueId: string) {
  const url = `/api/projects/${projectId}/issues/${issueId}`

  const { data, error, isLoading, mutate } = useSWR<IssueDetail>(url, fetcher, {
    revalidateOnFocus: false,
  })

  return {
    issue: data,
    isLoading,
    error,
    mutate,
  }
}

/**
 * Hook to update an issue's title with optimistic updates
 */
export function useUpdateIssueTitle() {
  const updateTitle = useCallback(
    async (projectId: string, issueId: string, newTitle: string) => {
      const url = `/api/projects/${projectId}/issues/${issueId}`

      try {
        // Optimistically update the issue detail cache
        await globalMutate<IssueDetail>(
          url,
          async (currentData) => {
            if (!currentData) return currentData

            const response = await fetch(url, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: newTitle }),
            })

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}))
              throw new Error(errorData.error || 'Failed to update title')
            }

            return response.json()
          },
          {
            optimisticData: (currentData) => {
              if (!currentData) throw new Error('No data to update')
              return { ...currentData, title: newTitle }
            },
            rollbackOnError: true,
            revalidate: false,
          },
        )

        // Update all issues list caches that might contain this issue
        const issueListKeys = [
          `/api/projects/${projectId}/issues?closed=true`,
          `/api/projects/${projectId}/issues?closed=false`,
        ]

        for (const key of issueListKeys) {
          await globalMutate<IssueListItem[]>(
            key,
            (currentList) => {
              if (!currentList) return currentList
              return currentList.map((issue) =>
                issue.id === issueId ? { ...issue, title: newTitle } : issue,
              )
            },
            { revalidate: false },
          )
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to update title'
        toast.error(message)
        throw error
      }
    },
    [],
  )

  return { updateTitle }
}

/**
 * Hook to close an issue with optimistic updates
 */
export function useCloseIssue() {
  const closeIssue = useCallback(async (projectId: string, issueId: string) => {
    const url = `/api/projects/${projectId}/issues/${issueId}/close`
    const issueDetailUrl = `/api/projects/${projectId}/issues/${issueId}`

    try {
      const now = new Date()

      // Optimistically update the issue detail cache
      await globalMutate<IssueDetail>(
        issueDetailUrl,
        async (currentData) => {
          if (!currentData) return currentData

          const response = await fetch(url, {
            method: 'POST',
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || 'Failed to close issue')
          }

          return response.json()
        },
        {
          optimisticData: (currentData) => {
            if (!currentData) throw new Error('No data to update')
            return { ...currentData, closed: true, closedAt: now }
          },
          rollbackOnError: true,
          revalidate: false,
        },
      )

      // Revalidate both open and closed issue lists
      await globalMutate(`/api/projects/${projectId}/issues?closed=false`)
      await globalMutate(`/api/projects/${projectId}/issues?closed=true`)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to close issue'
      toast.error(message)
      throw error
    }
  }, [])

  return { closeIssue }
}

/**
 * Hook to reopen an issue with optimistic updates
 */
export function useReopenIssue() {
  const reopenIssue = useCallback(
    async (projectId: string, issueId: string) => {
      const url = `/api/projects/${projectId}/issues/${issueId}/close`
      const issueDetailUrl = `/api/projects/${projectId}/issues/${issueId}`

      try {
        // Optimistically update the issue detail cache
        await globalMutate<IssueDetail>(
          issueDetailUrl,
          async (currentData) => {
            if (!currentData) return currentData

            const response = await fetch(url, {
              method: 'DELETE',
            })

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}))
              throw new Error(errorData.error || 'Failed to reopen issue')
            }

            return response.json()
          },
          {
            optimisticData: (currentData) => {
              if (!currentData) throw new Error('No data to update')
              return { ...currentData, closed: false, closedAt: null }
            },
            rollbackOnError: true,
            revalidate: false,
          },
        )

        // Revalidate both open and closed issue lists
        await globalMutate(`/api/projects/${projectId}/issues?closed=false`)
        await globalMutate(`/api/projects/${projectId}/issues?closed=true`)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to reopen issue'
        toast.error(message)
        throw error
      }
    },
    [],
  )

  return { reopenIssue }
}

/**
 * Hook to delete an issue
 */
export function useDeleteIssue() {
  const deleteIssue = useCallback(
    async (projectId: string, issueId: string) => {
      const url = `/api/projects/${projectId}/issues/${issueId}`

      try {
        const response = await fetch(url, {
          method: 'DELETE',
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to delete issue')
        }

        // Revalidate both open and closed issue lists
        await globalMutate(`/api/projects/${projectId}/issues?closed=false`)
        await globalMutate(`/api/projects/${projectId}/issues?closed=true`)

        const result = await response.json()
        return result.projectId
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to delete issue'
        toast.error(message)
        throw error
      }
    },
    [],
  )

  return { deleteIssue }
}

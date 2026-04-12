import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetcher, createResponseError } from '@/lib/fetcher'

export type { IssueListItem, IssueDetail } from 'naholo-api/types'

import type { IssueListItem, IssueDetail } from 'naholo-api/types'

export function updateIssueListCache(
  queryClient: QueryClient,
  projectSlug: string,
  issueNumber: number,
  updater: (issue: IssueListItem) => IssueListItem,
) {
  for (const filter of ['open', 'closed'] as const) {
    queryClient.setQueryData<IssueListItem[]>(
      ['issues', projectSlug, filter],
      (old) =>
        old?.map((issue) =>
          issue.number === issueNumber ? updater(issue) : issue,
        ),
    )
  }
}

/**
 * Hook to fetch issues list for a project
 */
export function useIssues(projectSlug: string, filter: 'open' | 'closed') {
  const query = useQuery({
    queryKey: ['issues', projectSlug, filter],
    queryFn: () =>
      fetcher<IssueListItem[]>(
        `/api/projects/${projectSlug}/issues?closed=${filter === 'closed'}`,
      ),
  })

  return {
    issues: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

/**
 * Hook to fetch a single issue
 */
export function useIssue(projectSlug: string, issueNumber: number) {
  const query = useQuery({
    queryKey: ['issue', projectSlug, issueNumber],
    queryFn: () =>
      fetcher<IssueDetail>(
        `/api/projects/${projectSlug}/issues/${issueNumber}`,
      ),
  })

  return {
    issue: query.data,
    isLoading: query.isLoading,
    error: query.error,
  }
}

/**
 * Hook to update an issue's title with optimistic updates
 */
export function useUpdateIssueTitle(projectSlug: string, issueNumber: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newTitle: string) => {
      const response = await fetch(
        `/api/projects/${projectSlug}/issues/${issueNumber}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newTitle }),
        },
      )
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to update title')
      }
      return response.json()
    },
    onMutate: async (newTitle) => {
      await queryClient.cancelQueries({
        queryKey: ['issue', projectSlug, issueNumber],
      })

      const previousIssue = queryClient.getQueryData<IssueDetail>([
        'issue',
        projectSlug,
        issueNumber,
      ])

      queryClient.setQueryData<IssueDetail>(
        ['issue', projectSlug, issueNumber],
        (old) => (old ? { ...old, title: newTitle } : old),
      )

      // Update both issue list caches
      for (const filter of ['open', 'closed'] as const) {
        queryClient.setQueryData<IssueListItem[]>(
          ['issues', projectSlug, filter],
          (old) =>
            old?.map((issue) =>
              issue.number === issueNumber
                ? { ...issue, title: newTitle }
                : issue,
            ),
        )
      }

      return { previousIssue }
    },
    onError: (err, _, context) => {
      if (context?.previousIssue) {
        queryClient.setQueryData(
          ['issue', projectSlug, issueNumber],
          context.previousIssue,
        )
      }
      queryClient.invalidateQueries({ queryKey: ['issues', projectSlug] })
      toast.error(err instanceof Error ? err.message : 'Failed to update title')
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['issue', projectSlug, issueNumber],
      })
      queryClient.invalidateQueries({ queryKey: ['issues', projectSlug] })
    },
  })
}

/**
 * Hook to close an issue with optimistic updates
 */
export function useCloseIssue(projectSlug: string, issueNumber: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `/api/projects/${projectSlug}/issues/${issueNumber}/close`,
        { method: 'POST' },
      )
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to close issue')
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: ['issue', projectSlug, issueNumber],
      })

      const previousIssue = queryClient.getQueryData<IssueDetail>([
        'issue',
        projectSlug,
        issueNumber,
      ])

      const now = new Date()
      queryClient.setQueryData<IssueDetail>(
        ['issue', projectSlug, issueNumber],
        (old) =>
          old ? { ...old, closed: true, closedAt: now.toISOString() } : old,
      )

      return { previousIssue }
    },
    onError: (err, _, context) => {
      if (context?.previousIssue) {
        queryClient.setQueryData(
          ['issue', projectSlug, issueNumber],
          context.previousIssue,
        )
      }
      toast.error(err instanceof Error ? err.message : 'Failed to close issue')
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['issue', projectSlug, issueNumber],
      })
      queryClient.invalidateQueries({ queryKey: ['issues', projectSlug] })
    },
  })
}

/**
 * Hook to reopen an issue with optimistic updates
 */
export function useReopenIssue(projectSlug: string, issueNumber: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `/api/projects/${projectSlug}/issues/${issueNumber}/close`,
        { method: 'DELETE' },
      )
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to reopen issue')
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: ['issue', projectSlug, issueNumber],
      })

      const previousIssue = queryClient.getQueryData<IssueDetail>([
        'issue',
        projectSlug,
        issueNumber,
      ])

      queryClient.setQueryData<IssueDetail>(
        ['issue', projectSlug, issueNumber],
        (old) => (old ? { ...old, closed: false, closedAt: null } : old),
      )

      return { previousIssue }
    },
    onError: (err, _, context) => {
      if (context?.previousIssue) {
        queryClient.setQueryData(
          ['issue', projectSlug, issueNumber],
          context.previousIssue,
        )
      }
      toast.error(err instanceof Error ? err.message : 'Failed to reopen issue')
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['issue', projectSlug, issueNumber],
      })
      queryClient.invalidateQueries({ queryKey: ['issues', projectSlug] })
    },
  })
}

/**
 * Hook to delete an issue
 */
export function useDeleteIssue(projectSlug: string, issueNumber: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `/api/projects/${projectSlug}/issues/${issueNumber}`,
        { method: 'DELETE' },
      )
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to delete issue')
      }
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete issue')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['issues', projectSlug] })
    },
  })
}

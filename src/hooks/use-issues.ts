import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetcher, createResponseError } from '@/lib/fetcher'

export type { IssueListItem, IssueDetail } from 'naholo-api/types'

import type { IssueListItem, IssueDetail } from 'naholo-api/types'

/**
 * Hook to fetch issues list for a project
 */
export function useIssues(projectId: string, filter: 'open' | 'closed') {
  const query = useQuery({
    queryKey: ['issues', projectId, filter],
    queryFn: () =>
      fetcher<IssueListItem[]>(
        `/api/projects/${projectId}/issues?closed=${filter === 'closed'}`,
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
export function useIssue(projectId: string, issueNumber: number) {
  const query = useQuery({
    queryKey: ['issue', projectId, issueNumber],
    queryFn: () =>
      fetcher<IssueDetail>(`/api/projects/${projectId}/issues/${issueNumber}`),
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
export function useUpdateIssueTitle(projectId: string, issueNumber: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newTitle: string) => {
      const response = await fetch(
        `/api/projects/${projectId}/issues/${issueNumber}`,
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
        queryKey: ['issue', projectId, issueNumber],
      })

      const previousIssue = queryClient.getQueryData<IssueDetail>([
        'issue',
        projectId,
        issueNumber,
      ])

      queryClient.setQueryData<IssueDetail>(
        ['issue', projectId, issueNumber],
        (old) => (old ? { ...old, title: newTitle } : old),
      )

      // Update both issue list caches
      for (const filter of ['open', 'closed'] as const) {
        queryClient.setQueryData<IssueListItem[]>(
          ['issues', projectId, filter],
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
          ['issue', projectId, issueNumber],
          context.previousIssue,
        )
      }
      queryClient.invalidateQueries({ queryKey: ['issues', projectId] })
      toast.error(err instanceof Error ? err.message : 'Failed to update title')
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['issue', projectId, issueNumber],
      })
      queryClient.invalidateQueries({ queryKey: ['issues', projectId] })
    },
  })
}

/**
 * Hook to close an issue with optimistic updates
 */
export function useCloseIssue(projectId: string, issueNumber: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `/api/projects/${projectId}/issues/${issueNumber}/close`,
        { method: 'POST' },
      )
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to close issue')
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: ['issue', projectId, issueNumber],
      })

      const previousIssue = queryClient.getQueryData<IssueDetail>([
        'issue',
        projectId,
        issueNumber,
      ])

      const now = new Date()
      queryClient.setQueryData<IssueDetail>(
        ['issue', projectId, issueNumber],
        (old) =>
          old ? { ...old, closed: true, closedAt: now.toISOString() } : old,
      )

      return { previousIssue }
    },
    onError: (err, _, context) => {
      if (context?.previousIssue) {
        queryClient.setQueryData(
          ['issue', projectId, issueNumber],
          context.previousIssue,
        )
      }
      toast.error(err instanceof Error ? err.message : 'Failed to close issue')
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['issue', projectId, issueNumber],
      })
      queryClient.invalidateQueries({ queryKey: ['issues', projectId] })
    },
  })
}

/**
 * Hook to reopen an issue with optimistic updates
 */
export function useReopenIssue(projectId: string, issueNumber: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `/api/projects/${projectId}/issues/${issueNumber}/close`,
        { method: 'DELETE' },
      )
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to reopen issue')
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: ['issue', projectId, issueNumber],
      })

      const previousIssue = queryClient.getQueryData<IssueDetail>([
        'issue',
        projectId,
        issueNumber,
      ])

      queryClient.setQueryData<IssueDetail>(
        ['issue', projectId, issueNumber],
        (old) => (old ? { ...old, closed: false, closedAt: null } : old),
      )

      return { previousIssue }
    },
    onError: (err, _, context) => {
      if (context?.previousIssue) {
        queryClient.setQueryData(
          ['issue', projectId, issueNumber],
          context.previousIssue,
        )
      }
      toast.error(err instanceof Error ? err.message : 'Failed to reopen issue')
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['issue', projectId, issueNumber],
      })
      queryClient.invalidateQueries({ queryKey: ['issues', projectId] })
    },
  })
}

/**
 * Hook to delete an issue
 */
export function useDeleteIssue(projectId: string, issueNumber: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `/api/projects/${projectId}/issues/${issueNumber}`,
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
      queryClient.invalidateQueries({ queryKey: ['issues', projectId] })
    },
  })
}

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createResponseError, mutationFetch } from '@/lib/fetcher'
import {
  updateOperationListCache,
  type OperationAssignee,
  type OperationListItem,
} from './use-operations'

type ListCacheSnapshot = {
  open: OperationListItem[] | undefined
  closed: OperationListItem[] | undefined
}

export function useBulkAssignOperator(projectSlug: string) {
  const queryClient = useQueryClient()

  return useMutation<
    { opNumbers: number[] },
    Error,
    {
      operator: { projectOperatorId: string; name: string; callsign: string }
      opNumbers: number[]
    },
    ListCacheSnapshot
  >({
    mutationFn: async ({ operator, opNumbers }) => {
      const res = await mutationFetch(
        `/api/projects/${projectSlug}/operators/${operator.projectOperatorId}/operations`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ opNumbers }),
        },
      )
      if (!res.ok) {
        throw await createResponseError(res, 'Failed to add assignee')
      }
      return res.json()
    },
    onMutate: async ({ operator, opNumbers }) => {
      await queryClient.cancelQueries({ queryKey: ['operations', projectSlug] })
      const snapshot = snapshotListCache(queryClient, projectSlug)
      const optimistic: OperationAssignee = {
        id: `temp-${operator.projectOperatorId}`,
        projectOperatorId: operator.projectOperatorId,
        name: operator.name,
        callsign: operator.callsign,
      }
      for (const operationNumber of opNumbers) {
        updateOperationListCache(
          queryClient,
          projectSlug,
          operationNumber,
          (operation) => ({
            ...operation,
            assignees: addAssignee(operation.assignees, optimistic),
          }),
        )
      }
      return snapshot
    },
    onError: (error, _input, context) => {
      restoreListCache(queryClient, projectSlug, context)
      toast.error(
        error instanceof Error ? error.message : 'Failed to add assignee',
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['operations', projectSlug] })
    },
  })
}

export function useBulkUnassignOperator(projectSlug: string) {
  const queryClient = useQueryClient()

  return useMutation<
    { opNumbers: number[] },
    Error,
    { projectOperatorId: string; opNumbers: number[] },
    ListCacheSnapshot
  >({
    mutationFn: async ({ projectOperatorId, opNumbers }) => {
      const res = await mutationFetch(
        `/api/projects/${projectSlug}/operators/${projectOperatorId}/operations`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ opNumbers }),
        },
      )
      if (!res.ok) {
        throw await createResponseError(res, 'Failed to remove assignee')
      }
      return res.json()
    },
    onMutate: async ({ projectOperatorId, opNumbers }) => {
      await queryClient.cancelQueries({ queryKey: ['operations', projectSlug] })
      const snapshot = snapshotListCache(queryClient, projectSlug)
      for (const operationNumber of opNumbers) {
        updateOperationListCache(
          queryClient,
          projectSlug,
          operationNumber,
          (operation) => ({
            ...operation,
            assignees: operation.assignees.filter(
              (assignee) => assignee.projectOperatorId !== projectOperatorId,
            ),
          }),
        )
      }
      return snapshot
    },
    onError: (error, _input, context) => {
      restoreListCache(queryClient, projectSlug, context)
      toast.error(
        error instanceof Error ? error.message : 'Failed to remove assignee',
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['operations', projectSlug] })
    },
  })
}

function addAssignee(
  assignees: OperationAssignee[],
  assignee: OperationAssignee,
): OperationAssignee[] {
  if (
    assignees.some(
      (existing) => existing.projectOperatorId === assignee.projectOperatorId,
    )
  ) {
    return assignees
  }
  return [...assignees, assignee]
}

function snapshotListCache(
  queryClient: ReturnType<typeof useQueryClient>,
  projectSlug: string,
): ListCacheSnapshot {
  return {
    open: queryClient.getQueryData<OperationListItem[]>([
      'operations',
      projectSlug,
      'open',
    ]),
    closed: queryClient.getQueryData<OperationListItem[]>([
      'operations',
      projectSlug,
      'closed',
    ]),
  }
}

function restoreListCache(
  queryClient: ReturnType<typeof useQueryClient>,
  projectSlug: string,
  snapshot: ListCacheSnapshot | undefined,
): void {
  if (snapshot == null) {
    return
  }
  queryClient.setQueryData(['operations', projectSlug, 'open'], snapshot.open)
  queryClient.setQueryData(
    ['operations', projectSlug, 'closed'],
    snapshot.closed,
  )
}

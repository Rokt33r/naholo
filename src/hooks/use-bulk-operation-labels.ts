import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createResponseError, mutationFetch } from '@/lib/fetcher'
import {
  updateOperationListCache,
  type OperationLabel,
  type OperationListItem,
} from './use-operations'

type ListCacheSnapshot = {
  open: OperationListItem[] | undefined
  closed: OperationListItem[] | undefined
}

export function useBulkAttachOperationLabel(projectSlug: string) {
  const queryClient = useQueryClient()

  return useMutation<
    { opNumbers: number[] },
    Error,
    { label: OperationLabel; opNumbers: number[] },
    ListCacheSnapshot
  >({
    mutationFn: async ({ label, opNumbers }) => {
      const res = await mutationFetch(
        `/api/projects/${projectSlug}/labels/${label.id}/operations`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ opNumbers }),
        },
      )
      if (!res.ok) {
        throw await createResponseError(res, 'Failed to add label')
      }
      return res.json()
    },
    onMutate: async ({ label, opNumbers }) => {
      await queryClient.cancelQueries({ queryKey: ['operations', projectSlug] })
      const snapshot = snapshotListCache(queryClient, projectSlug)
      for (const operationNumber of opNumbers) {
        updateOperationListCache(
          queryClient,
          projectSlug,
          operationNumber,
          (operation) => ({
            ...operation,
            labels: addLabel(operation.labels, label),
          }),
        )
      }
      return snapshot
    },
    onError: (error, _input, context) => {
      restoreListCache(queryClient, projectSlug, context)
      toast.error(
        error instanceof Error ? error.message : 'Failed to add label',
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['operations', projectSlug] })
    },
  })
}

export function useBulkDetachOperationLabel(projectSlug: string) {
  const queryClient = useQueryClient()

  return useMutation<
    { opNumbers: number[] },
    Error,
    { labelId: string; opNumbers: number[] },
    ListCacheSnapshot
  >({
    mutationFn: async ({ labelId, opNumbers }) => {
      const res = await mutationFetch(
        `/api/projects/${projectSlug}/labels/${labelId}/operations`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ opNumbers }),
        },
      )
      if (!res.ok) {
        throw await createResponseError(res, 'Failed to remove label')
      }
      return res.json()
    },
    onMutate: async ({ labelId, opNumbers }) => {
      await queryClient.cancelQueries({ queryKey: ['operations', projectSlug] })
      const snapshot = snapshotListCache(queryClient, projectSlug)
      for (const operationNumber of opNumbers) {
        updateOperationListCache(
          queryClient,
          projectSlug,
          operationNumber,
          (operation) => ({
            ...operation,
            labels: operation.labels.filter((label) => label.id !== labelId),
          }),
        )
      }
      return snapshot
    },
    onError: (error, _input, context) => {
      restoreListCache(queryClient, projectSlug, context)
      toast.error(
        error instanceof Error ? error.message : 'Failed to remove label',
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['operations', projectSlug] })
    },
  })
}

function addLabel(
  labels: OperationLabel[],
  label: OperationLabel,
): OperationLabel[] {
  if (labels.some((existing) => existing.id === label.id)) {
    return labels
  }
  return [...labels, label]
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

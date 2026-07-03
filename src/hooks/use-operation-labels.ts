import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createResponseError, mutationFetch } from '@/lib/fetcher'
import {
  updateOperationListCache,
  type OperationDetail,
  type OperationLabel,
} from './use-operations'

/**
 * Hook to attach a label to an operation, with optimistic detail + list updates.
 */
export function useAttachOperationLabel(
  projectSlug: string,
  operationNumber: number,
) {
  const queryClient = useQueryClient()

  return useMutation<
    void,
    Error,
    OperationLabel,
    { previousOperation: OperationDetail | undefined }
  >({
    mutationFn: async (label) => {
      const res = await mutationFetch(
        `/api/projects/${projectSlug}/operations/${operationNumber}/labels`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targets: [label.id] }),
        },
      )
      if (!res.ok) {
        throw await createResponseError(res, 'Failed to add label')
      }
    },
    onMutate: async (label) => {
      await queryClient.cancelQueries({
        queryKey: ['operation', projectSlug, operationNumber],
      })
      const previousOperation = queryClient.getQueryData<OperationDetail>([
        'operation',
        projectSlug,
        operationNumber,
      ])
      queryClient.setQueryData<OperationDetail>(
        ['operation', projectSlug, operationNumber],
        (old) => (old ? { ...old, labels: addLabel(old.labels, label) } : old),
      )
      updateOperationListCache(
        queryClient,
        projectSlug,
        operationNumber,
        (op) => ({
          ...op,
          labels: addLabel(op.labels, label),
        }),
      )
      return { previousOperation }
    },
    onError: (err, _label, context) => {
      if (context?.previousOperation != null) {
        queryClient.setQueryData(
          ['operation', projectSlug, operationNumber],
          context.previousOperation,
        )
      }
      queryClient.invalidateQueries({ queryKey: ['operations', projectSlug] })
      toast.error(err instanceof Error ? err.message : 'Failed to add label')
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['operation', projectSlug, operationNumber],
      })
      queryClient.invalidateQueries({ queryKey: ['operations', projectSlug] })
    },
  })
}

/**
 * Hook to detach a label from an operation, with optimistic detail + list updates.
 */
export function useDetachOperationLabel(
  projectSlug: string,
  operationNumber: number,
) {
  const queryClient = useQueryClient()

  return useMutation<
    void,
    Error,
    string,
    { previousOperation: OperationDetail | undefined }
  >({
    mutationFn: async (labelId) => {
      const res = await mutationFetch(
        `/api/projects/${projectSlug}/operations/${operationNumber}/labels`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targets: [labelId] }),
        },
      )
      if (!res.ok) {
        throw await createResponseError(res, 'Failed to remove label')
      }
    },
    onMutate: async (labelId) => {
      await queryClient.cancelQueries({
        queryKey: ['operation', projectSlug, operationNumber],
      })
      const previousOperation = queryClient.getQueryData<OperationDetail>([
        'operation',
        projectSlug,
        operationNumber,
      ])
      queryClient.setQueryData<OperationDetail>(
        ['operation', projectSlug, operationNumber],
        (old) =>
          old
            ? { ...old, labels: old.labels.filter((l) => l.id !== labelId) }
            : old,
      )
      updateOperationListCache(
        queryClient,
        projectSlug,
        operationNumber,
        (op) => ({
          ...op,
          labels: op.labels.filter((l) => l.id !== labelId),
        }),
      )
      return { previousOperation }
    },
    onError: (err, _labelId, context) => {
      if (context?.previousOperation != null) {
        queryClient.setQueryData(
          ['operation', projectSlug, operationNumber],
          context.previousOperation,
        )
      }
      queryClient.invalidateQueries({ queryKey: ['operations', projectSlug] })
      toast.error(err instanceof Error ? err.message : 'Failed to remove label')
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['operation', projectSlug, operationNumber],
      })
      queryClient.invalidateQueries({ queryKey: ['operations', projectSlug] })
    },
  })
}

function addLabel(
  labels: OperationLabel[],
  label: OperationLabel,
): OperationLabel[] {
  if (labels.some((l) => l.id === label.id)) {
    return labels
  }
  return [...labels, label]
}

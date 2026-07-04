import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createResponseError, mutationFetch } from '@/lib/fetcher'
import {
  updateOperationListCache,
  type OperationAssignee,
  type OperationDetail,
} from './use-operations'

/**
 * Hook to assign an operator to an operation, with optimistic detail + list updates.
 */
export function useAttachOperationAssignee(
  projectSlug: string,
  operationNumber: number,
) {
  const queryClient = useQueryClient()

  return useMutation<
    void,
    Error,
    { projectOperatorId: string; name: string; callsign: string },
    { previousOperation: OperationDetail | undefined }
  >({
    mutationFn: async ({ projectOperatorId }) => {
      const res = await mutationFetch(
        `/api/projects/${projectSlug}/operations/${operationNumber}/assignees`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targets: [projectOperatorId] }),
        },
      )
      if (!res.ok) {
        throw await createResponseError(res, 'Failed to add assignee')
      }
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: ['operation', projectSlug, operationNumber],
      })
      const previousOperation = queryClient.getQueryData<OperationDetail>([
        'operation',
        projectSlug,
        operationNumber,
      ])
      const optimistic: OperationAssignee = {
        id: `temp-${input.projectOperatorId}`,
        projectOperatorId: input.projectOperatorId,
        name: input.name,
        callsign: input.callsign,
      }
      queryClient.setQueryData<OperationDetail>(
        ['operation', projectSlug, operationNumber],
        (old) =>
          old
            ? { ...old, assignees: addAssignee(old.assignees, optimistic) }
            : old,
      )
      updateOperationListCache(
        queryClient,
        projectSlug,
        operationNumber,
        (op) => ({
          ...op,
          assignees: addAssignee(op.assignees, optimistic),
        }),
      )
      return { previousOperation }
    },
    onError: (err, _input, context) => {
      if (context?.previousOperation != null) {
        queryClient.setQueryData(
          ['operation', projectSlug, operationNumber],
          context.previousOperation,
        )
      }
      queryClient.invalidateQueries({ queryKey: ['operations', projectSlug] })
      toast.error(err instanceof Error ? err.message : 'Failed to add assignee')
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
 * Hook to unassign an operator from an operation, with optimistic detail + list updates.
 */
export function useDetachOperationAssignee(
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
    mutationFn: async (projectOperatorId) => {
      const res = await mutationFetch(
        `/api/projects/${projectSlug}/operations/${operationNumber}/assignees`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targets: [projectOperatorId] }),
        },
      )
      if (!res.ok) {
        throw await createResponseError(res, 'Failed to remove assignee')
      }
    },
    onMutate: async (projectOperatorId) => {
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
            ? {
                ...old,
                assignees: old.assignees.filter(
                  (a) => a.projectOperatorId !== projectOperatorId,
                ),
              }
            : old,
      )
      updateOperationListCache(
        queryClient,
        projectSlug,
        operationNumber,
        (op) => ({
          ...op,
          assignees: op.assignees.filter(
            (a) => a.projectOperatorId !== projectOperatorId,
          ),
        }),
      )
      return { previousOperation }
    },
    onError: (err, _projectOperatorId, context) => {
      if (context?.previousOperation != null) {
        queryClient.setQueryData(
          ['operation', projectSlug, operationNumber],
          context.previousOperation,
        )
      }
      queryClient.invalidateQueries({ queryKey: ['operations', projectSlug] })
      toast.error(
        err instanceof Error ? err.message : 'Failed to remove assignee',
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['operation', projectSlug, operationNumber],
      })
      queryClient.invalidateQueries({ queryKey: ['operations', projectSlug] })
    },
  })
}

function addAssignee(
  assignees: OperationAssignee[],
  assignee: OperationAssignee,
): OperationAssignee[] {
  if (
    assignees.some((a) => a.projectOperatorId === assignee.projectOperatorId)
  ) {
    return assignees
  }
  return [...assignees, assignee]
}

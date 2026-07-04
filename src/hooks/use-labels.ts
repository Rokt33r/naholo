import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createResponseError, fetcher, mutationFetch } from '@/lib/fetcher'

export type Label = {
  id: string
  projectId: string
  name: string
  color: string
  createdAt: string
  updatedAt: string
}

/**
 * Hook to fetch all labels in a project.
 */
export function useLabels(projectSlug: string) {
  const query = useQuery({
    queryKey: ['labels', projectSlug],
    queryFn: () => fetcher<Label[]>(`/api/projects/${projectSlug}/labels`),
    staleTime: 60_000,
  })

  return {
    labels: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}

/**
 * Hook to create a project label, with an optimistic temp row.
 */
export function useCreateLabel(projectSlug: string) {
  const queryClient = useQueryClient()

  return useMutation<
    Label,
    Error,
    { name: string; color: string },
    { previousLabels: Label[] | undefined }
  >({
    mutationFn: async (input) => {
      const res = await mutationFetch(`/api/projects/${projectSlug}/labels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        throw await createResponseError(res, 'Failed to create label')
      }
      return res.json()
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ['labels', projectSlug] })
      const previousLabels = queryClient.getQueryData<Label[]>([
        'labels',
        projectSlug,
      ])
      const now = new Date().toISOString()
      const optimisticLabel: Label = {
        id: `temp-${now}`,
        projectId: '',
        name: input.name,
        color: input.color,
        createdAt: now,
        updatedAt: now,
      }
      queryClient.setQueryData<Label[]>(['labels', projectSlug], (old) => [
        ...(old ?? []),
        optimisticLabel,
      ])
      return { previousLabels }
    },
    onError: (err, _input, context) => {
      if (context?.previousLabels != null) {
        queryClient.setQueryData(
          ['labels', projectSlug],
          context.previousLabels,
        )
      }
      toast.error(err instanceof Error ? err.message : 'Failed to create label')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['labels', projectSlug] })
    },
  })
}

/**
 * Hook to update a project label's name and/or color, with an optimistic patch.
 */
export function useUpdateLabel(projectSlug: string) {
  const queryClient = useQueryClient()

  return useMutation<
    void,
    Error,
    { labelId: string; name?: string; color?: string },
    { previousLabels: Label[] | undefined }
  >({
    mutationFn: async ({ labelId, name, color }) => {
      const res = await mutationFetch(
        `/api/projects/${projectSlug}/labels/${labelId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, color }),
        },
      )
      if (!res.ok) {
        throw await createResponseError(res, 'Failed to update label')
      }
    },
    onMutate: async ({ labelId, name, color }) => {
      await queryClient.cancelQueries({ queryKey: ['labels', projectSlug] })
      const previousLabels = queryClient.getQueryData<Label[]>([
        'labels',
        projectSlug,
      ])
      queryClient.setQueryData<Label[]>(['labels', projectSlug], (old) =>
        old?.map((label) =>
          label.id === labelId
            ? {
                ...label,
                ...(name != null && { name }),
                ...(color != null && { color }),
              }
            : label,
        ),
      )
      return { previousLabels }
    },
    onError: (err, _input, context) => {
      if (context?.previousLabels != null) {
        queryClient.setQueryData(
          ['labels', projectSlug],
          context.previousLabels,
        )
      }
      toast.error(err instanceof Error ? err.message : 'Failed to update label')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['labels', projectSlug] })
      queryClient.invalidateQueries({ queryKey: ['operations', projectSlug] })
      queryClient.invalidateQueries({ queryKey: ['operation', projectSlug] })
    },
  })
}

/**
 * Hook to delete a project label, with an optimistic removal.
 */
export function useDeleteLabel(projectSlug: string) {
  const queryClient = useQueryClient()

  return useMutation<
    void,
    Error,
    string,
    { previousLabels: Label[] | undefined }
  >({
    mutationFn: async (labelId) => {
      const res = await mutationFetch(
        `/api/projects/${projectSlug}/labels/${labelId}`,
        { method: 'DELETE' },
      )
      if (!res.ok) {
        throw await createResponseError(res, 'Failed to delete label')
      }
    },
    onMutate: async (labelId) => {
      await queryClient.cancelQueries({ queryKey: ['labels', projectSlug] })
      const previousLabels = queryClient.getQueryData<Label[]>([
        'labels',
        projectSlug,
      ])
      queryClient.setQueryData<Label[]>(['labels', projectSlug], (old) =>
        old?.filter((label) => label.id !== labelId),
      )
      return { previousLabels }
    },
    onError: (err, _labelId, context) => {
      if (context?.previousLabels != null) {
        queryClient.setQueryData(
          ['labels', projectSlug],
          context.previousLabels,
        )
      }
      toast.error(err instanceof Error ? err.message : 'Failed to delete label')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['labels', projectSlug] })
      queryClient.invalidateQueries({ queryKey: ['operations', projectSlug] })
      queryClient.invalidateQueries({ queryKey: ['operation', projectSlug] })
    },
  })
}

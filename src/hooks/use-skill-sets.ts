import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetcher, createResponseError } from '@/lib/fetcher'

export type { SkillSetSummary } from 'naholo-api/types'

import type { SkillSetSummary } from 'naholo-api/types'

export function useSkillSets(projectId: string) {
  const query = useQuery({
    queryKey: ['skill-sets', projectId],
    queryFn: () =>
      fetcher<SkillSetSummary[]>(`/api/projects/${projectId}/skill-sets`),
    staleTime: 60_000,
  })

  return {
    skillSets: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}

export function useCreateSkillSet(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { name: string; slug: string }) => {
      const response = await fetch(`/api/projects/${projectId}/skill-sets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to create skill set')
      }
      return response.json()
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: ['skill-sets', projectId],
      })

      const previous = queryClient.getQueryData<SkillSetSummary[]>([
        'skill-sets',
        projectId,
      ])

      queryClient.setQueryData<SkillSetSummary[]>(
        ['skill-sets', projectId],
        (old) => [
          ...(old ?? []),
          {
            id: 'temp-' + Date.now(),
            name: input.name,
            slug: input.slug,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      )

      return { previous }
    },
    onError: (error, _, context) => {
      if (context?.previous != null) {
        queryClient.setQueryData(['skill-sets', projectId], context.previous)
      }
      toast.error(
        error instanceof Error ? error.message : 'Failed to create skill set',
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['skill-sets', projectId],
      })
    },
  })
}

export function useUpdateSkillSet(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      slug: string
      name?: string
      newSlug?: string
    }) => {
      const body: { name?: string; slug?: string } = {}
      if (input.name != null) {
        body.name = input.name
      }
      if (input.newSlug != null) {
        body.slug = input.newSlug
      }
      const response = await fetch(
        `/api/projects/${projectId}/skill-sets/${encodeURIComponent(input.slug)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      )
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to update skill set')
      }
      return response.json()
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: ['skill-sets', projectId],
      })

      const previous = queryClient.getQueryData<SkillSetSummary[]>([
        'skill-sets',
        projectId,
      ])

      queryClient.setQueryData<SkillSetSummary[]>(
        ['skill-sets', projectId],
        (old) =>
          old?.map((s) =>
            s.slug === input.slug
              ? {
                  ...s,
                  ...(input.name != null ? { name: input.name } : {}),
                  ...(input.newSlug != null ? { slug: input.newSlug } : {}),
                }
              : s,
          ),
      )

      return { previous }
    },
    onError: (error, _, context) => {
      if (context?.previous != null) {
        queryClient.setQueryData(['skill-sets', projectId], context.previous)
      }
      toast.error(
        error instanceof Error ? error.message : 'Failed to update skill set',
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['skill-sets', projectId],
      })
    },
  })
}

export function useDeleteSkillSet(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { slug: string }) => {
      const response = await fetch(
        `/api/projects/${projectId}/skill-sets/${encodeURIComponent(input.slug)}`,
        { method: 'DELETE' },
      )
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to delete skill set')
      }
      return response.json()
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: ['skill-sets', projectId],
      })

      const previous = queryClient.getQueryData<SkillSetSummary[]>([
        'skill-sets',
        projectId,
      ])

      queryClient.setQueryData<SkillSetSummary[]>(
        ['skill-sets', projectId],
        (old) => old?.filter((s) => s.slug !== input.slug),
      )

      return { previous }
    },
    onError: (error, _, context) => {
      if (context?.previous != null) {
        queryClient.setQueryData(['skill-sets', projectId], context.previous)
      }
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete skill set',
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['skill-sets', projectId],
      })
      queryClient.invalidateQueries({
        queryKey: ['skills', projectId],
      })
    },
  })
}

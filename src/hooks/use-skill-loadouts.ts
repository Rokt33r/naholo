import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetcher, createResponseError } from '@/lib/fetcher'

export type SkillLoadoutSummary = {
  id: string
  name: string
  slug: string
  createdAt: string
  updatedAt: string
}

export function useSkillLoadouts(projectSlug: string) {
  const query = useQuery({
    queryKey: ['skill-loadouts', projectSlug],
    queryFn: () =>
      fetcher<SkillLoadoutSummary[]>(
        `/api/projects/${projectSlug}/skill-loadouts`,
      ),
    staleTime: 60_000,
  })

  return {
    skillLoadouts: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}

export function useCreateSkillLoadout(projectSlug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { name: string; slug: string }) => {
      const response = await fetch(
        `/api/projects/${projectSlug}/skill-loadouts`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        },
      )
      if (!response.ok) {
        throw await createResponseError(
          response,
          'Failed to create skill loadout',
        )
      }
      return response.json()
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: ['skill-loadouts', projectSlug],
      })

      const previous = queryClient.getQueryData<SkillLoadoutSummary[]>([
        'skill-loadouts',
        projectSlug,
      ])

      queryClient.setQueryData<SkillLoadoutSummary[]>(
        ['skill-loadouts', projectSlug],
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
        queryClient.setQueryData(
          ['skill-loadouts', projectSlug],
          context.previous,
        )
      }
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to create skill loadout',
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['skill-loadouts', projectSlug],
      })
    },
  })
}

export function useUpdateSkillLoadout(projectSlug: string) {
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
        `/api/projects/${projectSlug}/skill-loadouts/${encodeURIComponent(input.slug)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      )
      if (!response.ok) {
        throw await createResponseError(
          response,
          'Failed to update skill loadout',
        )
      }
      return response.json()
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: ['skill-loadouts', projectSlug],
      })

      const previous = queryClient.getQueryData<SkillLoadoutSummary[]>([
        'skill-loadouts',
        projectSlug,
      ])

      queryClient.setQueryData<SkillLoadoutSummary[]>(
        ['skill-loadouts', projectSlug],
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
        queryClient.setQueryData(
          ['skill-loadouts', projectSlug],
          context.previous,
        )
      }
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to update skill loadout',
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['skill-loadouts', projectSlug],
      })
    },
  })
}

export function useDeleteSkillLoadout(projectSlug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { slug: string }) => {
      const response = await fetch(
        `/api/projects/${projectSlug}/skill-loadouts/${encodeURIComponent(input.slug)}`,
        { method: 'DELETE' },
      )
      if (!response.ok) {
        throw await createResponseError(
          response,
          'Failed to delete skill loadout',
        )
      }
      return response.json()
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: ['skill-loadouts', projectSlug],
      })

      const previous = queryClient.getQueryData<SkillLoadoutSummary[]>([
        'skill-loadouts',
        projectSlug,
      ])

      queryClient.setQueryData<SkillLoadoutSummary[]>(
        ['skill-loadouts', projectSlug],
        (old) => old?.filter((s) => s.slug !== input.slug),
      )

      return { previous }
    },
    onError: (error, _, context) => {
      if (context?.previous != null) {
        queryClient.setQueryData(
          ['skill-loadouts', projectSlug],
          context.previous,
        )
      }
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to delete skill loadout',
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['skill-loadouts', projectSlug],
      })
      queryClient.invalidateQueries({
        queryKey: ['skills', projectSlug],
      })
    },
  })
}

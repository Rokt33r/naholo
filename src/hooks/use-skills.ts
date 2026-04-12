import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetcher, createResponseError } from '@/lib/fetcher'

export type { Skill } from 'naholo-api/types'

import type { Skill } from 'naholo-api/types'

function skillsBasePath(projectSlug: string, skillSetSlug: string) {
  return `/api/projects/${projectSlug}/skill-sets/${encodeURIComponent(skillSetSlug)}/skills`
}

export function useSkills(projectSlug: string, skillSetSlug: string) {
  const query = useQuery({
    queryKey: ['skills', projectSlug, skillSetSlug],
    queryFn: () => fetcher<Skill[]>(skillsBasePath(projectSlug, skillSetSlug)),
    staleTime: 60_000,
  })

  return {
    skills: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}

export function useSkill(
  projectSlug: string,
  skillSetSlug: string,
  skillName: string,
) {
  const query = useQuery({
    queryKey: ['skills', projectSlug, skillSetSlug, skillName],
    queryFn: () =>
      fetcher<Skill>(
        `${skillsBasePath(projectSlug, skillSetSlug)}/${encodeURIComponent(skillName)}`,
      ),
    staleTime: 60_000,
  })

  return {
    skill: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
  }
}

export function useUpsertSkill(projectSlug: string, skillSetSlug: string) {
  const queryClient = useQueryClient()
  const queryKey = ['skills', projectSlug, skillSetSlug]

  return useMutation({
    mutationFn: async (input: { name: string; content: string }) => {
      const response = await fetch(
        `${skillsBasePath(projectSlug, skillSetSlug)}/${encodeURIComponent(input.name)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: input.content }),
        },
      )
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to save skill')
      }
      return response.json()
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey })

      const previous = queryClient.getQueryData<Skill[]>(queryKey)

      queryClient.setQueryData<Skill[]>(queryKey, (old) => {
        const existing = old?.find((s) => s.name === input.name)
        if (existing != null) {
          return old?.map((s) =>
            s.name === input.name ? { ...s, content: input.content } : s,
          )
        }
        return [
          ...(old ?? []),
          {
            id: 'temp-' + Date.now(),
            name: input.name,
            content: input.content,
            currentRevisionId: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]
      })

      return { previous }
    },
    onError: (error, _, context) => {
      if (context?.previous != null) {
        queryClient.setQueryData(queryKey, context.previous)
      }
      toast.error(
        error instanceof Error ? error.message : 'Failed to save skill',
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })
}

export function useDeleteSkill(projectSlug: string, skillSetSlug: string) {
  const queryClient = useQueryClient()
  const queryKey = ['skills', projectSlug, skillSetSlug]

  return useMutation({
    mutationFn: async (input: { skillName: string }) => {
      const response = await fetch(
        `${skillsBasePath(projectSlug, skillSetSlug)}/${encodeURIComponent(input.skillName)}`,
        { method: 'DELETE' },
      )
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to delete skill')
      }
      return response.json()
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey })

      const previous = queryClient.getQueryData<Skill[]>(queryKey)

      queryClient.setQueryData<Skill[]>(queryKey, (old) =>
        old?.filter((s) => s.name !== input.skillName),
      )

      return { previous }
    },
    onError: (error, _, context) => {
      if (context?.previous != null) {
        queryClient.setQueryData(queryKey, context.previous)
      }
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete skill',
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })
}

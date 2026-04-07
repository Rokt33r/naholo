import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetcher, createResponseError } from '@/lib/fetcher'

export type { Skill } from 'naholo-api/types'

import type { Skill } from 'naholo-api/types'

export function useSkills(projectId: string) {
  const query = useQuery({
    queryKey: ['skills', projectId],
    queryFn: () => fetcher<Skill[]>(`/api/projects/${projectId}/skills`),
    staleTime: 60_000,
  })

  return {
    skills: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}

export function useCreateSkill(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { name: string; content: string }) => {
      const response = await fetch(`/api/projects/${projectId}/skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to create skill')
      }
      return response.json()
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ['skills', projectId] })

      const previous = queryClient.getQueryData<Skill[]>(['skills', projectId])

      queryClient.setQueryData<Skill[]>(['skills', projectId], (old) => [
        ...(old ?? []),
        {
          id: 'temp-' + Date.now(),
          name: input.name,
          content: input.content,
          position: (old ?? []).length,
          currentRevisionId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ])

      return { previous }
    },
    onError: (err, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['skills', projectId], context.previous)
      }
      toast.error(err instanceof Error ? err.message : 'Failed to create skill')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['skills', projectId] })
    },
  })
}

export function useUpdateSkill(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      skillName: string
      name?: string
      content?: string
    }) => {
      const { skillName, ...body } = input
      const response = await fetch(
        `/api/projects/${projectId}/skills/${encodeURIComponent(skillName)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      )
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to update skill')
      }
      return response.json()
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ['skills', projectId] })

      const previous = queryClient.getQueryData<Skill[]>(['skills', projectId])

      queryClient.setQueryData<Skill[]>(['skills', projectId], (old) =>
        old?.map((skill) =>
          skill.name === input.skillName
            ? {
                ...skill,
                ...(input.name !== undefined ? { name: input.name } : {}),
                ...(input.content !== undefined
                  ? { content: input.content }
                  : {}),
              }
            : skill,
        ),
      )

      return { previous }
    },
    onError: (err, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['skills', projectId], context.previous)
      }
      toast.error(err instanceof Error ? err.message : 'Failed to update skill')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['skills', projectId] })
    },
  })
}

export function useDeleteSkill(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { skillName: string }) => {
      const response = await fetch(
        `/api/projects/${projectId}/skills/${encodeURIComponent(input.skillName)}`,
        { method: 'DELETE' },
      )
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to delete skill')
      }
      return response.json()
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ['skills', projectId] })

      const previous = queryClient.getQueryData<Skill[]>(['skills', projectId])

      queryClient.setQueryData<Skill[]>(['skills', projectId], (old) =>
        old?.filter((skill) => skill.name !== input.skillName),
      )

      return { previous }
    },
    onError: (err, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['skills', projectId], context.previous)
      }
      toast.error(err instanceof Error ? err.message : 'Failed to delete skill')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['skills', projectId] })
    },
  })
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetcher, createResponseError } from '@/lib/fetcher'

export type { Note } from 'naholo-api/types'

import type { Note } from 'naholo-api/types'

/**
 * Hook to fetch notes for an issue
 */
export function useNotes(projectId: string, issueNumber: number) {
  return useQuery({
    queryKey: ['notes', issueNumber],
    queryFn: () =>
      fetcher<Note[]>(`/api/projects/${projectId}/issues/${issueNumber}/notes`),
    staleTime: 1000 * 60,
  })
}

/**
 * Hook to create a note with optimistic updates
 */
export function useCreateNote(projectId: string, issueNumber: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      title,
      content,
    }: {
      title: string
      content: string
    }) => {
      const response = await fetch(
        `/api/projects/${projectId}/issues/${issueNumber}/notes`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content }),
        },
      )
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to create note')
      }
      return response.json() as Promise<Note>
    },
    onMutate: async ({ title, content }) => {
      await queryClient.cancelQueries({ queryKey: ['notes', issueNumber] })

      const previousNotes = queryClient.getQueryData<Note[]>([
        'notes',
        issueNumber,
      ])

      const maxPosition =
        previousNotes && previousNotes.length > 0
          ? Math.max(...previousNotes.map((n) => n.position))
          : -1

      const optimisticNote: Note = {
        id: `temp-${Date.now()}`,
        title,
        content,
        position: maxPosition + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      queryClient.setQueryData<Note[]>(['notes', issueNumber], (old) => [
        ...(old ?? []),
        optimisticNote,
      ])

      return { previousNotes }
    },
    onError: (err, _, context) => {
      if (context?.previousNotes) {
        queryClient.setQueryData(['notes', issueNumber], context.previousNotes)
      }
      toast.error(err instanceof Error ? err.message : 'Failed to create note')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', issueNumber] })
    },
  })
}

/**
 * Hook to update a note with optimistic updates
 */
export function useUpdateNote(projectId: string, issueNumber: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      noteId,
      title,
      content,
    }: {
      noteId: string
      title: string
      content: string
    }) => {
      const response = await fetch(
        `/api/projects/${projectId}/issues/${issueNumber}/notes/${noteId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content }),
        },
      )
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to update note')
      }
      return response.json() as Promise<Note>
    },
    onMutate: async ({ noteId, title, content }) => {
      await queryClient.cancelQueries({ queryKey: ['notes', issueNumber] })

      const previousNotes = queryClient.getQueryData<Note[]>([
        'notes',
        issueNumber,
      ])

      queryClient.setQueryData<Note[]>(['notes', issueNumber], (old) =>
        old?.map((note) =>
          note.id === noteId
            ? { ...note, title, content, updatedAt: new Date().toISOString() }
            : note,
        ),
      )

      return { previousNotes }
    },
    onError: (err, _, context) => {
      if (context?.previousNotes) {
        queryClient.setQueryData(['notes', issueNumber], context.previousNotes)
      }
      toast.error(err instanceof Error ? err.message : 'Failed to update note')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', issueNumber] })
    },
  })
}

/**
 * Hook to delete a note with optimistic updates
 */
export function useDeleteNote(projectId: string, issueNumber: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (noteId: string) => {
      const response = await fetch(
        `/api/projects/${projectId}/issues/${issueNumber}/notes/${noteId}`,
        { method: 'DELETE' },
      )
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to delete note')
      }
    },
    onMutate: async (noteId) => {
      await queryClient.cancelQueries({ queryKey: ['notes', issueNumber] })

      const previousNotes = queryClient.getQueryData<Note[]>([
        'notes',
        issueNumber,
      ])

      queryClient.setQueryData<Note[]>(['notes', issueNumber], (old) =>
        old?.filter((note) => note.id !== noteId),
      )

      return { previousNotes }
    },
    onError: (err, _, context) => {
      if (context?.previousNotes) {
        queryClient.setQueryData(['notes', issueNumber], context.previousNotes)
      }
      toast.error(err instanceof Error ? err.message : 'Failed to delete note')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', issueNumber] })
    },
  })
}

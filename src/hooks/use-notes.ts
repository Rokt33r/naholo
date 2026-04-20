import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetcher, createResponseError } from '@/lib/fetcher'

export type { Note } from 'naholo-api/types'

import type { Note } from 'naholo-api/types'

/**
 * Hook to fetch notes for an issue
 */
export function useNotes(projectSlug: string, issueNumber: number) {
  return useQuery({
    queryKey: ['notes', issueNumber],
    queryFn: () =>
      fetcher<Note[]>(
        `/api/projects/${projectSlug}/operations/${issueNumber}/notes`,
      ),
    staleTime: 1000 * 60,
  })
}

/**
 * Hook to create a note with optimistic updates
 */
export function useCreateNote(projectSlug: string, issueNumber: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      name,
      content,
    }: {
      name: string
      content: string
    }) => {
      const response = await fetch(
        `/api/projects/${projectSlug}/operations/${issueNumber}/notes`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, content }),
        },
      )
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to create note')
      }
      return response.json() as Promise<Note>
    },
    onMutate: async ({ name, content }) => {
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
        name,
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
 *
 * TODO: Split note update and note rename.
 */
export function useUpdateNote(projectSlug: string, issueNumber: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      noteName,
      newName,
      content,
    }: {
      noteName: string
      newName?: string
      content?: string
    }) => {
      const body: Record<string, string> = {}
      if (newName != null) {
        body.name = newName
      }
      if (content != null) {
        body.content = content
      }
      const response = await fetch(
        `/api/projects/${projectSlug}/operations/${issueNumber}/notes/${encodeURIComponent(noteName)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      )
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to update note')
      }
      return response.json() as Promise<Note>
    },
    onMutate: async ({ noteName, newName, content }) => {
      await queryClient.cancelQueries({ queryKey: ['notes', issueNumber] })

      const previousNotes = queryClient.getQueryData<Note[]>([
        'notes',
        issueNumber,
      ])

      queryClient.setQueryData<Note[]>(['notes', issueNumber], (old) =>
        old?.map((note) => {
          if (note.name !== noteName) {
            return note
          }
          return {
            ...note,
            ...(newName != null ? { name: newName } : {}),
            ...(content != null ? { content } : {}),
            updatedAt: new Date().toISOString(),
          }
        }),
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
export function useDeleteNote(projectSlug: string, issueNumber: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (noteName: string) => {
      const response = await fetch(
        `/api/projects/${projectSlug}/operations/${issueNumber}/notes/${encodeURIComponent(noteName)}`,
        { method: 'DELETE' },
      )
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to delete note')
      }
    },
    onMutate: async (noteName) => {
      await queryClient.cancelQueries({ queryKey: ['notes', issueNumber] })

      const previousNotes = queryClient.getQueryData<Note[]>([
        'notes',
        issueNumber,
      ])

      queryClient.setQueryData<Note[]>(['notes', issueNumber], (old) =>
        old?.filter((note) => note.name !== noteName),
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

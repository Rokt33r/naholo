import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetcher, createResponseError } from '@/lib/fetcher'

export type ProjectInvite = {
  id: string
  email: string
  status: string
  claimerUser: {
    id: string
    name: string
    identifiers: { type: string; value: string }[]
  } | null
  inviterWorkerName: string | null
  createdAt: string
}

export type ProjectInviteStatus = {
  id: string
  status: string
  projectName: string
  projectSlug: string
  alreadyMember: boolean
}

export function useProjectInvites(projectSlug: string) {
  const query = useQuery({
    queryKey: ['invites', projectSlug],
    queryFn: () =>
      fetcher<ProjectInvite[]>(`/api/projects/${projectSlug}/invites`),
  })

  return {
    invites: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}

export function useCreateProjectInvite(projectSlug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (email: string) => {
      const response = await fetch(`/api/projects/${projectSlug}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to create invite')
      }
      return response.json() as Promise<{ id: string; inviteUrl: string }>
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create invite',
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['invites', projectSlug] })
    },
  })
}

export function useAcceptProjectInvite(projectSlug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (inviteId: string) => {
      const response = await fetch(
        `/api/projects/${projectSlug}/invites/${inviteId}/accept`,
        { method: 'POST' },
      )
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to accept invite')
      }
      return response.json() as Promise<{ projectOperatorId: string }>
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to accept invite',
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['invites', projectSlug] })
      queryClient.invalidateQueries({ queryKey: ['workers', projectSlug] })
    },
  })
}

export function useRejectProjectInvite(projectSlug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (inviteId: string) => {
      const response = await fetch(
        `/api/projects/${projectSlug}/invites/${inviteId}/reject`,
        { method: 'POST' },
      )
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to reject invite')
      }
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to reject invite',
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['invites', projectSlug] })
    },
  })
}

export function useProjectInvite(inviteId: string) {
  const query = useQuery({
    queryKey: ['invite', inviteId],
    queryFn: () => fetcher<ProjectInviteStatus>(`/api/invites/${inviteId}`),
    retry: false,
  })

  return {
    invite: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
  }
}

export function useClaimProjectInvite(inviteId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/invites/${inviteId}/claim`, {
        method: 'POST',
      })
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to claim invite')
      }
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to claim invite',
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['invite', inviteId] })
    },
  })
}

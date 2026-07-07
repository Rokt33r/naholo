import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetcher, createResponseError } from '@/lib/fetcher'

export type ClaimerIdentifier = {
  method: 'Google' | 'Email'
  label: string
}

export type ProjectInvite = {
  id: string
  email: string
  status: string
  name: string | null
  callsign: string | null
  claimerUser: {
    id: string
    name: string
    identifiers: ClaimerIdentifier[]
  } | null
  inviterOperatorName: string | null
  createdAt: string
}

export type AcceptInviteErrorBody = {
  code: string | null
  message: string
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

/**
 * Errors reject with the parsed response body (`AcceptInviteErrorBody`) —
 * no toast here; callers decide how to render each error code.
 */
export function useAcceptProjectInvite(projectSlug: string) {
  const queryClient = useQueryClient()

  return useMutation<
    { projectOperatorId: string },
    AcceptInviteErrorBody,
    string
  >({
    mutationFn: async (inviteId) => {
      const response = await fetch(
        `/api/projects/${projectSlug}/invites/${inviteId}/accept`,
        { method: 'POST' },
      )
      if (!response.ok) {
        throw await readAcceptInviteErrorBody(response)
      }
      return response.json() as Promise<{ projectOperatorId: string }>
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['invites', projectSlug] })
      queryClient.invalidateQueries({ queryKey: ['operators', projectSlug] })
    },
  })
}

export type UpdateInviteInput = {
  inviteId: string
  name?: string
  callsign?: string
}

/**
 * Hook for admins to update a claimed invite's requested name/callsign.
 * Refetches the invite list on success.
 */
export function useUpdateProjectInvite(projectSlug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ inviteId, name, callsign }: UpdateInviteInput) => {
      const response = await fetch(
        `/api/projects/${projectSlug}/invites/${inviteId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, callsign }),
        },
      )
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to update invite')
      }
      return response.json() as Promise<ProjectInvite>
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update invite',
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['invites', projectSlug] })
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
    mutationFn: async (input: { name: string; callsign: string }) => {
      const response = await fetch(`/api/invites/${inviteId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
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

async function readAcceptInviteErrorBody(
  response: Response,
): Promise<AcceptInviteErrorBody> {
  try {
    const data = await response.json()
    return {
      code: typeof data.code === 'string' ? data.code : null,
      message: data.message || data.error || 'Failed to accept invite',
    }
  } catch (parseError) {
    console.error('Failed to parse error response:', {
      status: response.status,
      parseError,
    })
    return { code: null, message: 'Failed to accept invite' }
  }
}

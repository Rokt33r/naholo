'use client'

import { Check, X, Copy, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  useProjectInvites,
  useAcceptProjectInvite,
  useRejectProjectInvite,
} from '@/hooks/use-project-invites'
import type { ProjectInvite } from '@/hooks/use-project-invites'

type InviteListProps = {
  projectSlug: string
}

export function InviteList({ projectSlug }: InviteListProps) {
  const { invites, isLoading } = useProjectInvites(projectSlug)

  if (isLoading) {
    return (
      <div className='flex justify-center px-4 py-3'>
        <Loader2 className='size-4 animate-spin text-muted-foreground' />
      </div>
    )
  }

  if (invites.length === 0) {
    return (
      <div className='px-4 py-3 text-center text-sm text-muted-foreground'>
        No pending invites
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-2'>
      {invites.map((invite) => (
        <InviteCard key={invite.id} invite={invite} projectSlug={projectSlug} />
      ))}
    </div>
  )
}

function InviteCard({
  invite,
  projectSlug,
}: {
  invite: ProjectInvite
  projectSlug: string
}) {
  const { mutate: accept, isPending: isAccepting } =
    useAcceptProjectInvite(projectSlug)
  const { mutate: reject, isPending: isRejecting } =
    useRejectProjectInvite(projectSlug)
  const isBusy = isAccepting || isRejecting

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/app/invites/${invite.id}`
    await navigator.clipboard.writeText(url)
    toast.success('Invite link copied')
  }

  return (
    <div className='flex items-start gap-2 rounded-lg border px-4 py-3 text-sm'>
      <div className='flex-1 min-w-0'>
        <div className='truncate font-medium'>{invite.email}</div>
        <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
          <StatusLabel status={invite.status} />
          {invite.claimerUser != null && (
            <span className='truncate'>&middot; {invite.claimerUser.name}</span>
          )}
          <span>
            &middot;{' '}
            {formatDistanceToNow(new Date(invite.createdAt), {
              addSuffix: true,
            })}
          </span>
        </div>
        {invite.claimerUser != null &&
          invite.claimerUser.identifiers.length > 0 && (
            <div className='mt-0.5 flex flex-col text-xs text-muted-foreground'>
              {invite.claimerUser.identifiers.map((identifier, index) => (
                <span key={index} className='truncate'>
                  {identifier.method} &middot; {identifier.label}
                </span>
              ))}
            </div>
          )}
      </div>
      <div className='flex items-center gap-1 shrink-0'>
        {invite.status === 'claimed' && (
          <>
            <Button
              size='icon-sm'
              variant='ghost'
              onClick={() => accept(invite.id)}
              disabled={isBusy}
              title='Accept'
            >
              <Check className='size-4' />
            </Button>
            <Button
              size='icon-sm'
              variant='ghost'
              onClick={() => reject(invite.id)}
              disabled={isBusy}
              title='Reject'
            >
              <X className='size-4' />
            </Button>
          </>
        )}
        {invite.status === 'pending' && (
          <>
            <Button
              size='icon-sm'
              variant='ghost'
              onClick={() => reject(invite.id)}
              disabled={isBusy}
              title='Reject'
            >
              <X className='size-4' />
            </Button>
            <Button
              size='icon-sm'
              variant='ghost'
              onClick={handleCopyLink}
              title='Copy invite link'
            >
              <Copy className='size-4' />
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

function StatusLabel({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'text-yellow-600',
    claimed: 'text-blue-600',
    accepted: 'text-green-600',
    rejected: 'text-red-600',
  }

  return <span className={colors[status] ?? ''}>{status}</span>
}

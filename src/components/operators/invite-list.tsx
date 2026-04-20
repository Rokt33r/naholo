'use client'

import { Check, X, Copy, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  useProjectInvites,
  useAcceptProjectInvite,
  useRejectProjectInvite,
} from '@/hooks/use-project-invites'
import { formatIssueDate } from '@/lib/date-utils'
import type { ProjectInvite } from '@/hooks/use-project-invites'

type InviteListProps = {
  projectSlug: string
}

export function InviteList({ projectSlug }: InviteListProps) {
  const { invites, isLoading } = useProjectInvites(projectSlug)

  if (isLoading) {
    return (
      <div className='flex justify-center py-4'>
        <Loader2 className='size-4 animate-spin text-muted-foreground' />
      </div>
    )
  }

  if (invites.length === 0) {
    return null
  }

  return (
    <div>
      <Separator className='my-2' />
      <h3 className='text-sm font-medium text-muted-foreground mb-2'>
        Invites
      </h3>
      <div className='max-h-48 overflow-y-auto space-y-1'>
        {invites.map((invite) => (
          <InviteItem
            key={invite.id}
            invite={invite}
            projectSlug={projectSlug}
          />
        ))}
      </div>
    </div>
  )
}

function InviteItem({
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
    <div className='flex items-start gap-2 rounded-md px-2 py-1.5 text-sm'>
      <div className='flex-1 min-w-0'>
        <div className='truncate font-medium'>{invite.email}</div>
        <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
          <StatusLabel status={invite.status} />
          {invite.claimerUser != null && (
            <span className='truncate'>
              &middot; {invite.claimerUser.name}
              {invite.claimerUser.identifiers.length > 0 && (
                <span className='ml-1'>
                  (
                  {invite.claimerUser.identifiers
                    .map((i) => i.value)
                    .join(', ')}
                  )
                </span>
              )}
            </span>
          )}
          <span>&middot; {formatIssueDate(invite.createdAt)}</span>
        </div>
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
              <Check className='size-3.5' />
            </Button>
            <Button
              size='icon-sm'
              variant='ghost'
              onClick={() => reject(invite.id)}
              disabled={isBusy}
              title='Reject'
            >
              <X className='size-3.5' />
            </Button>
          </>
        )}
        {invite.status === 'pending' && (
          <Button
            size='icon-sm'
            variant='ghost'
            onClick={handleCopyLink}
            title='Copy invite link'
          >
            <Copy className='size-3.5' />
          </Button>
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

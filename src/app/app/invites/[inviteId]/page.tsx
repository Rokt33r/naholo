import { requireAuthUser } from '@/server/auth/permissions'
import { getProjectInvite } from '@/server/services/project-invite'
import { getProjectOperatorByUserId } from '@/server/services/project-operator'
import { deriveCallsignFromName } from '@/lib/callsign'
import { InvitePageClient } from './invite-page-client'

export default async function InvitePage({
  params,
}: {
  params: Promise<{ inviteId: string }>
}) {
  const { inviteId } = await params
  const user = await requireAuthUser({
    allowedAuthMethods: ['session'],
    redirectUrlOnFail: '/sign-in',
  })

  const invite = await getProjectInvite(inviteId)

  // Not found, claimed by someone else, or rejected — show not found
  if (
    invite == null ||
    (invite.status === 'claimed' &&
      invite.claimerUserId != null &&
      invite.claimerUserId !== user.id) ||
    invite.status === 'rejected'
  ) {
    return (
      <CenteredCard>
        <h1 className='text-lg font-semibold'>Invite not found</h1>
        <p className='text-sm text-muted-foreground'>
          This invite may have expired or is no longer valid.
        </p>
      </CenteredCard>
    )
  }

  // Check if already a member
  const existingOperator = await getProjectOperatorByUserId(
    user.id,
    invite.projectId,
  )

  if (existingOperator != null) {
    return (
      <CenteredCard>
        <h1 className='text-lg font-semibold'>
          You&apos;re already in {invite.project.name}
        </h1>
        <a
          href={`/app/projects/${invite.project.slug}/operations`}
          className='inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90'
        >
          Enter project
        </a>
      </CenteredCard>
    )
  }

  if (invite.status === 'accepted') {
    return (
      <CenteredCard>
        <h1 className='text-lg font-semibold'>
          You&apos;ve been added to {invite.project.name}
        </h1>
        <a
          href={`/app/projects/${invite.project.slug}/operations`}
          className='inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90'
        >
          Enter project
        </a>
      </CenteredCard>
    )
  }

  if (invite.status === 'claimed') {
    return (
      <CenteredCard>
        <h1 className='text-lg font-semibold'>Request sent</h1>
        <p className='text-sm text-muted-foreground'>
          Waiting for an admin of {invite.project.name} to approve your request.
        </p>
      </CenteredCard>
    )
  }

  // Pending — show claim button
  return (
    <CenteredCard>
      <h1 className='text-lg font-semibold'>
        You&apos;ve been invited to {invite.project.name}
      </h1>
      <p className='text text-muted-foreground'>
        Request to join this project. An admin will review your request.
      </p>
      <InvitePageClient
        inviteId={inviteId}
        defaultName={user.name}
        defaultCallsign={deriveCallsignFromName(user.name)}
      />
    </CenteredCard>
  )
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className='flex min-h-screen items-center justify-center'>
      <div className='flex max-w-sm flex-col items-center gap-4 text-center'>
        {children}
      </div>
    </div>
  )
}

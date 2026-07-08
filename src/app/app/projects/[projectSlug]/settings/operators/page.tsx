'use client'

import { UserPlus } from 'lucide-react'
import { useProjectContext } from '@/components/app/project-context'
import { InviteList } from '@/components/operators/invite-list'
import { InviteProjectOperatorDialog } from '@/components/operators/invite-project-operator-dialog'
import { OperatorSelfEditCard } from '@/components/operators/operator-self-edit-card'
import { OperatorsList } from '@/components/operators/operators-list'
import { OperatorsSeatsSummary } from '@/components/operators/operators-seats-summary'
import { Button } from '@/components/ui/button'
import { useProjectInvites } from '@/hooks/use-project-invites'

export default function OperatorsIndexPage() {
  const { projectSlug } = useProjectContext()
  const { invites, isLoading: isInvitesLoading } =
    useProjectInvites(projectSlug)

  return (
    <>
      <OperatorsSeatsSummary projectSlug={projectSlug} />
      <OperatorSelfEditCard projectSlug={projectSlug} />
      <OperatorsList projectSlug={projectSlug} />

      <section className='flex flex-col gap-4'>
        <div className='flex items-center justify-between gap-2'>
          <div className='flex items-baseline gap-2.5'>
            <h2 className='text-lg font-semibold tracking-tight'>Invites</h2>
            {!isInvitesLoading && (
              <span className='text-sm text-muted-foreground'>
                {invites.length}
              </span>
            )}
          </div>
          <InviteProjectOperatorDialog projectSlug={projectSlug}>
            <Button size='sm' variant='outline' title='Invite user'>
              <UserPlus className='size-4' /> Invite
            </Button>
          </InviteProjectOperatorDialog>
        </div>
        <InviteList projectSlug={projectSlug} />
      </section>
    </>
  )
}

'use client'

import { UserPlus } from 'lucide-react'
import { useProjectContext } from '@/components/app/project-context'
import { InviteList } from '@/components/operators/invite-list'
import { InviteProjectOperatorDialog } from '@/components/operators/invite-project-operator-dialog'
import { OperatorsList } from '@/components/operators/operators-list'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useProjectInvites } from '@/hooks/use-project-invites'

export default function OperatorsIndexPage() {
  const { projectSlug } = useProjectContext()
  const { invites, isLoading: isInvitesLoading } =
    useProjectInvites(projectSlug)

  return (
    <div className='flex flex-col gap-6'>
      <OperatorsList projectSlug={projectSlug} />

      <Card>
        <CardHeader className='border-b'>
          <CardTitle className='flex items-baseline gap-2.5'>
            Pending invites
            {!isInvitesLoading && (
              <span className='text-muted-foreground text-sm font-normal'>
                {invites.length}
              </span>
            )}
          </CardTitle>
          <CardAction>
            <InviteProjectOperatorDialog projectSlug={projectSlug}>
              <Button size='sm' variant='outline' title='Invite user'>
                <UserPlus className='size-4' /> Invite
              </Button>
            </InviteProjectOperatorDialog>
          </CardAction>
        </CardHeader>
        <CardContent>
          <InviteList projectSlug={projectSlug} />
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useClaimProjectTrial } from '@/hooks/use-active-project-subscription'

type StartTrialProps = {
  projectSlug: string
}

export function StartTrial({ projectSlug }: StartTrialProps) {
  const claimProjectTrial = useClaimProjectTrial(projectSlug)

  const handleClick = () => {
    claimProjectTrial.mutate()
  }

  return (
    <div className='flex flex-col gap-3 rounded-lg border p-4'>
      {claimProjectTrial.error != null && (
        <Alert variant='destructive'>
          <AlertDescription>{claimProjectTrial.error.message}</AlertDescription>
        </Alert>
      )}
      <Button
        variant='outline'
        onClick={handleClick}
        disabled={claimProjectTrial.isPending}
        className='self-start'
      >
        {claimProjectTrial.isPending
          ? 'Starting trial…'
          : 'Start 1-month free trial'}
      </Button>
    </div>
  )
}

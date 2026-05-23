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
    <div className='flex h-full flex-col gap-3 rounded-lg border p-4'>
      <div className='flex flex-col gap-1'>
        <h4 className='text-sm font-semibold'>Try it free</h4>
        <p className='text-muted-foreground text-sm'>
          Use Naholo free for 30 days. Single operator only — No credit card
          required.
        </p>
      </div>
      {claimProjectTrial.error != null && (
        <Alert variant='destructive'>
          <AlertDescription>{claimProjectTrial.error.message}</AlertDescription>
        </Alert>
      )}
      <Button
        variant='outline'
        onClick={handleClick}
        disabled={claimProjectTrial.isPending}
        className='mt-auto self-start'
      >
        {claimProjectTrial.isPending ? 'Starting trial…' : 'Start free trial'}
      </Button>
    </div>
  )
}

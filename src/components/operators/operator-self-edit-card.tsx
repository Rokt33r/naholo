'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useProjectContext } from '@/components/app/project-context'
import { useOperators, useUpdateProjectOperator } from '@/hooks/use-operators'
import { isValidCallsign } from '@/lib/callsign'

type OperatorSelfEditCardProps = {
  projectSlug: string
}

export function OperatorSelfEditCard({
  projectSlug,
}: OperatorSelfEditCardProps) {
  const { currentOperator } = useProjectContext()
  const { operators } = useOperators(projectSlug)
  const updateOperator = useUpdateProjectOperator(projectSlug)

  const selfOperator =
    operators.find((operator) => operator.id === currentOperator.id) ?? null

  const [name, setName] = useState('')
  const [callsign, setCallsign] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const selfOperatorId = selfOperator?.id ?? null
  useEffect(() => {
    if (selfOperator != null) {
      setName(selfOperator.name)
      setCallsign(selfOperator.callsign)
    }
    // Seed the form once the operator row arrives; re-seeding on every
    // refetch would clobber in-progress edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selfOperatorId])

  if (selfOperator == null) {
    return null
  }

  const trimmedName = name.trim()
  const trimmedCallsign = callsign.trim()
  const hasChanges =
    trimmedName !== selfOperator.name ||
    trimmedCallsign !== selfOperator.callsign

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()

    if (trimmedName === '') {
      setFormError('Name is required')
      return
    }
    if (!isValidCallsign(trimmedCallsign)) {
      setFormError('Callsign may only contain a-z, 0-9, "-" and "."')
      return
    }

    setFormError(null)
    updateOperator.mutate(
      {
        operatorId: selfOperator.id,
        name: trimmedName,
        callsign: trimmedCallsign,
      },
      {
        onSuccess: () => {
          toast.success('Operator updated')
        },
      },
    )
  }

  const errorMessage = formError ?? updateOperator.error?.message ?? null

  return (
    <Card>
      <CardHeader>
        <CardTitle>My profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          id='self-profile-form'
          onSubmit={handleSave}
          className='flex flex-col gap-3'
        >
          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='self-operator-name'>Name</Label>
            <Input
              id='self-operator-name'
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={updateOperator.isPending}
            />
          </div>
          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='self-operator-callsign'>Callsign</Label>
            <Input
              id='self-operator-callsign'
              value={callsign}
              onChange={(e) => setCallsign(e.target.value.toLowerCase())}
              disabled={updateOperator.isPending}
            />
            <p className='text-muted-foreground text-xs'>
              Callsigns identify operators in text across the project, so yours
              must be unique. Only a-z, 0-9, &quot;-&quot; and &quot;.&quot;.
            </p>
          </div>
          {errorMessage != null && (
            <p className='text-destructive text-xs'>{errorMessage}</p>
          )}
        </form>
      </CardContent>
      <CardFooter className='justify-end'>
        <Button
          form='self-profile-form'
          type='submit'
          size='sm'
          disabled={!hasChanges || updateOperator.isPending}
        >
          {updateOperator.isPending ? 'Saving...' : 'Save'}
        </Button>
      </CardFooter>
    </Card>
  )
}

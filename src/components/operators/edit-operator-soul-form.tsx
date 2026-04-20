'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useUpdateOperator } from '@/hooks/use-operators'
import { toast } from 'sonner'

type EditOperatorSoulFormProps = {
  projectSlug: string
  operatorId: string
  soul: string | null
}

export function EditOperatorSoulForm({
  projectSlug,
  operatorId,
  soul,
}: EditOperatorSoulFormProps) {
  const [value, setValue] = useState(soul ?? '')
  const updateOperator = useUpdateOperator(projectSlug, operatorId)

  const isDirty = value !== (soul ?? '')

  function handleSave() {
    updateOperator.mutate(
      { soul: value },
      {
        onSuccess: () => {
          toast.success('Soul saved')
        },
      },
    )
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h2 className='text-sm font-semibold'>Soul</h2>
        {isDirty && (
          <Button
            size='sm'
            onClick={handleSave}
            disabled={updateOperator.isPending}
          >
            {updateOperator.isPending ? 'Saving...' : 'Save'}
          </Button>
        )}
      </div>
      <textarea
        className='min-h-[200px] w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring'
        placeholder='Define the personality for this bot operator...'
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  )
}

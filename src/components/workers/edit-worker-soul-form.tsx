'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useUpdateWorker } from '@/hooks/use-workers'
import { toast } from 'sonner'

type EditWorkerSoulFormProps = {
  projectSlug: string
  workerId: string
  soul: string | null
}

export function EditWorkerSoulForm({
  projectSlug,
  workerId,
  soul,
}: EditWorkerSoulFormProps) {
  const [value, setValue] = useState(soul ?? '')
  const updateWorker = useUpdateWorker(projectSlug, workerId)

  const isDirty = value !== (soul ?? '')

  function handleSave() {
    updateWorker.mutate(
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
            disabled={updateWorker.isPending}
          >
            {updateWorker.isPending ? 'Saving...' : 'Save'}
          </Button>
        )}
      </div>
      <textarea
        className='min-h-[200px] w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring'
        placeholder='Define the personality for this bot worker...'
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  )
}

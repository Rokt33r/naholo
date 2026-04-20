'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateOperator } from '@/hooks/use-operators'

type CreateBotOperatorDialogProps = {
  projectSlug: string
  children: React.ReactNode
  onOperatorCreated?: () => void
}

export function CreateBotOperatorDialog({
  projectSlug,
  children,
  onOperatorCreated,
}: CreateBotOperatorDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const createOperator = useCreateOperator(projectSlug)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      return
    }

    const result = await createOperator.mutateAsync(name.trim())
    setOpen(false)
    setName('')
    onOperatorCreated?.()
    router.push(`/app/projects/${projectSlug}/operators/${result.id}`)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Operator</DialogTitle>
            <DialogDescription>
              Create a new bot operator for this project.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label htmlFor='operator-name'>Name *</Label>
              <Input
                id='operator-name'
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='Operator name'
                disabled={createOperator.isPending}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => setOpen(false)}
              disabled={createOperator.isPending}
            >
              Cancel
            </Button>
            <Button
              type='submit'
              disabled={!name.trim() || createOperator.isPending}
            >
              {createOperator.isPending ? 'Creating...' : 'Create Operator'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

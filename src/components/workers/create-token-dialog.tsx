'use client'

import { useState } from 'react'
import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useCreateWorkerToken } from '@/hooks/use-worker-tokens'

type CreateTokenDialogProps = {
  projectId: string
  workerId: string
  children: React.ReactNode
}

export function CreateTokenDialog({
  projectId,
  workerId,
  children,
}: CreateTokenDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [createdToken, setCreatedToken] = useState<string | null>(null)
  const { mutateAsync: createToken, isPending } = useCreateWorkerToken(
    projectId,
    workerId,
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      return
    }

    const result = await createToken(name.trim())
    setCreatedToken(result.token)
  }

  const handleCopy = async () => {
    if (createdToken) {
      await navigator.clipboard.writeText(createdToken)
      toast.success('Token copied to clipboard')
    }
  }

  const handleClose = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      setName('')
      setCreatedToken(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        {createdToken ? (
          <>
            <DialogHeader>
              <DialogTitle>Token Created</DialogTitle>
              <DialogDescription>
                Copy this token now. It will not be shown again.
              </DialogDescription>
            </DialogHeader>
            <div className='py-4'>
              <div className='flex items-center gap-2'>
                <code className='flex-1 rounded-md bg-muted px-3 py-2 text-sm break-all'>
                  {createdToken}
                </code>
                <Button variant='outline' size='icon' onClick={handleCopy}>
                  <Copy className='size-4' />
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Create API Token</DialogTitle>
              <DialogDescription>
                Create a new token to authenticate API requests as this worker.
              </DialogDescription>
            </DialogHeader>
            <div className='space-y-4 py-4'>
              <div className='space-y-2'>
                <Label htmlFor='token-name'>Name *</Label>
                <Input
                  id='token-name'
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder='e.g. Claude Code'
                  disabled={isPending}
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => handleClose(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={!name.trim() || isPending}>
                {isPending ? 'Creating...' : 'Create Token'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

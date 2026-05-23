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
import { useCreateProjectInvite } from '@/hooks/use-project-invites'

type InviteUserOperatorDialogProps = {
  projectSlug: string
  children: React.ReactNode
}

export function InviteProjectOperatorDialog({
  projectSlug,
  children,
}: InviteUserOperatorDialogProps) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const { mutateAsync: createInvite, isPending } =
    useCreateProjectInvite(projectSlug)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim()) {
      return
    }

    const result = await createInvite(email.trim())
    setInviteUrl(result.inviteUrl)
  }

  const handleCopy = async () => {
    if (inviteUrl != null) {
      await navigator.clipboard.writeText(inviteUrl)
      toast.success('Invite link copied to clipboard')
    }
  }

  const handleClose = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      setEmail('')
      setInviteUrl(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        {inviteUrl != null ? (
          <>
            <DialogHeader>
              <DialogTitle>Invite Sent</DialogTitle>
              <DialogDescription>
                Share this link with the person you want to invite.
              </DialogDescription>
            </DialogHeader>
            <div className='py-4'>
              <div className='flex items-center gap-2'>
                <code className='flex-1 rounded-md bg-muted px-3 py-2 text-sm break-all'>
                  {inviteUrl}
                </code>
                <Button variant='outline' size='icon' onClick={handleCopy}>
                  <Copy className='size-4' />
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant='outline'
                onClick={() => {
                  setEmail('')
                  setInviteUrl(null)
                }}
              >
                Invite another
              </Button>
              <Button onClick={() => handleClose(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Invite User</DialogTitle>
                <DialogDescription>
                  Send an invite link to a user&apos;s email address.
                </DialogDescription>
              </DialogHeader>
              <div className='space-y-4 py-4'>
                <div className='space-y-2'>
                  <Label htmlFor='invite-email'>Email *</Label>
                  <Input
                    id='invite-email'
                    type='email'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder='user@example.com'
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
                <Button type='submit' disabled={!email.trim() || isPending}>
                  {isPending ? 'Sending...' : 'Send Invite'}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

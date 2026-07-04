'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
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
import { useAction } from '@/lib/use-action'
import { createProjectAction } from '@/app/app/actions'
import { fetcher } from '@/lib/fetcher'
import { deriveCallsignFromName, isValidCallsign } from '@/lib/callsign'

type CreateProjectDialogProps = {
  children: React.ReactNode
}

export function CreateProjectDialog({ children }: CreateProjectDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [callsign, setCallsign] = useState('')
  const [callsignTouched, setCallsignTouched] = useState(false)
  const [description, setDescription] = useState('')

  const { data: authUser } = useQuery({
    queryKey: ['auth-user'],
    queryFn: () => fetcher<{ id: string; name: string }>('/api/auth/user'),
  })

  useEffect(() => {
    if (!callsignTouched && authUser != null) {
      setCallsign(deriveCallsignFromName(authUser.name))
    }
  }, [authUser, callsignTouched])

  const { execute: createProject, loading } = useAction(createProjectAction)

  const trimmedCallsign = callsign.trim()
  const callsignInvalid =
    trimmedCallsign !== '' && !isValidCallsign(trimmedCallsign)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (
      !name.trim() ||
      !slug.trim() ||
      trimmedCallsign === '' ||
      callsignInvalid
    ) {
      return
    }

    const result = await createProject(
      name.trim(),
      slug.trim(),
      trimmedCallsign,
      description.trim() || undefined,
    )

    if (!result.success) {
      alert('Failed to create project: ' + result.error.message)
      return
    }

    const projectSlug = result.data.slug
    setOpen(false)
    setName('')
    setSlug('')
    setCallsign('')
    setCallsignTouched(false)
    setDescription('')
    router.push(`/app/projects/${projectSlug}`)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
            <DialogDescription>
              Create a new project to organize your notes and tasks.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label htmlFor='name'>Name *</Label>
              <Input
                id='name'
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='My Project'
                disabled={loading}
                autoFocus
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='slug'>Slug *</Label>
              <Input
                id='slug'
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder='my-project'
                pattern='[a-z0-9-]+'
                disabled={loading}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='callsign'>Callsign *</Label>
              <Input
                id='callsign'
                value={callsign}
                onChange={(e) => {
                  setCallsign(e.target.value.toLowerCase())
                  setCallsignTouched(true)
                }}
                placeholder='your.callsign'
                disabled={loading}
              />
              {callsignInvalid ? (
                <p className='text-destructive text-xs'>
                  Callsign may only contain a-z, 0-9, &quot;-&quot; and
                  &quot;.&quot;
                </p>
              ) : (
                <p className='text-muted-foreground text-xs'>
                  How other operators call you in this project. Only a-z, 0-9,
                  &quot;-&quot; and &quot;.&quot;.
                </p>
              )}
            </div>
            <div className='space-y-2'>
              <Label htmlFor='description'>Description</Label>
              <Input
                id='description'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder='Optional description'
                disabled={loading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type='submit'
              disabled={
                !name.trim() ||
                !slug.trim() ||
                trimmedCallsign === '' ||
                callsignInvalid ||
                loading
              }
            >
              {loading ? 'Creating...' : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

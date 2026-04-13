'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAction } from '@/lib/use-action'
import { updateProjectAction } from '@/app/app/actions'
import { useProjectContext } from '@/components/app/project-context'
import { useProjects } from '@/hooks/use-projects'

type ProjectSettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProjectSettingsDialog({
  open,
  onOpenChange,
}: ProjectSettingsDialogProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { projectSlug } = useProjectContext()
  const { data: projects } = useProjects()

  const project = projects?.find((p) => p.slug === projectSlug)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [slug, setSlug] = useState('')
  const [slugError, setSlugError] = useState<string | null>(null)

  const { execute: updateProject, loading: generalLoading } =
    useAction(updateProjectAction)
  const { execute: updateSlug, loading: slugLoading } =
    useAction(updateProjectAction)

  useEffect(() => {
    if (open && project != null) {
      setName(project.name)
      setDescription(project.description ?? '')
      setSlug(project.slug)
      setSlugError(null)
    }
  }, [open, project])

  const handleGeneralSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      return
    }

    const result = await updateProject(projectSlug, {
      name: name.trim(),
      description: description.trim() || undefined,
    })

    if (result.success) {
      await queryClient.invalidateQueries({
        queryKey: ['projects', 'withWorker'],
      })
    } else {
      alert('Failed to update project: ' + result.error.message)
    }
  }

  const handleSlugSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSlugError(null)

    if (!slug.trim() || slug.trim() === projectSlug) {
      return
    }

    const result = await updateSlug(projectSlug, { slug: slug.trim() })

    if (result.success) {
      await queryClient.invalidateQueries({
        queryKey: ['projects', 'withWorker'],
      })
      onOpenChange(false)
      router.replace(`/app/projects/${result.data.slug}/issues`)
    } else {
      setSlugError(result.error.message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Project Settings</DialogTitle>
          <DialogDescription>
            Manage your project name, description, and URL slug.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleGeneralSubmit}>
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label htmlFor='project-name'>Name *</Label>
              <Input
                id='project-name'
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='My Project'
                disabled={generalLoading}
                autoFocus
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='project-description'>Description</Label>
              <Input
                id='project-description'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder='Optional description'
                disabled={generalLoading}
              />
            </div>
          </div>
          <div className='flex justify-end'>
            <Button type='submit' disabled={!name.trim() || generalLoading}>
              {generalLoading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>

        <div className='border-t pt-4'>
          <h3 className='text-sm font-medium'>URL Settings</h3>
          <p className='text-muted-foreground mt-1 text-xs'>
            Changing the slug will break existing links to this project.
          </p>
          <form onSubmit={handleSlugSubmit}>
            <div className='space-y-2 py-4'>
              <Label htmlFor='project-slug'>Slug *</Label>
              <Input
                id='project-slug'
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value)
                  setSlugError(null)
                }}
                placeholder='my-project'
                pattern='[a-z0-9-]+'
                disabled={slugLoading}
              />
              {slugError != null && (
                <p className='text-destructive text-xs'>{slugError}</p>
              )}
            </div>
            <div className='flex justify-end'>
              <Button
                type='submit'
                disabled={
                  !slug.trim() || slug.trim() === projectSlug || slugLoading
                }
              >
                {slugLoading ? 'Changing...' : 'Change slug'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

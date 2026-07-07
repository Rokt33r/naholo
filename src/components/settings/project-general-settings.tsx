'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAction } from '@/lib/use-action'
import { updateProjectAction } from '@/app/app/actions'
import { useProjectContext } from '@/components/app/project-context'
import { useProjects } from '@/hooks/use-projects'

export function ProjectGeneralSettings() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { projectSlug, currentOperator } = useProjectContext()
  const { data: projects } = useProjects()
  const isAdmin = currentOperator.role === 'admin'

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
    if (project != null) {
      setName(project.name)
      setDescription(project.description ?? '')
      setSlug(project.slug)
      setSlugError(null)
    }
  }, [project])

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
        queryKey: ['projects', 'withOperator'],
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
        queryKey: ['projects', 'withOperator'],
      })
      router.replace(`/app/projects/${result.data.slug}/settings`)
    } else {
      setSlugError(result.error.message)
    }
  }

  return (
    <div className='space-y-6'>
      <div>
        <h3 className='text-lg font-semibold'>General</h3>
        <p className='text-muted-foreground text-sm'>
          Manage your project name, description, and URL slug.
        </p>
        {!isAdmin && (
          <p className='text-muted-foreground mt-1 text-sm'>
            Only project admins can edit these settings.
          </p>
        )}
      </div>

      <form onSubmit={handleGeneralSubmit}>
        <div className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='project-name'>Name *</Label>
            <Input
              id='project-name'
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='My Project'
              disabled={!isAdmin || generalLoading}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='project-description'>Description</Label>
            <Input
              id='project-description'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='Optional description'
              disabled={!isAdmin || generalLoading}
            />
          </div>
        </div>
        <div className='mt-4 flex justify-end'>
          <Button
            type='submit'
            disabled={!isAdmin || !name.trim() || generalLoading}
          >
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
              disabled={!isAdmin || slugLoading}
            />
            {slugError != null && (
              <p className='text-destructive text-xs'>{slugError}</p>
            )}
          </div>
          <div className='flex justify-end'>
            <Button
              type='submit'
              disabled={
                !isAdmin ||
                !slug.trim() ||
                slug.trim() === projectSlug ||
                slugLoading
              }
            >
              {slugLoading ? 'Changing...' : 'Change slug'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

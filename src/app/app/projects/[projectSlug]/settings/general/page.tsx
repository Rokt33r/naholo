'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AutoResizeTextarea } from '@/components/ui/auto-resize-textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAction } from '@/lib/use-action'
import { updateProjectAction } from '@/app/app/actions'
import { useProjectContext } from '@/components/app/project-context'
import { OperatorSelfEditCard } from '@/components/operators/operator-self-edit-card'
import { useProjects } from '@/hooks/use-projects'

export default function SettingsGeneralPage() {
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
      <OperatorSelfEditCard projectSlug={projectSlug} />

      {!isAdmin && (
        <p className='text-muted-foreground text-sm'>
          Only project admins can edit these settings.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Project info</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            id='project-info-form'
            onSubmit={handleGeneralSubmit}
            className='space-y-4'
          >
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
              <AutoResizeTextarea
                id='project-description'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder='Optional description'
                disabled={!isAdmin || generalLoading}
                rows={2}
                className='border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 w-full resize-none overflow-hidden rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50'
              />
            </div>
          </form>
        </CardContent>
        <CardFooter className='justify-end'>
          <Button
            form='project-info-form'
            type='submit'
            disabled={!isAdmin || !name.trim() || generalLoading}
          >
            {generalLoading ? 'Saving...' : 'Save'}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Project URL</CardTitle>
          <CardDescription>
            Changing the slug will break existing links to this project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            id='project-url-form'
            onSubmit={handleSlugSubmit}
            className='space-y-2'
          >
            <Label htmlFor='project-slug'>Slug *</Label>
            <div className='border-input dark:bg-input/30 focus-within:border-ring focus-within:ring-ring/50 flex items-stretch overflow-hidden rounded-md border shadow-xs transition-[color,box-shadow] focus-within:ring-[3px]'>
              <label
                htmlFor='project-slug'
                className='text-muted-foreground flex cursor-text items-center py-1 pl-3 font-mono text-sm whitespace-nowrap select-none'
              >
                naholo.app/projects/
              </label>
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
                className='border-0 pl-0 font-mono shadow-none focus-visible:ring-0 dark:bg-transparent'
              />
            </div>
            <p className='text-muted-foreground text-xs'>
              After changing the slug, operators must re-run{' '}
              <code className='font-mono'>naholo init</code> (or{' '}
              <code className='font-mono'>naholo covert init</code>) in every
              local codebase to reconnect it to this project.
            </p>
            {slugError != null && (
              <p className='text-destructive text-xs'>{slugError}</p>
            )}
          </form>
        </CardContent>
        <CardFooter className='justify-end'>
          <Button
            form='project-url-form'
            type='submit'
            variant='destructive'
            disabled={
              !isAdmin ||
              !slug.trim() ||
              slug.trim() === projectSlug ||
              slugLoading
            }
          >
            {slugLoading ? 'Changing...' : 'Change slug'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

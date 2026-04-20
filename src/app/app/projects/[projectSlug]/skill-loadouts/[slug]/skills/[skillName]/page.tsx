'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useProjectContext } from '@/components/app/project-context'
import { useSkill, useUpsertSkill, useDeleteSkill } from '@/hooks/use-skills'

export default function SkillDetailPage() {
  const { projectId } = useProjectContext()
  const { slug, skillName: rawSkillName } = useParams<{
    slug: string
    skillName: string
  }>()
  const skillName = decodeURIComponent(rawSkillName)
  const router = useRouter()

  const { skill, isLoading } = useSkill(projectId, slug, skillName)
  const upsertSkill = useUpsertSkill(projectId, slug)
  const deleteSkill = useDeleteSkill(projectId, slug)

  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (skill != null && !initialized) {
      setName(skill.name)
      setContent(skill.content)
      setInitialized(true)
    }
  }, [skill, initialized])

  const isPending = upsertSkill.isPending || deleteSkill.isPending
  const isSubmitDisabled = !name.trim() || !content.trim() || isPending

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitDisabled) {
      return
    }
    upsertSkill.mutate({ name: name.trim(), content })
  }

  const handleDelete = () => {
    if (!window.confirm('Delete this skill?')) {
      return
    }
    deleteSkill.mutate(
      { skillName },
      {
        onSuccess: () =>
          router.push(`/app/projects/${projectId}/skill-loadouts/${slug}`),
      },
    )
  }

  return (
    <div className='flex h-full flex-col'>
      <div className='flex items-center gap-2 px-4 pt-2'>
        <Button
          variant='ghost'
          size='icon-sm'
          onClick={() =>
            router.push(`/app/projects/${projectId}/skill-loadouts/${slug}`)
          }
        >
          <ArrowLeft className='size-4' />
        </Button>
        <h1 className='flex-1 truncate text-sm font-semibold'>{skillName}</h1>
        <Button
          variant='ghost'
          size='icon-sm'
          className='text-destructive'
          onClick={handleDelete}
          disabled={isPending}
        >
          <Trash2 className='size-4' />
        </Button>
      </div>

      <div className='flex-1 overflow-y-auto'>
        {isLoading ? (
          <div className='p-6 text-center text-sm text-muted-foreground'>
            Loading...
          </div>
        ) : skill == null && initialized ? (
          <div className='p-6 text-center text-sm text-muted-foreground'>
            Skill not found
          </div>
        ) : (
          <form
            onSubmit={handleSave}
            className='mx-auto max-w-2xl space-y-4 p-6'
          >
            <div className='flex flex-col gap-2'>
              <Label htmlFor='skill-name'>Name</Label>
              <Input
                id='skill-name'
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className='flex flex-col gap-2'>
              <Label htmlFor='skill-content'>Content</Label>
              <textarea
                id='skill-content'
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className='min-h-[400px] w-full rounded-md border bg-transparent px-3 py-2 font-mono text-sm resize-y focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'
                required
              />
            </div>
            <div className='flex justify-end'>
              <Button type='submit' disabled={isSubmitDisabled}>
                Save
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

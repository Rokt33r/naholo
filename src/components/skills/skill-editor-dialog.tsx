'use client'

import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUpsertSkill, useDeleteSkill } from '@/hooks/use-skills'
import type { Skill } from '@/hooks/use-skills'

type SkillEditorDialogProps = {
  projectSlug: string
  skillSetSlug: string
  skill?: Skill | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SkillEditorDialog({
  projectSlug,
  skillSetSlug,
  skill,
  open,
  onOpenChange,
}: SkillEditorDialogProps) {
  const [name, setName] = useState('')
  const [content, setContent] = useState('')

  const isEditMode = !!skill
  const upsertSkill = useUpsertSkill(projectSlug, skillSetSlug)
  const deleteSkill = useDeleteSkill(projectSlug, skillSetSlug)

  const isPending = upsertSkill.isPending || deleteSkill.isPending
  const isSubmitDisabled = !name.trim() || !content.trim() || isPending

  useEffect(() => {
    if (open) {
      setName(skill?.name ?? '')
      setContent(skill?.content ?? '')
    }
  }, [open, skill])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitDisabled) {
      return
    }

    upsertSkill.mutate(
      { name, content },
      { onSuccess: () => onOpenChange(false) },
    )
  }

  const handleDelete = () => {
    if (skill == null) {
      return
    }
    if (!window.confirm('Delete this skill?')) {
      return
    }
    deleteSkill.mutate(
      { skillName: skill.name },
      { onSuccess: () => onOpenChange(false) },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit Skill' : 'Create Skill'}
          </DialogTitle>
          <DialogDescription>
            Define a skill for your project.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
          <div className='flex flex-col gap-2'>
            <Label htmlFor='skill-name'>Name</Label>
            <Input
              id='skill-name'
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='e.g. elaborate-plan'
              autoFocus
              required
            />
          </div>
          <div className='flex flex-col gap-2'>
            <Label htmlFor='skill-content'>Content</Label>
            <textarea
              id='skill-content'
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                '---\ndescription: What this skill does\n---\n\n# Skill Name\n\nInstructions...'
              }
              className='min-h-[300px] w-full rounded-md border bg-transparent px-3 py-2 font-mono text-sm resize-y focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'
              required
            />
          </div>
          <DialogFooter className={isEditMode ? 'sm:justify-between' : ''}>
            {isEditMode && (
              <Button
                type='button'
                variant='ghost'
                className='text-destructive'
                onClick={handleDelete}
                disabled={isPending}
              >
                <Trash2 />
                Delete
              </Button>
            )}
            <div className='flex gap-2'>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={isSubmitDisabled}>
                {isEditMode ? 'Save Changes' : 'Create Skill'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

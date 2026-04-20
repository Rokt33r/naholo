'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FolderOpen, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ProjectSwitcher } from '@/components/projects/project-switcher'
import { AppModeMenu } from '@/components/app/app-mode-menu'
import { useProjectContext } from '@/components/app/project-context'
import { useIsMobile } from '@/hooks/use-is-mobile'
import { useSkillSets, useCreateSkillSet } from '@/hooks/use-skill-sets'
import type { SkillSetSummary } from '@/hooks/use-skill-sets'

export default function SkillLoadoutsPage() {
  const { projectSlug, projectName, projects } = useProjectContext()
  const router = useRouter()
  const isMobile = useIsMobile()
  const { skillSets: skillLoadouts, isLoading } = useSkillSets(projectSlug)
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className='flex h-full flex-col'>
      <div className='flex items-center justify-between px-4 pt-2 gap-2'>
        {isMobile && <AppModeMenu currentProjectSlug={projectSlug} />}
        <ProjectSwitcher
          projects={projects}
          currentProjectSlug={projectSlug}
          currentProjectName={projectName}
        />
        <Button
          variant='ghost'
          size='icon-sm'
          onClick={() => setCreateOpen(true)}
        >
          <Plus className='size-4' />
        </Button>
      </div>

      <div className='px-4 py-3'>
        <h2 className='text-sm font-semibold text-muted-foreground'>
          Skill Loadouts
        </h2>
      </div>

      <div className='flex-1 overflow-y-auto px-2'>
        {isLoading ? (
          <div className='p-4 text-center text-sm text-muted-foreground'>
            Loading...
          </div>
        ) : skillLoadouts.length === 0 ? (
          <div className='p-4 text-center text-sm text-muted-foreground'>
            No skill loadouts in this project
          </div>
        ) : (
          <div>
            {skillLoadouts.map((skillLoadout) => (
              <SkillLoadoutItem
                key={skillLoadout.id}
                skillLoadout={skillLoadout}
                onClick={() =>
                  router.push(
                    `/app/projects/${projectSlug}/skill-loadouts/${skillLoadout.slug}`,
                  )
                }
              />
            ))}
          </div>
        )}
      </div>

      <CreateSkillLoadoutDialog
        projectSlug={projectSlug}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </div>
  )
}

function SkillLoadoutItem({
  skillLoadout,
  onClick,
}: {
  skillLoadout: SkillSetSummary
  onClick: () => void
}) {
  return (
    <button
      className='flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-accent'
      onClick={onClick}
    >
      <FolderOpen className='size-4 text-muted-foreground' />
      <div className='flex-1 min-w-0'>
        <div className='truncate text-sm font-medium'>{skillLoadout.name}</div>
        <div className='truncate text-xs text-muted-foreground'>
          {skillLoadout.slug}
        </div>
      </div>
    </button>
  )
}

function CreateSkillLoadoutDialog({
  projectSlug,
  open,
  onOpenChange,
}: {
  projectSlug: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const createSkillLoadout = useCreateSkillSet(projectSlug)

  const isSubmitDisabled =
    !name.trim() || !slug.trim() || createSkillLoadout.isPending

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitDisabled) {
      return
    }
    createSkillLoadout.mutate(
      { name: name.trim(), slug: slug.trim() },
      {
        onSuccess: () => {
          onOpenChange(false)
          setName('')
          setSlug('')
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Create Skill Loadout</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
          <div className='flex flex-col gap-2'>
            <Label htmlFor='skill-loadout-name'>Name</Label>
            <Input
              id='skill-loadout-name'
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='e.g. Core Skills'
              autoFocus
              required
            />
          </div>
          <div className='flex flex-col gap-2'>
            <Label htmlFor='skill-loadout-slug'>Slug</Label>
            <Input
              id='skill-loadout-slug'
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder='e.g. core-skills'
              pattern='[a-z0-9-]+'
              required
            />
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={isSubmitDisabled}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

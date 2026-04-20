'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Puzzle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useProjectContext } from '@/components/app/project-context'
import { useSkillLoadouts } from '@/hooks/use-skill-loadouts'
import { useSkills } from '@/hooks/use-skills'
import { parseFrontmatterDescription } from '@/lib/parse-frontmatter-description'
import { SkillEditorDialog } from '@/components/skills/skill-editor-dialog'
import type { Skill } from '@/hooks/use-skills'

export default function SkillLoadoutDetailPage() {
  const { projectSlug } = useProjectContext()
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const { skillLoadouts } = useSkillLoadouts(projectSlug)
  const { skills, isLoading } = useSkills(projectSlug, slug)
  const [editorOpen, setEditorOpen] = useState(false)

  const skillLoadout = skillLoadouts.find((s) => s.slug === slug)

  return (
    <div className='flex h-full flex-col'>
      <div className='flex items-center gap-2 px-4 pt-2'>
        <Button
          variant='ghost'
          size='icon-sm'
          onClick={() =>
            router.push(`/app/projects/${projectSlug}/skill-loadouts`)
          }
        >
          <ArrowLeft className='size-4' />
        </Button>
        <h1 className='flex-1 truncate text-sm font-semibold'>
          {skillLoadout?.name ?? slug}
        </h1>
        <Button
          variant='ghost'
          size='icon-sm'
          onClick={() => setEditorOpen(true)}
        >
          <Plus className='size-4' />
        </Button>
      </div>

      <div className='px-4 py-3'>
        <h2 className='text-sm font-semibold text-muted-foreground'>Skills</h2>
      </div>

      <div className='flex-1 overflow-y-auto px-2'>
        {isLoading ? (
          <div className='p-4 text-center text-sm text-muted-foreground'>
            Loading...
          </div>
        ) : skills.length === 0 ? (
          <div className='p-4 text-center text-sm text-muted-foreground'>
            No skills in this skill loadout
          </div>
        ) : (
          <div>
            {skills.map((skill) => (
              <SkillItem
                key={skill.id}
                skill={skill}
                onClick={() =>
                  router.push(
                    `/app/projects/${projectSlug}/skill-loadouts/${slug}/skills/${encodeURIComponent(skill.name)}`,
                  )
                }
              />
            ))}
          </div>
        )}
      </div>

      <SkillEditorDialog
        projectSlug={projectSlug}
        skillLoadoutSlug={slug}
        open={editorOpen}
        onOpenChange={setEditorOpen}
      />
    </div>
  )
}

function SkillItem({ skill, onClick }: { skill: Skill; onClick: () => void }) {
  const description = parseFrontmatterDescription(skill.content)

  return (
    <button
      className='flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-accent'
      onClick={onClick}
    >
      <Puzzle className='size-4 text-muted-foreground' />
      <div className='flex-1 min-w-0'>
        <div className='truncate text-sm font-medium'>{skill.name}</div>
        {description != null && (
          <div className='truncate text-xs text-muted-foreground'>
            {description}
          </div>
        )}
      </div>
    </button>
  )
}

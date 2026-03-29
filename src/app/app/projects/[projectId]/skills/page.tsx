'use client'

import { useState } from 'react'
import { Plus, Puzzle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProjectSwitcher } from '@/components/projects/project-switcher'
import { AppModeMenu } from '@/components/app/app-mode-menu'
import { useProjectContext } from '@/components/app/project-context'
import { useIsMobile } from '@/hooks/use-is-mobile'
import { useSkills } from '@/hooks/use-skills'
import { parseFrontmatterDescription } from '@/lib/parse-frontmatter-description'
import { SkillEditorDialog } from '@/components/skills/skill-editor-dialog'
import type { Skill } from '@/hooks/use-skills'

export default function SkillsPage() {
  const { projectId, projectName, projects } = useProjectContext()
  const isMobile = useIsMobile()
  const { skills, isLoading } = useSkills(projectId)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null)

  const handleCreateClick = () => {
    setEditingSkill(null)
    setEditorOpen(true)
  }

  const handleSkillClick = (skill: Skill) => {
    setEditingSkill(skill)
    setEditorOpen(true)
  }

  return (
    <div className='flex h-full flex-col'>
      <div className='flex items-center justify-between px-4 pt-2 gap-2'>
        {isMobile && <AppModeMenu currentProjectId={projectId} />}
        <ProjectSwitcher
          projects={projects}
          currentProjectId={projectId}
          currentProjectName={projectName}
        />
        <Button variant='ghost' size='icon-sm' onClick={handleCreateClick}>
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
            No skills in this project
          </div>
        ) : (
          <div>
            {skills.map((skill) => (
              <SkillItem
                key={skill.id}
                skill={skill}
                onClick={() => handleSkillClick(skill)}
              />
            ))}
          </div>
        )}
      </div>

      <SkillEditorDialog
        projectId={projectId}
        skill={editingSkill}
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
        {description && (
          <div className='truncate text-xs text-muted-foreground'>
            {description}
          </div>
        )}
      </div>
    </button>
  )
}

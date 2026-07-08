'use client'

import { useState } from 'react'
import { LandPlot, FolderCog, UserCog } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  ToolSidebar,
  ToolSidebarButton,
  ToolSidebarSpacing,
} from '@/components/ui/tool-sidebar'
import { PreferencesDialog } from '@/components/preferences/preferences-dialog'
import { ProjectSwitcher } from '@/components/projects/project-switcher'
import { useProjectContext } from '@/components/app/project-context'

type AppModeSidebarProps = {
  currentProjectSlug: string
  currentMode: string
}

export function AppModeSidebar({
  currentProjectSlug,
  currentMode,
}: AppModeSidebarProps) {
  const router = useRouter()
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const { projectName, projects } = useProjectContext()

  return (
    <ToolSidebar>
      <ProjectSwitcher
        projects={projects}
        currentProjectSlug={currentProjectSlug}
        currentProjectName={projectName}
      />
      <ToolSidebarButton
        isActive={currentMode === 'operations'}
        tooltip='Operations'
        onClick={() =>
          router.push(`/app/projects/${currentProjectSlug}/operations`)
        }
      >
        <LandPlot className='size-4' />
      </ToolSidebarButton>
      <ToolSidebarButton
        isActive={currentMode === 'settings'}
        tooltip='Project settings'
        onClick={() =>
          router.push(`/app/projects/${currentProjectSlug}/settings/general`)
        }
      >
        <FolderCog className='size-4' />
      </ToolSidebarButton>
      <ToolSidebarSpacing />

      <ToolSidebarButton
        tooltip='Preferences'
        onClick={() => setPreferencesOpen(true)}
      >
        <UserCog className='size-4' />
      </ToolSidebarButton>

      <PreferencesDialog
        open={preferencesOpen}
        onOpenChange={setPreferencesOpen}
      />
    </ToolSidebar>
  )
}

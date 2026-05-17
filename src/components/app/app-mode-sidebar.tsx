'use client'

import { useState } from 'react'
import { LandPlot, Contact, Settings } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  ToolSidebar,
  ToolSidebarButton,
  ToolSidebarSeparator,
  ToolSidebarSpacing,
} from '@/components/ui/tool-sidebar'
import { SettingsDialog } from '@/components/settings/settings-dialog'
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
  const [settingsOpen, setSettingsOpen] = useState(false)
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
        <LandPlot className='size-5' />
      </ToolSidebarButton>
      <ToolSidebarButton
        isActive={currentMode === 'operators'}
        tooltip='Operators'
        onClick={() =>
          router.push(`/app/projects/${currentProjectSlug}/operators`)
        }
      >
        <Contact className='size-5' />
      </ToolSidebarButton>
      <ToolSidebarSpacing />

      <ToolSidebarButton
        tooltip='Settings'
        onClick={() => setSettingsOpen(true)}
      >
        <Settings className='size-5' />
      </ToolSidebarButton>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </ToolSidebar>
  )
}

'use client'

import { useState } from 'react'
import { LandPlot, Contact, ToolCase, Settings } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  ToolSidebar,
  ToolSidebarButton,
  ToolSidebarSpacing,
} from '@/components/ui/tool-sidebar'
import { SettingsDialog } from '@/components/settings/settings-dialog'

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

  return (
    <ToolSidebar>
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
      <ToolSidebarButton
        isActive={currentMode === 'skill-loadouts'}
        tooltip='Skill Loadouts'
        onClick={() =>
          router.push(`/app/projects/${currentProjectSlug}/skill-loadouts`)
        }
      >
        <ToolCase className='size-5' />
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

'use client'

import { useState } from 'react'
import { ListTodo, HardHat, Puzzle, Settings } from 'lucide-react'
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
        isActive={currentMode === 'issues'}
        tooltip='Issues'
        onClick={() =>
          router.push(`/app/projects/${currentProjectSlug}/issues`)
        }
      >
        <ListTodo className='size-5' />
      </ToolSidebarButton>
      <ToolSidebarButton
        isActive={currentMode === 'workers'}
        tooltip='Workers'
        onClick={() =>
          router.push(`/app/projects/${currentProjectSlug}/workers`)
        }
      >
        <HardHat className='size-5' />
      </ToolSidebarButton>
      <ToolSidebarButton
        isActive={currentMode === 'skill-sets'}
        tooltip='Skills'
        onClick={() =>
          router.push(`/app/projects/${currentProjectSlug}/skill-sets`)
        }
      >
        <Puzzle className='size-5' />
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

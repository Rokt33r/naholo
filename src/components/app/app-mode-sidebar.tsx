'use client'

import { useState } from 'react'
import {
  ListTodo,
  HardHat,
  Puzzle,
  Settings,
  LogOut,
  Pencil,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  ToolSidebar,
  ToolSidebarButton,
  ToolSidebarSpacing,
} from '@/components/ui/tool-sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAction } from '@/lib/use-action'
import { logoutAction } from '@/app/app/actions'
import { useProjectContext } from '@/components/app/project-context'
import { ProjectSettingsDialog } from '@/components/projects/project-settings-dialog'

type AppModeSidebarProps = {
  currentProjectSlug: string
  currentMode: string
}

export function AppModeSidebar({
  currentProjectSlug,
  currentMode,
}: AppModeSidebarProps) {
  const router = useRouter()
  const { currentWorker } = useProjectContext()
  const { execute: logout } = useAction(logoutAction)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
  }

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

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <ToolSidebarButton tooltip='Settings'>
            <Settings className='size-5' />
          </ToolSidebarButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' side='right'>
          {currentWorker.role === 'admin' && (
            <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
              <Pencil className='mr-2 h-4 w-4' />
              Project Settings
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className='mr-2 h-4 w-4' />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProjectSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </ToolSidebar>
  )
}

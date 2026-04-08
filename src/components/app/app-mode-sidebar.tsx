'use client'

import { ListTodo, HardHat, Puzzle, Settings, LogOut } from 'lucide-react'
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

type AppModeSidebarProps = {
  currentProjectId: string
  currentMode: string
}

export function AppModeSidebar({
  currentProjectId,
  currentMode,
}: AppModeSidebarProps) {
  const router = useRouter()
  const { execute: logout } = useAction(logoutAction)

  const handleLogout = async () => {
    await logout()
  }

  return (
    <ToolSidebar>
      <ToolSidebarButton
        isActive={currentMode === 'issues'}
        tooltip='Issues'
        onClick={() => router.push(`/app/projects/${currentProjectId}/issues`)}
      >
        <ListTodo className='size-5' />
      </ToolSidebarButton>
      <ToolSidebarButton
        isActive={currentMode === 'workers'}
        tooltip='Workers'
        onClick={() => router.push(`/app/projects/${currentProjectId}/workers`)}
      >
        <HardHat className='size-5' />
      </ToolSidebarButton>
      <ToolSidebarButton
        isActive={currentMode === 'skill-sets'}
        tooltip='Skills'
        onClick={() =>
          router.push(`/app/projects/${currentProjectId}/skill-sets`)
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
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className='mr-2 h-4 w-4' />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </ToolSidebar>
  )
}

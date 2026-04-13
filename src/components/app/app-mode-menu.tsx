'use client'

import { useState } from 'react'
import { ListTodo, HardHat, Puzzle, LogOut, Menu, Pencil } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAction } from '@/lib/use-action'
import { logoutAction } from '@/app/app/actions'
import { useProjectContext } from '@/components/app/project-context'
import { ProjectSettingsDialog } from '@/components/projects/project-settings-dialog'

type AppModeMenuProps = {
  currentProjectSlug: string
}

export function AppModeMenu({ currentProjectSlug }: AppModeMenuProps) {
  const router = useRouter()
  const { currentWorker } = useProjectContext()
  const { execute: logout } = useAction(logoutAction)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='icon-sm'>
          <Menu className='size-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='start'>
        <DropdownMenuItem
          onClick={() =>
            router.push(`/app/projects/${currentProjectSlug}/issues`)
          }
        >
          <ListTodo className='mr-2 h-4 w-4' />
          Issues
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            router.push(`/app/projects/${currentProjectSlug}/workers`)
          }
        >
          <HardHat className='mr-2 h-4 w-4' />
          Workers
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            router.push(`/app/projects/${currentProjectSlug}/skill-sets`)
          }
        >
          <Puzzle className='mr-2 h-4 w-4' />
          Skills
        </DropdownMenuItem>
        <DropdownMenuSeparator />
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

      <ProjectSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </DropdownMenu>
  )
}

'use client'

import { ListTodo, Settings, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar'
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
    <Sidebar collapsible='none' className='items-center'>
      <SidebarContent className='items-center py-2'>
        <SidebarMenu className='items-center'>
          <SidebarMenuItem>
            <SidebarMenuButton
              size='xl'
              isActive={currentMode === 'issues'}
              onClick={() => router.push(`/app/projects/${currentProjectId}`)}
              tooltip='Issues'
            >
              <ListTodo className='h-5 w-5' />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className='items-center'>
        <SidebarMenu className='items-center'>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size='xl' tooltip='Settings'>
                  <Settings className='h-5 w-5' />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' side='right'>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className='mr-2 h-4 w-4' />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

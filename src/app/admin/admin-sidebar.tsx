'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { publicConfig } from '@/lib/publicConfig'

const items = [
  { href: '/admin/users', label: 'Users', billingOnly: false },
  {
    href: '/admin/agent-transcripts',
    label: 'Agent Transcripts',
    billingOnly: false,
  },
  {
    href: '/admin/polar-webhook-events',
    label: 'Polar Webhook Events',
    billingOnly: true,
  },
  {
    href: '/admin/polar-subscriptions',
    label: 'Polar Subscriptions',
    billingOnly: true,
  },
  {
    href: '/admin/project-subscriptions',
    label: 'Project Subscriptions',
    billingOnly: true,
  },
  {
    href: '/admin/project-status',
    label: 'Project Status',
    billingOnly: true,
  },
]

export function AdminSidebar() {
  const pathname = usePathname()
  return (
    <Sidebar>
      <SidebarHeader>
        <div className='px-2 py-1 text-sm font-semibold text-sidebar-foreground'>
          Admin
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Sections</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items
                .filter((item) => publicConfig.billing || !item.billingOnly)
                .map((item) => {
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(item.href + '/')
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link href={item.href}>{item.label}</Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}

import { redirect } from 'next/navigation'
import { requireAuthOrRedirect } from '@/server/auth/utils'
import { getProject, listProjects } from '@/server/services/project'
import { AppModeSidebar } from '@/components/app/app-mode-sidebar'
import { IssuesList } from '@/components/issues/issues-list'
import {
  IssuesListProvider,
  IssuesListPanel,
} from '@/components/issues/issues-list-context'
import { SidebarProvider } from '@/components/ui/sidebar'
import { QueryProvider } from '@/components/query-provider'

type Props = {
  children: React.ReactNode
  params: Promise<{ projectId: string }>
}

export default async function ProjectLayout({ children, params }: Props) {
  const user = await requireAuthOrRedirect()
  const { projectId } = await params

  const [projects, project] = await Promise.all([
    listProjects(user.id),
    getProject(user.id, projectId),
  ])

  if (!project) {
    redirect('/app')
  }

  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': '60px',
        } as React.CSSProperties
      }
    >
      <QueryProvider>
        <IssuesListProvider>
          <div className='flex h-screen w-full'>
            <AppModeSidebar currentProjectId={projectId} currentMode='issues' />
            <IssuesListPanel>
              <IssuesList
                projectId={projectId}
                projectName={project.name}
                projects={projects}
              />
            </IssuesListPanel>

            {/* Right panel: Issue detail */}
            <div className='flex-1 overflow-hidden'>{children}</div>
          </div>
        </IssuesListProvider>
      </QueryProvider>
    </SidebarProvider>
  )
}

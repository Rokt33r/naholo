import { redirect } from 'next/navigation'
import { requireAuthOrRedirect } from '@/server/auth/utils'
import { getProject, listProjects } from '@/server/services/project'
import { ProjectSidebar } from '@/components/projects/project-sidebar'
import { IssuesList } from '@/components/issues/issues-list'
import { SidebarProvider } from '@/components/ui/sidebar'

type Props = {
  children: React.ReactNode
  params: Promise<{ projectId: string }>
}

export default async function ProjectLayout({ children, params }: Props) {
  const user = await requireAuthOrRedirect()
  const { projectId } = await params

  const [projectsResult, projectResult] = await Promise.all([
    listProjects(user.id),
    getProject(user.id, projectId),
  ])

  if (!projectResult.success || !projectResult.data) {
    redirect('/app')
  }

  const project = projectResult.data
  const projects = projectsResult.success ? projectsResult.data : []

  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': '60px',
        } as React.CSSProperties
      }
    >
      <div className='flex h-screen w-full'>
        <ProjectSidebar projects={projects} currentProjectId={projectId} />
        <div className='flex w-80 flex-col border-r'>
          <div className='flex-1 overflow-hidden'>
            <IssuesList projectId={projectId} projectName={project.name} />
          </div>
        </div>

        {/* Right panel: Issue detail */}
        <div className='flex-1 overflow-hidden'>{children}</div>
      </div>
    </SidebarProvider>
  )
}

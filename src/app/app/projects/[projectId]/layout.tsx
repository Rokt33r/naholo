import { redirect } from 'next/navigation'
import { getAuthUser } from '@/server/auth/utils'
import { getProjects, getProject, getIssues } from '../../dal'
import { ProjectSidebar } from '@/components/projects/project-sidebar'
import { IssuesList } from '@/components/issues/issues-list'
import { SidebarProvider } from '@/components/ui/sidebar'

type Props = {
  children: React.ReactNode
  params: Promise<{ projectId: string }>
}

export default async function ProjectLayout({ children, params }: Props) {
  const user = await getAuthUser()
  const { projectId } = await params

  if (!user) {
    redirect('/sign-in')
  }

  const [projects, project] = await Promise.all([
    getProjects(),
    getProject(projectId),
  ])

  if (!project) {
    redirect('/app')
  }

  const issues = await getIssues(projectId, false) // Show open issues by default

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
          <div className='border-b p-4'></div>
          <div className='flex-1 overflow-hidden'>
            <IssuesList projectId={projectId} issues={issues} />
          </div>
        </div>

        {/* Right panel: Issue detail */}
        <div className='flex-1 overflow-hidden'>{children}</div>
      </div>
    </SidebarProvider>
  )
}

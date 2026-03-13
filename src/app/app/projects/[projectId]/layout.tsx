import { redirect } from 'next/navigation'
import { requireAuthOrRedirect } from '@/server/auth/utils'
import { getProject, listProjects } from '@/server/services/project'
import { ProjectLayoutClient } from '@/components/app/project-layout-client'

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
    <ProjectLayoutClient
      projectId={projectId}
      projectName={project.name}
      projects={projects}
    >
      {children}
    </ProjectLayoutClient>
  )
}

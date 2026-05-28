import { requireAppAdmin } from '@/server/auth/permissions'
import { ProjectStatusClient } from './_components/project-status-client'

export default async function ProjectStatusAdminPage() {
  await requireAppAdmin()
  return <ProjectStatusClient />
}

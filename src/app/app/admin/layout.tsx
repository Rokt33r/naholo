import { requireAdminOrNotFound } from '@/server/auth/utils'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdminOrNotFound()
  return <>{children}</>
}

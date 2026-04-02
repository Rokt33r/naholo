import { requireAppAdmin } from '@/server/auth/permissions'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAppAdmin()
  return <>{children}</>
}

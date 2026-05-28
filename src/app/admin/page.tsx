import { redirect } from 'next/navigation'
import { requireAppAdmin } from '@/server/auth/permissions'

export default async function AdminPage() {
  await requireAppAdmin()
  redirect('/admin/users')
}

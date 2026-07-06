import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getUserDetail } from '@/server/admin/user'
import { requireAppAdmin } from '@/server/auth/permissions'

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  await requireAppAdmin()
  const { userId } = await params
  const user = await getUserDetail(userId)

  if (user == null) {
    notFound()
  }

  return (
    <div className='p-6'>
      <h1 className='text-xl font-semibold text-zinc-900 dark:text-zinc-50'>
        {user.name}
      </h1>
      <dl className='mt-2 space-y-1 text-sm'>
        <div className='flex gap-2'>
          <dt className='text-zinc-500 dark:text-zinc-400'>Identifiers:</dt>
          <dd className='text-zinc-900 dark:text-zinc-100'>
            {user.identifiers.length > 0
              ? user.identifiers
                  .map((identifier) => `${identifier.type}:${identifier.value}`)
                  .join(', ')
              : 'N/A'}
          </dd>
        </div>
      </dl>

      <h2 className='mt-6 text-sm font-semibold text-zinc-900 dark:text-zinc-50'>
        Projects
      </h2>
      <div className='mt-2 overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-800 dark:text-zinc-400'>
              <th className='pb-2 pr-4 font-medium'>Project</th>
              <th className='pb-2 font-medium'>Role</th>
            </tr>
          </thead>
          <tbody>
            {user.projectOperators.map((membership) => (
              <tr
                key={membership.projectId}
                className='border-b border-zinc-100 dark:border-zinc-800/50'
              >
                <td className='py-2 pr-4'>
                  <Link
                    href={`/admin/projects/${membership.projectId}`}
                    className='text-blue-600 hover:underline dark:text-blue-400'
                  >
                    {membership.projectName}
                  </Link>
                </td>
                <td className='py-2 text-zinc-600 dark:text-zinc-400'>
                  {membership.role}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

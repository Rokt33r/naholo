import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { getProjectDetail } from '@/server/admin/project'
import { requireAppAdmin } from '@/server/auth/permissions'

export default async function AdminProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  await requireAppAdmin()
  const { projectId } = await params
  const project = await getProjectDetail(projectId)

  if (project == null) {
    notFound()
  }

  return (
    <div className='p-6'>
      <h1 className='text-xl font-semibold text-zinc-900 dark:text-zinc-50'>
        {project.name}
      </h1>
      <dl className='mt-2 space-y-1 text-sm'>
        <div className='flex gap-2'>
          <dt className='text-zinc-500 dark:text-zinc-400'>Slug:</dt>
          <dd className='text-zinc-900 dark:text-zinc-100'>{project.slug}</dd>
        </div>
        <div className='flex gap-2'>
          <dt className='text-zinc-500 dark:text-zinc-400'>Status:</dt>
          <dd className='text-zinc-900 dark:text-zinc-100'>{project.status}</dd>
        </div>
      </dl>

      <h2 className='mt-6 text-sm font-semibold text-zinc-900 dark:text-zinc-50'>
        Operators
      </h2>
      <div className='mt-2 overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-800 dark:text-zinc-400'>
              <th className='pb-2 pr-4 font-medium'>Name</th>
              <th className='pb-2 pr-4 font-medium'>Role</th>
              <th className='pb-2 font-medium'>Joined</th>
            </tr>
          </thead>
          <tbody>
            {project.operators.map((operator) => (
              <tr
                key={operator.id}
                className='border-b border-zinc-100 dark:border-zinc-800/50'
              >
                <td className='py-2 pr-4'>
                  <Link
                    href={`/admin/users/${operator.userId}`}
                    className='text-blue-600 hover:underline dark:text-blue-400'
                  >
                    {operator.name}
                  </Link>
                </td>
                <td className='py-2 pr-4 text-zinc-600 dark:text-zinc-400'>
                  {operator.role}
                </td>
                <td className='py-2 text-zinc-500 dark:text-zinc-400'>
                  {format(operator.createdAt, 'yyyy-MM-dd')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

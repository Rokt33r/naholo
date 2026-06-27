import Link from 'next/link'
import { format } from 'date-fns'
import { listAllProjects } from '@/server/admin/project'
import { requireAppAdmin } from '@/server/auth/permissions'

export default async function AdminProjectsPage() {
  await requireAppAdmin()
  const projects = await listAllProjects()

  return (
    <div className='p-6'>
      <h1 className='text-xl font-semibold text-zinc-900 dark:text-zinc-50'>
        Projects
      </h1>
      <div className='mt-4 overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-800 dark:text-zinc-400'>
              <th className='pb-2 pr-4 font-medium'>Name</th>
              <th className='pb-2 pr-4 font-medium'>Slug</th>
              <th className='pb-2 pr-4 font-medium'>Status</th>
              <th className='pb-2 pr-4 font-medium'>Members</th>
              <th className='pb-2 font-medium'>Created</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr
                key={project.id}
                className='border-b border-zinc-100 dark:border-zinc-800/50'
              >
                <td className='py-2 pr-4'>
                  <Link
                    href={`/admin/projects/${project.id}`}
                    className='text-blue-600 hover:underline dark:text-blue-400'
                  >
                    {project.name}
                  </Link>
                </td>
                <td className='py-2 pr-4 text-zinc-600 dark:text-zinc-400'>
                  {project.slug}
                </td>
                <td className='py-2 pr-4 text-zinc-600 dark:text-zinc-400'>
                  {project.status}
                </td>
                <td className='py-2 pr-4 text-zinc-600 dark:text-zinc-400'>
                  {project.operatorCount}
                </td>
                <td className='py-2 text-zinc-500 dark:text-zinc-400'>
                  {format(project.createdAt, 'yyyy-MM-dd')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

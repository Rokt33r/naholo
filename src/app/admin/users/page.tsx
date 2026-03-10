import { listAllUsers } from '@/server/services/admin'
import { format } from 'date-fns'

export default async function AdminUsersPage() {
  const users = await listAllUsers()

  return (
    <div className='p-6'>
      <h1 className='text-xl font-semibold text-zinc-900 dark:text-zinc-50'>
        Users
      </h1>
      <div className='mt-4 overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-800 dark:text-zinc-400'>
              <th className='pb-2 pr-4 font-medium'>Name</th>
              <th className='pb-2 pr-4 font-medium'>Identifiers</th>
              <th className='pb-2 pr-4 font-medium'>Admin</th>
              <th className='pb-2 font-medium'>Created</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className='border-b border-zinc-100 dark:border-zinc-800/50'
              >
                <td className='py-2 pr-4 text-zinc-900 dark:text-zinc-100'>
                  {user.name}
                </td>
                <td className='py-2 pr-4 text-zinc-600 dark:text-zinc-400'>
                  {user.identifiers.length > 0
                    ? user.identifiers
                        .map((id) => `${id.type}:${id.value}`)
                        .join(', ')
                    : 'N/A'}
                </td>
                <td className='py-2 pr-4'>
                  {user.isAdmin && (
                    <span className='rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'>
                      Admin
                    </span>
                  )}
                </td>
                <td className='py-2 text-zinc-500 dark:text-zinc-400'>
                  {format(user.createdAt, 'yyyy-MM-dd')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

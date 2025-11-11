import { redirect } from 'next/navigation'
import { getAuthUser } from '@/server/auth/utils'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getAuthUser()

  if (!user) {
    redirect('/sign-in')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      {/* Left Panel - Project Selector + Issues List */}
      <aside className="w-80 border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {/* Project Selector */}
        <div className="flex h-14 items-center border-b border-zinc-200 px-4 dark:border-zinc-800">
          <p className="text-sm text-zinc-500">Project selector will go here</p>
        </div>

        {/* Issues List */}
        <div className="h-[calc(100vh-3.5rem)] overflow-auto">
          <div className="p-4">
            <p className="text-sm text-zinc-500">Issues list will go here</p>
          </div>
        </div>
      </aside>

      {/* Right Panel - Issue Detail */}
      <main className="flex-1 overflow-hidden bg-white dark:bg-zinc-900">
        <div className="h-full">{children}</div>
      </main>
    </div>
  )
}

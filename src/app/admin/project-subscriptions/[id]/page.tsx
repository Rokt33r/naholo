import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { getProjectSubscription } from '@/server/admin/project-subscription'
import { PolarSubscriptionStatusBadge } from '../../_components/polar-subscription-status-badge'

export default async function ProjectSubscriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const sub = await getProjectSubscription(id)
  if (sub == null) {
    notFound()
  }

  return (
    <div className='p-6'>
      <Link
        href='/admin/project-subscriptions'
        className='text-sm text-zinc-500 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100'
      >
        ← Back to list
      </Link>
      <h1 className='mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50'>
        {sub.project.name}
      </h1>

      <dl className='mt-4 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm'>
        <dt className='text-zinc-500 dark:text-zinc-400'>ID</dt>
        <dd className='font-mono text-xs text-zinc-900 dark:text-zinc-100'>
          {sub.id}
        </dd>
        <dt className='text-zinc-500 dark:text-zinc-400'>Created At</dt>
        <dd className='text-zinc-900 dark:text-zinc-100'>
          {format(sub.createdAt, 'yyyy-MM-dd HH:mm:ss')}
        </dd>
        <dt className='text-zinc-500 dark:text-zinc-400'>Updated At</dt>
        <dd className='text-zinc-900 dark:text-zinc-100'>
          {format(sub.updatedAt, 'yyyy-MM-dd HH:mm:ss')}
        </dd>
        <dt className='text-zinc-500 dark:text-zinc-400'>Created By</dt>
        <dd className='text-zinc-900 dark:text-zinc-100'>
          {sub.createdByOperator?.userName ?? '—'}
        </dd>
      </dl>

      <h2 className='mt-6 text-sm font-semibold text-zinc-700 dark:text-zinc-300'>
        Project
      </h2>
      <div className='mt-2 rounded border border-zinc-200 p-3 text-sm dark:border-zinc-800'>
        <Link
          href={`/app/projects/${sub.project.slug}`}
          className='text-zinc-900 hover:underline dark:text-zinc-100'
        >
          {sub.project.name}{' '}
          <span className='text-zinc-500 dark:text-zinc-400'>
            ({sub.project.slug})
          </span>
        </Link>
      </div>

      <h2 className='mt-6 text-sm font-semibold text-zinc-700 dark:text-zinc-300'>
        Polar Subscription
      </h2>
      {sub.polarSubscription != null ? (
        <div className='mt-2 flex items-center gap-3 rounded border border-zinc-200 p-3 text-sm dark:border-zinc-800'>
          <PolarSubscriptionStatusBadge status={sub.polarSubscription.status} />
          <Link
            href={`/admin/polar-subscriptions/${sub.polarSubscription.id}`}
            className='font-mono text-xs text-zinc-900 hover:underline dark:text-zinc-100'
          >
            {sub.polarSubscription.polarSubscriptionId}
          </Link>
        </div>
      ) : (
        <p className='mt-2 text-sm text-zinc-500 dark:text-zinc-400'>
          (no polar subscription)
        </p>
      )}
    </div>
  )
}

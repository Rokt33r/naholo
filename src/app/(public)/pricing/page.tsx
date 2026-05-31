import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pricing — naholo',
}

export default function PricingPage() {
  return (
    <div className='mx-auto w-full max-w-4xl px-6 py-12'>
      <div className='text-center'>
        <h1 className='text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl'>
          Pricing
        </h1>
        <p className='mt-4 text-lg text-zinc-600 dark:text-zinc-400'>
          Simple pricing. No hidden fees.
        </p>
      </div>

      <div className='mx-auto mt-12 max-w-md'>
        <div className='rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900'>
          <h2 className='text-xl font-semibold text-zinc-900 dark:text-zinc-50'>
            Basic
          </h2>
          <p className='mt-2 text-sm text-zinc-500 dark:text-zinc-400'>
            For individuals and small teams.
          </p>

          <div className='mt-6'>
            <span className='text-4xl font-bold text-zinc-900 dark:text-zinc-50'>
              $5
            </span>
            <span className='text-sm text-zinc-500 dark:text-zinc-400'>
              {' '}
              / user / month / project
            </span>
          </div>

          <ul className='mt-8 space-y-3 text-sm text-zinc-600 dark:text-zinc-400'>
            <li className='flex items-start gap-2'>
              <span className='mt-0.5 text-emerald-500'>&#10003;</span>
              Unlimited issues & tasks
            </li>
            <li className='flex items-start gap-2'>
              <span className='mt-0.5 text-emerald-500'>&#10003;</span>
              Unlimited notes & logs
            </li>
            <li className='flex items-start gap-2'>
              <span className='mt-0.5 text-emerald-500'>&#10003;</span>
              Team collaboration
            </li>
            <li className='flex items-start gap-2'>
              <span className='mt-0.5 text-emerald-500'>&#10003;</span>
              1-month free trial (one per user)
            </li>
          </ul>

          <button
            type='button'
            className='mt-8 w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200'
          >
            Start free trial
          </button>
          <p className='mt-3 text-center text-xs text-zinc-400 dark:text-zinc-500'>
            No credit card &middot; 1-month free trial, available once per user
          </p>
        </div>
      </div>
    </div>
  )
}

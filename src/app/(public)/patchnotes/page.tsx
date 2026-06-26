import type { Metadata } from 'next'
import { getAllPatchnotes } from '@/lib/patchnotes'
import { PatchnotesList } from './_components/patchnotes-list'

export const metadata: Metadata = {
  title: 'Patchnotes',
}

export default function PatchnotesPage() {
  const entries = getAllPatchnotes()

  return (
    <div className='mx-auto w-full max-w-3xl px-6 py-12'>
      <h1 className='text-2xl font-bold text-zinc-900 dark:text-zinc-50'>
        Patchnotes
      </h1>
      <p className='mt-2 text-sm text-zinc-500 dark:text-zinc-400'>
        What changed, version by version.
      </p>

      <div className='mt-10'>
        <PatchnotesList entries={entries} />
      </div>
    </div>
  )
}

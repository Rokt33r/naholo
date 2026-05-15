'use client'

import { MarkdownView } from '@/components/ui/markdown-view'

type NotePreviewProps = {
  content: string
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void
}

export function NotePreview({ content, onClick }: NotePreviewProps) {
  return (
    <div
      className='h-full flex-1 cursor-text overflow-y-auto px-4 py-3'
      onClick={onClick}
    >
      {content ? (
        <MarkdownView>{content}</MarkdownView>
      ) : (
        <p className='text-muted-foreground'>No content yet...</p>
      )}
    </div>
  )
}

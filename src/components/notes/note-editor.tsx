'use client'

type NoteEditorProps = {
  content: string
  onContentChange: (value: string) => void
  onClick?: (e: React.MouseEvent<HTMLTextAreaElement>) => void
}

export function NoteEditor({
  content,
  onContentChange,
  onClick,
}: NoteEditorProps) {
  return (
    <textarea
      value={content}
      onChange={(e) => onContentChange(e.target.value)}
      onClick={onClick}
      className='h-full w-full flex-1 resize-none bg-transparent px-4 py-3 font-mono text-sm outline-none'
      placeholder='Write your note content here... (Markdown supported)'
    />
  )
}

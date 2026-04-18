export default function LegalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className='mx-auto w-full max-w-4xl px-6 py-12'>
      <div className='prose dark:prose-invert max-w-none'>{children}</div>
    </div>
  )
}

'use client'

export function CliInstallTab() {
  return (
    <div className='space-y-6'>
      <div>
        <h3 className='text-lg font-semibold'>CLI Installation</h3>
        <p className='text-muted-foreground text-sm'>
          Install the Naholo CLI to manage your projects from the terminal.
        </p>
      </div>

      <div className='space-y-2'>
        <h4 className='text-sm font-medium'>Install via script</h4>
        <pre className='bg-muted rounded-md p-3 text-sm'>
          <code>curl -fsSL https://naholo.app/install.sh | bash</code>
        </pre>
      </div>

      <div className='space-y-2'>
        <h4 className='text-sm font-medium'>Verify</h4>
        <pre className='bg-muted rounded-md p-3 text-sm'>
          <code>naholo --version</code>
        </pre>
      </div>
    </div>
  )
}

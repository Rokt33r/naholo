export class CliError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CliError'
  }
}

export function withErrorHandling(fn: (...args: any[]) => Promise<void>) {
  return async (...args: any[]) => {
    try {
      await fn(...args)
    } catch (error) {
      if (error instanceof CliError) {
        console.error(error.message)
        process.exit(1)
      }
      throw error
    }
  }
}

export class CliError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CliError'
  }
}

export class NoProjectStateCliError extends CliError {
  constructor() {
    super(
      'No .naholo/config.yml found in this directory or any ancestor up to your home directory, and no covert mode entry matches. Run "naholo init" or "naholo covert init" to initialize.',
    )
    this.name = 'NoProjectStateCliError'
  }
}

export class NoInfilledOpCliError extends CliError {
  constructor() {
    super('No infilled operation. Run "naholo agent infil <n>" first.')
    this.name = 'NoInfilledOpCliError'
  }
}

export function withErrorHandling(fn: (...args: any[]) => Promise<void>) {
  return async (...args: any[]) => {
    try {
      await fn(...args)
    } catch (error) {
      if (error instanceof CliError) {
        console.error(error.name + ':' + error.message)
        process.exit(1)
      }
      throw error
    }
  }
}

export class ServiceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ServiceError'
  }
}

export class NotFoundError extends ServiceError {
  readonly resource: string

  constructor(resource: string) {
    super(`${resource} not found`)
    this.name = 'NotFoundError'
    this.resource = resource
  }
}

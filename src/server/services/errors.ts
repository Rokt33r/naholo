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

export class ConflictError extends ServiceError {
  constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
  }
}

export class SubscriptionNotReadyError extends ServiceError {
  constructor(
    message = 'Project subscription is not active. Complete payment setup to add operators.',
  ) {
    super(message)
    this.name = 'SubscriptionNotReadyError'
  }
}

export class SeatLimitExceededError extends ServiceError {
  constructor(
    message = 'Seat limit reached. Open the "Manage subscription" link in your latest Paddle billing email to add more seats.',
  ) {
    super(message)
    this.name = 'SeatLimitExceededError'
  }
}

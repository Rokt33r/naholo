import { NextResponse } from 'next/server'

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
    message = 'Project subscription requires attention from a project admin.',
  ) {
    super(message)
    this.name = 'SubscriptionNotReadyError'
  }
}

export class SeatLimitExceededError extends ServiceError {
  constructor(
    message = 'Seat limit reached. Open "Manage subscription" from the project billing settings to increase your seat count via the Polar customer portal.',
  ) {
    super(message)
    this.name = 'SeatLimitExceededError'
  }
}

export class SubscriptionAlreadyActiveError extends ServiceError {
  constructor(
    message = 'This project already has an active subscription. Refresh the page to see the current billing state.',
  ) {
    super(message)
    this.name = 'SubscriptionAlreadyActiveError'
  }
}

export function mapApiError(error: unknown): NextResponse {
  if (error instanceof SubscriptionNotReadyError) {
    return NextResponse.json(
      { error: 'subscription_not_ready', message: error.message },
      { status: 402 },
    )
  }
  if (error instanceof SeatLimitExceededError) {
    return NextResponse.json(
      { error: 'seat_limit_exceeded', message: error.message },
      { status: 402 },
    )
  }
  if (error instanceof SubscriptionAlreadyActiveError) {
    return NextResponse.json(
      { error: 'subscription_already_active', message: error.message },
      { status: 409 },
    )
  }
  if (error instanceof ConflictError) {
    return NextResponse.json(
      { error: 'conflict', message: error.message },
      { status: 409 },
    )
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json(
      { error: 'not_found', resource: error.resource },
      { status: 404 },
    )
  }
  if (error instanceof Error) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    if (error.message === 'Forbidden') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
  }
  console.error(error)
  return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
}

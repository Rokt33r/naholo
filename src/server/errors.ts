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
  readonly code: string

  constructor(input: { code: string; message: string }) {
    super(input.message)
    this.name = 'ConflictError'
    this.code = input.code
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

// TODO: Instead of declare domain specific error, use general error, UnprocessableRequest and allow to set code(SeatDowngradeBelowUsage) and message. And make the error handler just set statusCode and response body with code and message`{code:string, message:string}`
export class SeatDowngradeBelowUsageError extends ServiceError {
  readonly requestedSeats: number
  readonly usedSeats: number

  constructor(input: { requestedSeats: number; usedSeats: number }) {
    super(
      `Cannot lower seat count to ${input.requestedSeats}; ${input.usedSeats} operators are already active on this project.`,
    )
    this.name = 'SeatDowngradeBelowUsageError'
    this.requestedSeats = input.requestedSeats
    this.usedSeats = input.usedSeats
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
  if (error instanceof SeatDowngradeBelowUsageError) {
    return NextResponse.json(
      {
        error: 'seat_downgrade_below_usage',
        message: error.message,
        requestedSeats: error.requestedSeats,
        usedSeats: error.usedSeats,
      },
      { status: 422 },
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
      { error: 'conflict', code: error.code, message: error.message },
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

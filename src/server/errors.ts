import { NextResponse } from 'next/server'
import type { SubscriptionStatus } from './services/project-subscription'

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

export class SubscriptionInactiveError extends ServiceError {
  readonly status: SubscriptionStatus | 'missing'
  readonly projectSlug: string

  constructor(
    status: SubscriptionStatus | 'missing',
    projectSlug: string,
    message = 'Project subscription is inactive.',
  ) {
    super(message)
    this.name = 'SubscriptionInactiveError'
    this.status = status
    this.projectSlug = projectSlug
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

export function mapApiError(error: unknown): NextResponse {
  if (error instanceof SubscriptionInactiveError) {
    return NextResponse.json(
      {
        error: 'subscription_inactive',
        status: error.status,
        projectSlug: error.projectSlug,
      },
      { status: 402 },
    )
  }
  if (error instanceof SeatLimitExceededError) {
    return NextResponse.json(
      { error: 'seat_limit_exceeded', message: error.message },
      { status: 402 },
    )
  }
  if (error instanceof SubscriptionNotReadyError) {
    return NextResponse.json(
      { error: 'subscription_not_ready', message: error.message },
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

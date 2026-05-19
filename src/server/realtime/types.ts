export type RealtimeEventType =
  | 'operation-updated'
  | 'operation-deleted'
  | 'objectives-changed'
  | 'logs-changed'
  | 'notes-changed'
  | 'operations-list-changed'
  | 'project-subscription-changed'

export interface RealtimeEvent {
  type: RealtimeEventType
  sourceClientId?: string
}

export interface Subscription {
  unsubscribe(): void
}

export interface RealtimeBroker {
  publish(channel: string, event: RealtimeEvent): Promise<void>
  subscribe(
    channel: string,
    callback: (event: RealtimeEvent) => void,
  ): Subscription
}

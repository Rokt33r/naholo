import { Client, type Notification } from 'pg'
import { sql } from 'drizzle-orm'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

type AnyDatabase = NodePgDatabase<any>
import type { RealtimeBroker, RealtimeEvent, Subscription } from './types'

interface PgDatabaseConfig {
  host: string
  port: number
  name: string
  user: string
  password: string
  ssl: string
}

export class PgRealtimeBroker implements RealtimeBroker {
  private client: Client | null = null
  private connecting = false
  private listeners = new Map<string, Set<(event: RealtimeEvent) => void>>()
  private listenerConfig: PgDatabaseConfig
  private publishPool: AnyDatabase

  constructor(listenerConfig: PgDatabaseConfig, publishPool: AnyDatabase) {
    this.listenerConfig = listenerConfig
    this.publishPool = publishPool
  }

  async publish(channel: string, event: RealtimeEvent): Promise<void> {
    const payload = JSON.stringify(event)
    await this.publishPool.execute(
      sql`SELECT pg_notify(${channel}, ${payload})`,
    )
  }

  subscribe(
    channel: string,
    callback: (event: RealtimeEvent) => void,
  ): Subscription {
    let callbacks = this.listeners.get(channel)
    if (callbacks == null) {
      callbacks = new Set()
      this.listeners.set(channel, callbacks)
    }
    callbacks.add(callback)

    // Start listening on this channel
    this.ensureConnected().then(() => {
      if (this.client != null) {
        this.client.query(`LISTEN "${channel}"`).catch((error: unknown) => {
          console.error(
            `[realtime] Failed to LISTEN on channel "${channel}":`,
            error,
          )
        })
      }
    })

    return {
      unsubscribe: () => {
        callbacks.delete(callback)
        if (callbacks.size === 0) {
          this.listeners.delete(channel)
          if (this.client != null) {
            this.client
              .query(`UNLISTEN "${channel}"`)
              .catch((error: unknown) => {
                console.error(
                  `[realtime] Failed to UNLISTEN channel "${channel}":`,
                  error,
                )
              })
          }
          // If no more listeners at all, disconnect
          if (this.listeners.size === 0) {
            this.disconnect()
          }
        }
      },
    }
  }

  private async ensureConnected(): Promise<void> {
    if (this.client != null || this.connecting) {
      return
    }
    this.connecting = true
    try {
      const usingSsl = this.listenerConfig.ssl === 'true'
      const client = new Client({
        host: this.listenerConfig.host,
        port: this.listenerConfig.port,
        database: this.listenerConfig.name,
        user: this.listenerConfig.user,
        password: this.listenerConfig.password,
        ssl: usingSsl
          ? {
              rejectUnauthorized: true,
              ca: readFileSync(
                join(process.cwd(), 'certs', 'rds-ca-bundle.pem'),
              ),
            }
          : false,
      })
      client.on('notification', (msg: Notification) => {
        if (msg.channel == null || msg.payload == null) {
          return
        }
        const callbacks = this.listeners.get(msg.channel)
        if (callbacks == null) {
          return
        }
        try {
          const event: RealtimeEvent = JSON.parse(msg.payload)
          for (const cb of callbacks) {
            cb(event)
          }
        } catch (error) {
          console.error(
            '[realtime] Failed to parse notification payload:',
            error,
          )
        }
      })
      client.on('error', (error: Error) => {
        console.error('[realtime] Listener connection error:', error)
        this.client = null
        this.reconnect()
      })
      await client.connect()
      this.client = client

      // Re-subscribe to all active channels
      for (const channel of this.listeners.keys()) {
        await client.query(`LISTEN "${channel}"`)
      }
    } catch (error) {
      console.error('[realtime] Failed to connect listener:', error)
      this.reconnect()
    } finally {
      this.connecting = false
    }
  }

  private reconnect(): void {
    if (this.listeners.size === 0) {
      return
    }
    // Retry after 5 seconds
    setTimeout(() => {
      this.ensureConnected()
    }, 5000)
  }

  private disconnect(): void {
    if (this.client != null) {
      this.client.end().catch((error: unknown) => {
        console.error('[realtime] Error disconnecting listener:', error)
      })
      this.client = null
    }
  }
}

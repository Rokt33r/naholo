import { config } from '../config'
import { db } from '../db'
import { PgRealtimeBroker } from './pg-broker'
import type { RealtimeBroker } from './types'

export const realtimeBroker: RealtimeBroker = new PgRealtimeBroker(
  config.database,
  db,
)

export type { RealtimeBroker, RealtimeEvent, Subscription } from './types'

import { KenmonAuthService } from 'kenmon'
import { KenmonNextJSAdapter } from '@kenmon/nextjs-adapter'
import { db } from '@/db'
import { config } from '@/server/config'
import { DrizzleStorage } from './storage'

export const auth = new KenmonAuthService({
  secret: config.sessionSecret,
  session: {
    ttl: 60 * 60 * 24 * 7, // 7 days
    cookieName: 'naholo_session',
    secure: config.isProduction,
    sameSite: 'lax',
  },
  adapter: new KenmonNextJSAdapter(),
  storage: new DrizzleStorage(db),
})

import { KenmonAuthService } from 'kenmon'
import { KenmonEmailOTPProvider } from '@kenmon/email-otp-provider'
import { KenmonNextJSAdapter } from '@kenmon/nextjs-adapter'
import { db } from '@/db'
import { config } from '@/server/config'
import { DrizzleStorage, DrizzleEmailOTPStorage } from './storage'
import { MockMailer } from './mailer'

export const auth = new KenmonAuthService({
  secret: config.sessionSecret,
  session: {
    ttl: 60 * 60 * 24 * 7, // 7 days
    cookieName: 'bocchi_session',
    secure: config.isProduction,
    sameSite: 'lax',
  },
  adapter: new KenmonNextJSAdapter(),
  storage: new DrizzleStorage(db),
})

auth.registerProvider(
  new KenmonEmailOTPProvider({
    mailer: new MockMailer(),
    otpStorage: new DrizzleEmailOTPStorage(db),
    otpTtl: 300, // 5 minutes
    otpLength: 6,
    emailFrom: 'noreply@bocchi.dev',
  }),
)

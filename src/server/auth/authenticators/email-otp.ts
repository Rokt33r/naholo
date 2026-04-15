import { KenmonEmailOTPAuthenticator } from '@kenmon/email-otp-authenticator'
import { DrizzleEmailOTPStorage } from '../storage'
import { AppKenmonMailer } from '../mailer'
import { db } from '../../db'

export const emailOTPAuthenticator = new KenmonEmailOTPAuthenticator({
  mailer: new AppKenmonMailer(),
  otpStorage: new DrizzleEmailOTPStorage(db),
  otpTtl: 300,
  otpLength: 6,
  emailFrom: 'noreply@kenmon.dev',
})

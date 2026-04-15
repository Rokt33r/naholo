import { KenmonMailer, KenmonSendEmailParams } from 'kenmon'
import { sendEmail } from '../services/mailer'

export class AppKenmonMailer extends KenmonMailer {
  async sendEmail(params: KenmonSendEmailParams): Promise<void> {
    await sendEmail({
      to: params.to,
      subject: params.subject,
      textContent: params.textContent,
      htmlContent: params.htmlContent,
    })
  }
}

import { KenmonMailer, KenmonSendEmailParams } from 'kenmon'

export class MockMailer extends KenmonMailer {
  async sendEmail(params: KenmonSendEmailParams): Promise<void> {
    console.log('='.repeat(60))
    console.log('📧 Mock Email Sent')
    console.log('='.repeat(60))
    console.log(`From: ${params.from}`)
    console.log(`To: ${Array.isArray(params.to) ? params.to.join(', ') : params.to}`)
    console.log(`Subject: ${params.subject}`)
    console.log('-'.repeat(60))

    if (params.textContent) {
      console.log('Text Content:')
      console.log(params.textContent)
    }

    if (params.htmlContent) {
      console.log('-'.repeat(60))
      console.log('HTML Content:')
      console.log(params.htmlContent)
    }

    console.log('='.repeat(60))
  }
}

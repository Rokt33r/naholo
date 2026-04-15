import 'server-only'
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'
import { config } from '../config'

type SendEmailParams = {
  to: string | string[]
  subject: string
  textContent?: string
  htmlContent?: string
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  if (config.isProduction) {
    await sendViaSES(params)
  } else {
    logEmail(params)
  }
}

// --- SES ---

const sesClient = new SESClient({
  region: config.aws.region,
})

async function sendViaSES(params: SendEmailParams): Promise<void> {
  const toAddresses = Array.isArray(params.to) ? params.to : [params.to]

  const command = new SendEmailCommand({
    Source: config.aws.sesFromEmail,
    Destination: {
      ToAddresses: toAddresses,
    },
    Message: {
      Subject: {
        Data: params.subject,
        Charset: 'UTF-8',
      },
      Body: {
        Text: params.textContent
          ? {
              Data: params.textContent,
              Charset: 'UTF-8',
            }
          : undefined,
        Html: params.htmlContent
          ? {
              Data: params.htmlContent,
              Charset: 'UTF-8',
            }
          : undefined,
      },
    },
  })

  const response = await sesClient.send(command)
  console.log(
    `Email sent successfully to ${toAddresses.join(', ')} (MessageId: ${response.MessageId})`,
  )
}

// --- Mock (development) ---

function logEmail(params: SendEmailParams): void {
  const to = Array.isArray(params.to) ? params.to.join(', ') : params.to
  console.log('='.repeat(60))
  console.log('Mock Email Sent')
  console.log('='.repeat(60))
  console.log(`From: ${config.aws.sesFromEmail}`)
  console.log(`To: ${to}`)
  console.log(`Subject: ${params.subject}`)
  console.log('-'.repeat(60))

  if (params.textContent != null) {
    console.log('Text Content:')
    console.log(params.textContent)
  }

  if (params.htmlContent != null) {
    console.log('-'.repeat(60))
    console.log('HTML Content:')
    console.log(params.htmlContent)
  }

  console.log('='.repeat(60))
}

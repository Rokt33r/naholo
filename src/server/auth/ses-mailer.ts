import { KenmonMailer, KenmonSendEmailParams } from 'kenmon'
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'
import { config } from '../config'

/**
 * AWS SES Mailer implementation for production email sending
 * Uses IAM role authentication (no access keys needed when running on ECS)
 *
 * Required environment variables:
 * - AWS_REGION: AWS region (default: ap-northeast-1)
 * - AWS_SES_FROM_EMAIL: Verified sender email address in SES
 *
 * AWS credentials are automatically loaded from:
 * - ECS task role (when running on ECS) - RECOMMENDED
 * - Environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY (local dev)
 * - AWS credentials file (~/.aws/credentials)
 */
export class SESMailer extends KenmonMailer {
  private sesClient: SESClient
  private fromEmail: string

  constructor() {
    super()

    this.fromEmail = config.aws.sesFromEmail

    this.sesClient = new SESClient({
      region: config.aws.region,
      // When running on ECS, credentials are automatically loaded from the task role
      // For local development, use AWS credentials file or environment variables
    })

    console.log(
      `SES Mailer initialized (region: ${config.aws.region}, from: ${this.fromEmail})`,
    )
  }

  async sendEmail(params: KenmonSendEmailParams): Promise<void> {
    try {
      const toAddresses = Array.isArray(params.to) ? params.to : [params.to]

      const command = new SendEmailCommand({
        Source: this.fromEmail,
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

      const response = await this.sesClient.send(command)
      console.log(
        `Email sent successfully to ${toAddresses.join(', ')} (MessageId: ${response.MessageId})`,
      )
    } catch (error) {
      console.error('Failed to send email via SES:', error)
      throw new Error(
        `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }
}

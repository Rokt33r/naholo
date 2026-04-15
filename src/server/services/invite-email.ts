import 'server-only'
import { sendEmail } from './mailer'

export async function sendInviteEmail(
  email: string,
  inviteUrl: string,
  projectName: string,
  inviterName: string,
): Promise<void> {
  await sendEmail({
    to: email,
    subject: `You've been invited to join "${projectName}" on Naholo`,
    textContent: [
      `${inviterName} has invited you to join the project "${projectName}" on Naholo.`,
      '',
      'Click the link below to view the invitation:',
      inviteUrl,
      '',
      "If you don't have an account yet, you'll need to sign up first.",
    ].join('\n'),
  })
}

export async function sendInviteAcceptedEmail(
  email: string,
  projectName: string,
): Promise<void> {
  await sendEmail({
    to: email,
    subject: `You've been added to "${projectName}" on Naholo`,
    textContent: [
      `Your request to join "${projectName}" has been accepted.`,
      '',
      'You can now access the project on Naholo.',
    ].join('\n'),
  })
}

export async function sendInviteClaimedEmail(
  adminEmails: string[],
  claimerName: string,
  claimerIdentifiers: { type: string; value: string }[],
  projectName: string,
): Promise<void> {
  if (adminEmails.length === 0) {
    return
  }

  const identifierLines = claimerIdentifiers
    .map((i) => `  - ${i.type}: ${i.value}`)
    .join('\n')

  await sendEmail({
    to: adminEmails,
    subject: `${claimerName} wants to join "${projectName}" on Naholo`,
    textContent: [
      `${claimerName} has requested to join "${projectName}".`,
      '',
      'Their identifiers:',
      identifierLines,
      '',
      'Please review this request in the project settings.',
    ].join('\n'),
  })
}

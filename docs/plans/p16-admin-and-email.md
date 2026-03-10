# P16: Admin & Email

## Goal

Add an admin system for user management and a per-user email feature powered by AWS SES (sending) and AWS SES + S3 + Lambda (receiving). Admin can assign a `@naholo.app` email address to users; those users can then view received emails and compose new ones.

## Stages

| Stage | Plan                                                                       | Summary                                                                     |
| ----- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1     | [p16-s1-admin-role-and-pages.md](p16-s1-admin-role-and-pages.md)           | Add `role` to users, promotion script, admin layout guard, users table page |
| 2     | [p16-s2-email-schema.md](p16-s2-email-schema.md)                           | `naholo_emails`, `naholo_received_emails`, `naholo_sent_emails` tables      |
| 3     | [p16-s3-ses-receiving-pipeline.md](p16-s3-ses-receiving-pipeline.md)       | SES receipt rule → S3 → Lambda → internal webhook API                       |
| 4     | [p16-s4-email-service-and-sending.md](p16-s4-email-service-and-sending.md) | Service layer for reading/sending emails, API routes                        |
| 5     | [p16-s5-email-ui.md](p16-s5-email-ui.md)                                   | Two-panel layout under `/app/email` with list, detail, compose              |
| 6     | [p16-s6-admin-email-assignment-ui.md](p16-s6-admin-email-assignment-ui.md) | Dialog to assign `keyword@naholo.app`, React Query hooks                    |

## AWS Infrastructure Required

| Resource                            | Purpose                                               |
| ----------------------------------- | ----------------------------------------------------- |
| SES domain identity (`naholo.app`)  | Send + receive emails                                 |
| SES receipt rule set                | Route incoming email                                  |
| S3 bucket (`naholo-emails-inbound`) | Store raw emails                                      |
| Lambda (`naholo-email-processor`)   | Parse + forward to API                                |
| IAM roles                           | Lambda → S3 read, SES → S3 write, SES → Lambda invoke |
| MX DNS record                       | `10 inbound-smtp.<region>.amazonaws.com`              |

## Out of Scope

- Email attachments (store in S3, link in UI — future)
- Rich text / markdown compose editor — plain text only for now
- Email threading / conversation view
- Email forwarding rules
- Spam filtering (rely on SES built-in)
- Multiple emails per user
- Mobile-optimized email UI

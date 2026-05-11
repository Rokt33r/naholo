import 'server-only'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import type { StorageAdapter } from './index'

export function createS3StorageAdapter(options: {
  bucket: string
  prefix?: string
  region?: string
}): StorageAdapter {
  const client =
    options.region == null
      ? new S3Client({})
      : new S3Client({ region: options.region })

  const normalizedPrefix =
    options.prefix == null || options.prefix.length === 0
      ? ''
      : `${options.prefix.replace(/\/+$/, '')}/`

  return {
    async putObject(key, body) {
      await client.send(
        new PutObjectCommand({
          Bucket: options.bucket,
          Key: `${normalizedPrefix}${key}`,
          Body: body,
        }),
      )
    },
  }
}

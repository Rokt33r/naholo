import 'server-only'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import type { FileStorageAdapter } from './index'

export function createS3FileStorageAdapter(options: {
  bucket: string
  region?: string
}): FileStorageAdapter {
  const client =
    options.region == null
      ? new S3Client({})
      : new S3Client({ region: options.region })

  return {
    async putObject(key, body) {
      await client.send(
        new PutObjectCommand({
          Bucket: options.bucket,
          Key: key,
          Body: body,
        }),
      )
    },
  }
}

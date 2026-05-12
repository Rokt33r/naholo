import 'server-only'
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
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
    async getObject(key) {
      const response = await client.send(
        new GetObjectCommand({
          Bucket: options.bucket,
          Key: key,
        }),
      )
      if (response.Body == null) {
        throw new Error(`S3 object not found or empty: ${key}`)
      }
      return await response.Body.transformToString('utf-8')
    },
  }
}

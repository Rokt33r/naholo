import 'server-only'
import { createFsStorageAdapter } from './fs-driver'
import { createS3StorageAdapter } from './s3-driver'

export interface StorageAdapter {
  putObject(key: string, body: Buffer | string): Promise<void>
}

let cached: StorageAdapter | null = null

export function getStorageAdapter(): StorageAdapter {
  if (cached != null) {
    return cached
  }
  cached = buildStorageAdapter()
  return cached
}

function buildStorageAdapter(): StorageAdapter {
  const driver = process.env.NAHOLO_STORAGE_DRIVER ?? 'fs'

  if (driver === 'fs') {
    const root = process.env.NAHOLO_STORAGE_FS_ROOT
    return createFsStorageAdapter({
      root: root == null || root.length === 0 ? '.storage' : root,
    })
  }

  if (driver === 's3') {
    const bucket = process.env.NAHOLO_STORAGE_S3_BUCKET
    if (bucket == null || bucket.length === 0) {
      throw new Error(
        'NAHOLO_STORAGE_S3_BUCKET must be set when NAHOLO_STORAGE_DRIVER=s3',
      )
    }
    return createS3StorageAdapter({
      bucket,
      prefix: process.env.NAHOLO_STORAGE_S3_PREFIX,
      region: process.env.AWS_REGION,
    })
  }

  throw new Error(
    `Unknown NAHOLO_STORAGE_DRIVER: ${driver} (expected 'fs' or 's3')`,
  )
}

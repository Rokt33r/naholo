import 'server-only'
import { config } from '../config'
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
  const fileStorage = config.fileStorage

  if (fileStorage.driver === 'fs') {
    return createFsStorageAdapter({ root: fileStorage.fsRoot })
  }

  return createS3StorageAdapter({
    bucket: fileStorage.s3Bucket,
    region: config.aws.region,
  })
}

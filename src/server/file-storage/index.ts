import 'server-only'
import { config } from '../config'
import { createFsFileStorageAdapter } from './fs-driver'
import { createS3FileStorageAdapter } from './s3-driver'

export interface FileStorageAdapter {
  putObject(key: string, body: Buffer | string): Promise<void>
  getObject(key: string): Promise<string>
}

let cached: FileStorageAdapter | null = null

export function getFileStorageAdapter(): FileStorageAdapter {
  if (cached != null) {
    return cached
  }
  cached = buildFileStorageAdapter()
  return cached
}

function buildFileStorageAdapter(): FileStorageAdapter {
  const fileStorage = config.fileStorage

  if (fileStorage.driver === 'fs') {
    return createFsFileStorageAdapter({ root: fileStorage.fsRoot })
  }

  return createS3FileStorageAdapter({
    bucket: fileStorage.s3Bucket,
    region: config.aws.region,
  })
}

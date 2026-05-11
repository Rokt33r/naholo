import 'server-only'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { StorageAdapter } from './index'

export function createFsStorageAdapter(options: {
  root: string
}): StorageAdapter {
  const root = path.resolve(options.root)

  return {
    async putObject(key, body) {
      const fullPath = path.join(root, key)
      await fs.mkdir(path.dirname(fullPath), { recursive: true })
      await fs.writeFile(fullPath, body)
    },
  }
}

import 'server-only'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { FileStorageAdapter } from './index'

export function createFsFileStorageAdapter(options: {
  root: string
}): FileStorageAdapter {
  const root = path.resolve(options.root)

  return {
    async putObject(key, body) {
      const fullPath = path.join(root, key)
      await fs.mkdir(path.dirname(fullPath), { recursive: true })
      await fs.writeFile(fullPath, body)
    },
    async getObject(key) {
      const fullPath = path.join(root, key)
      return await fs.readFile(fullPath, 'utf-8')
    },
    async deleteObject(key) {
      const fullPath = path.join(root, key)
      try {
        await fs.unlink(fullPath)
      } catch (error) {
        if (
          error instanceof Error &&
          'code' in error &&
          (error as NodeJS.ErrnoException).code === 'ENOENT'
        ) {
          return
        }
        throw error
      }
    },
  }
}

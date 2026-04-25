import path from 'node:path'
import {
  getCovertOpsDir,
  readCovertOpsProjectConfig,
} from '../covert-config.js'

export function getOperationsRootDir(): string {
  const covertEntry = readCovertOpsProjectConfig(process.cwd())
  if (covertEntry != null) {
    return path.join(getCovertOpsDir(), covertEntry.codeName, 'operations')
  }
  return path.resolve('.naholo/local/operations')
}

export function getLocalOperationDir(operationNumber: number | string): string {
  return path.join(getOperationsRootDir(), String(operationNumber))
}

export function getBaseDir(operationNumber: number | string): string {
  return path.join(getLocalOperationDir(operationNumber), '.base')
}

export function getNotesDir(operationNumber: number | string): string {
  return path.join(getLocalOperationDir(operationNumber), 'notes')
}

export function getBaseNotesDir(operationNumber: number | string): string {
  return path.join(getBaseDir(operationNumber), 'notes')
}

export function getObjectivesPath(operationNumber: number | string): string {
  return path.join(getLocalOperationDir(operationNumber), 'OBJECTIVES.md')
}

export function getBaseObjectivesPath(
  operationNumber: number | string,
): string {
  return path.join(getBaseDir(operationNumber), 'OBJECTIVES.md')
}

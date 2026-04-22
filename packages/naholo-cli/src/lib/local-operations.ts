import path from 'node:path'

const NAHOLO_LOCAL_DIR = '.naholo/local/operations'

export function getLocalOperationDir(operationNumber: number | string): string {
  return path.resolve(NAHOLO_LOCAL_DIR, String(operationNumber))
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

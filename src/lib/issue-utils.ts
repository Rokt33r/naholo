export function generateLogPreview(content: string): string {
  return content.trim().slice(0, 100)
}

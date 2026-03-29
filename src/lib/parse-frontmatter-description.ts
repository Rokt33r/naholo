export function parseFrontmatterDescription(content: string): string | null {
  if (!content.startsWith('---\n')) {
    return null
  }

  const endIndex = content.indexOf('\n---\n', 4)
  if (endIndex === -1) {
    return null
  }

  const frontmatter = content.slice(4, endIndex)
  const match = frontmatter.match(/^description:\s*(.+)$/m)
  if (!match) {
    return null
  }

  return match[1].trim() || null
}

export function extractHeadingBody(source: string, heading: string): string {
  const prefixMatch = heading.match(/^(#+) /)
  if (prefixMatch == null) {
    throw new Error(
      `extractHeadingBody: heading "${heading}" must start with one or more "#" followed by a space`,
    )
  }
  const stopPrefix = `${prefixMatch[1]} `
  const lines = source.split('\n')
  const startIndex = lines.findIndex((line) => line.trim() === heading)
  if (startIndex < 0) {
    return ''
  }
  let endIndex = lines.length
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    if (lines[i].startsWith(stopPrefix)) {
      endIndex = i
      break
    }
  }
  return lines
    .slice(startIndex + 1, endIndex)
    .join('\n')
    .replace(/^\n+/, '')
    .replace(/\n+$/, '')
}

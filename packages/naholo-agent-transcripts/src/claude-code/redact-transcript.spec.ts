import { describe, it, expect } from 'vitest'

import { redactTranscript } from './redact-transcript'

describe('redactTranscript', () => {
  it('preserves keep-list strings verbatim and redacts text content', () => {
    const input = JSON.stringify({
      type: 'assistant',
      timestamp: '2026-06-15T15:34:58.678Z',
      userType: 'external',
      entrypoint: 'claude-vscode',
      attributionSkill: 'splash',
      message: {
        role: 'assistant',
        model: 'claude-opus-4-7',
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'hello world' }],
      },
    })
    const parsed = JSON.parse(redactTranscript(input))
    expect(parsed.type).toBe('assistant')
    expect(parsed.timestamp).toBe('2026-06-15T15:34:58.678Z')
    expect(parsed.userType).toBe('external')
    expect(parsed.entrypoint).toBe('claude-vscode')
    expect(parsed.attributionSkill).toBe('splash')
    expect(parsed.message.role).toBe('assistant')
    expect(parsed.message.model).toBe('claude-opus-4-7')
    expect(parsed.message.stop_reason).toBe('end_turn')
    expect(parsed.message.content[0].type).toBe('text')
    expect(parsed.message.content[0].text).toBe('_redacted_')
  })

  it('preserves tool name in tool_use blocks while redacting input', () => {
    const input = JSON.stringify({
      type: 'assistant',
      message: {
        content: [
          {
            type: 'tool_use',
            id: 'toolu_01ABC',
            name: 'Bash',
            input: { command: 'rm -rf /', timeout: 5000 },
          },
        ],
      },
    })
    const parsed = JSON.parse(redactTranscript(input))
    const block = parsed.message.content[0]
    expect(block.type).toBe('tool_use')
    expect(block.name).toBe('Bash')
    expect(block.input.command).toBe('_redacted_')
    expect(block.input.timeout).toBe(5000)
  })

  it('replaces identifier-shaped strings with stable opaque labels within one transcript', () => {
    const uuid1 = '019ecbeb-f374-7788-9b44-0a6469952f60'
    const uuid2 = '019ecbec-e38d-74da-8a92-c36dd68bb42e'
    const lines = [
      JSON.stringify({
        type: 'user',
        uuid: uuid1,
        parentUuid: null,
        sessionId: uuid2,
      }),
      JSON.stringify({
        type: 'assistant',
        uuid: uuid2,
        parentUuid: uuid1,
        sessionId: uuid2,
      }),
    ].join('\n')
    const out = redactTranscript(lines).split('\n')
    const r0 = JSON.parse(out[0])
    const r1 = JSON.parse(out[1])

    expect(r0.uuid).toBe('_uuid_1_')
    expect(r0.parentUuid).toBe(null)
    expect(r0.sessionId).toBe('_uuid_2_')

    expect(r1.uuid).toBe('_uuid_2_')
    expect(r1.parentUuid).toBe('_uuid_1_')
    expect(r1.sessionId).toBe('_uuid_2_')
  })

  it('recognizes msg_* and toolu_* identifier shapes with one shared counter', () => {
    const input = JSON.stringify({
      message: {
        id: 'msg_01XYZ',
        content: [
          { type: 'tool_use', id: 'toolu_01ABC', name: 'Bash' },
          { type: 'tool_result', tool_use_id: 'toolu_01ABC' },
        ],
      },
    })
    const parsed = JSON.parse(redactTranscript(input))
    expect(parsed.message.id).toBe('_uuid_1_')
    expect(parsed.message.content[0].id).toBe('_uuid_2_')
    expect(parsed.message.content[1].tool_use_id).toBe('_uuid_2_')
  })

  it('resets the id map between separate calls', () => {
    const uuid = '019ecbeb-f374-7788-9b44-0a6469952f60'
    const line = JSON.stringify({ uuid })
    const a = JSON.parse(redactTranscript(line))
    const b = JSON.parse(redactTranscript(line))
    expect(a.uuid).toBe('_uuid_1_')
    expect(b.uuid).toBe('_uuid_1_')
  })

  it('recurses into nested tool_result content and toolUseResult', () => {
    const input = JSON.stringify({
      type: 'user',
      message: {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'toolu_01ABC',
            content: [{ type: 'text', text: 'large stdout dump' }],
          },
        ],
      },
      toolUseResult: {
        stdout: 'huge output',
        stderr: '',
        filePath: '/some/path',
        is_error: false,
      },
    })
    const parsed = JSON.parse(redactTranscript(input))
    const block = parsed.message.content[0]
    expect(block.type).toBe('tool_result')
    expect(block.tool_use_id).toBe('_uuid_1_')
    expect(block.content[0].type).toBe('text')
    expect(block.content[0].text).toBe('_redacted_')
    expect(parsed.toolUseResult.stdout).toBe('_redacted_')
    expect(parsed.toolUseResult.stderr).toBe('')
    expect(parsed.toolUseResult.filePath).toBe('_redacted_')
    expect(parsed.toolUseResult.is_error).toBe(false)
  })

  it('redacts unknown free-form string fields the old allowlist would have leaked', () => {
    const input = JSON.stringify({
      type: 'user',
      surpriseField: 'this used to pass through unchanged',
      cwd: '/Users/me/secret-project',
      aiTitle: 'a title with private context',
      gitBranch: 'feature/secret',
      summary: 'private',
    })
    const parsed = JSON.parse(redactTranscript(input))
    expect(parsed.type).toBe('user')
    expect(parsed.surpriseField).toBe('_redacted_')
    expect(parsed.cwd).toBe('_redacted_')
    expect(parsed.aiTitle).toBe('_redacted_')
    expect(parsed.gitBranch).toBe('_redacted_')
    expect(parsed.summary).toBe('_redacted_')
  })

  it('marks invalid JSON lines with a pruneError and continues', () => {
    const input = 'not valid json\n' + JSON.stringify({ type: 'user' })
    const out = redactTranscript(input).split('\n')
    expect(JSON.parse(out[0])).toEqual({ pruneError: 'invalid_json' })
    expect(JSON.parse(out[1]).type).toBe('user')
  })

  it('marks non-object top-level values with a pruneError', () => {
    const out = redactTranscript(JSON.stringify('just a string'))
    expect(JSON.parse(out)).toEqual({ pruneError: 'non_object' })
  })

  it('preserves the trailing newline when input has one', () => {
    expect(redactTranscript('')).toBe('')
    const withNl = redactTranscript(JSON.stringify({ type: 'user' }) + '\n')
    expect(withNl.endsWith('\n')).toBe(true)
  })
})

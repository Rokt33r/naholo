import { ClaudeCodeTranscriptParser } from './parser'
import { mapUserEntry } from './user-entry'
import { mapAssistantEntry } from './assistant-entry'
import { mapSummaryEntry } from './summary-entry'
import { mapAiTitleEntry } from './ai-title-entry'
import { mapAttachmentEntry } from './attachment-entry'
import { mapFileHistorySnapshotEntry } from './file-history-snapshot-entry'
import { mapLastPromptEntry } from './last-prompt-entry'
import { mapQueueOperationEntry } from './queue-operation-entry'
import { mapSystemEntry } from './system-entry'

export function getDefaultParser(): ClaudeCodeTranscriptParser {
  return new ClaudeCodeTranscriptParser({
    mappers: {
      user: mapUserEntry,
      assistant: mapAssistantEntry,
      summary: mapSummaryEntry,
      'ai-title': mapAiTitleEntry,
      attachment: mapAttachmentEntry,
      'file-history-snapshot': mapFileHistorySnapshotEntry,
      'last-prompt': mapLastPromptEntry,
      'queue-operation': mapQueueOperationEntry,
      system: mapSystemEntry,
    },
  })
}

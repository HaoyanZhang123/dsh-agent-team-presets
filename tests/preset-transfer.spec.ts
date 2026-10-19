/**
 * The fixed Team preset transfer format: which fields a shared document
 * carries, which documents are refused, and which names collide on import.
 */

import { describe, expect, it } from 'vitest'
import {
  MAX_TRANSFER_CHARS,
  MAX_TRANSFER_MEMBERS,
  METADATA_LIMITS,
  metadataChars,
  TEAM_PRESET_FORMAT,
  TEAM_PRESET_FORMAT_VERSION,
  applySharedFields,
  captainFromTransfer,
  exportTeamPreset,
  importConflicts,
  memberFromTransfer,
  parseTeamPresetText,
  parseTeamPresetValue,
  serializeTeamPreset,
  slotNameKey,
  teamFromTransfer,
  uniqueName,
} from '../src/preset-transfer.ts'
import type { TeamPresetTransfer } from '../src/preset-transfer.ts'
import type { TeamPreset, TeamSlotPreset } from '../src/types.ts'

/** One configured captain carrying every field the format does not share. */
const CAPTAIN: TeamSlotPreset = {
  name: 'team-lead',
  color: '#4c8dff',
  description: 'Keeps the queue moving',
  toolMode: 'custom',
  tools: ['read'],
  systemPrompt: 'You lead.',
}

/** One configured Team carrying a member with a route and a tool policy. */
const TEAM: TeamPreset = {
  id: 'team-1',
  name: 'Review team',
  description: 'Reviews changes before they land',
  captain: CAPTAIN,
  members: [{
    name: 'reviewer',
    color: '#2fbf71',
    description: 'checks diffs',
    toolMode: 'custom',
    tools: ['read', 'bash'],
    systemPrompt: 'You review one diff at a time.',
    provider: 'deepseek',
    model: 'deepseek-chat',
    reasoningEffort: 'high',
  }],
}

/** The document this plugin writes for {@link TEAM}. */
const DOCUMENT: TeamPresetTransfer = {
  format: TEAM_PRESET_FORMAT,
  version: TEAM_PRESET_FORMAT_VERSION,
  team: {
    name: 'Review team',
    description: 'Reviews changes before they land',
    captain: {
      name: 'team-lead',
      description: 'Keeps the queue moving',
      systemPrompt: 'You lead.',
      color: '#4c8dff',
    },
    members: [{
      name: 'reviewer',
      description: 'checks diffs',
      systemPrompt: 'You review one diff at a time.',
      color: '#2fbf71',
    }],
  },
}

/**
 * Clone the reference document with one replacement applied.
 * @param patch - fields of the document to replace.
 * @returns a detached document a test may refuse.
 */
function document(patch: Partial<TeamPresetTransfer['team']> = {}): TeamPresetTransfer {
  return { ...DOCUMENT, team: { ...DOCUMENT.team, ...patch } }
}

describe('the shared Team document', () => {
  it('carries names, descriptions, prompts, and colors — and nothing else', () => {
    // Every route and tool field is absent: a shared document cannot promise a
    // provider, a model, or a tool this deployment may not have.
    expect(exportTeamPreset(TEAM)).toEqual(DOCUMENT)
  })

  it('round-trips through the serialized text', () => {
    const parsed = parseTeamPresetText(serializeTeamPreset(TEAM))
    expect(parsed).toEqual({ ok: true, transfer: DOCUMENT })
    expect(serializeTeamPreset(TEAM).endsWith('\n')).toBe(true)
  })

  it('refuses text that is not JSON', () => {
    expect(parseTeamPresetText('{ not json')).toEqual({ ok: false, reason: 'invalid-json' })
  })

  it('refuses a document written by another format', () => {
    expect(parseTeamPresetValue({ ...DOCUMENT, format: 'other' })).toEqual({ ok: false, reason: 'invalid-format' })
    expect(parseTeamPresetValue(null)).toEqual({ ok: false, reason: 'invalid-format' })
    expect(parseTeamPresetValue([])).toEqual({ ok: false, reason: 'invalid-format' })
    expect(parseTeamPresetValue({ ...DOCUMENT, team: { ...DOCUMENT.team, members: 'none' } }))
      .toEqual({ ok: false, reason: 'invalid-format' })
  })

  it('refuses a format revision it cannot read', () => {
    // Version 2 is the revision this release writes; only a later one is
    // refused, so a reader never guesses at fields it does not know.
    expect(parseTeamPresetValue({ ...DOCUMENT, version: 3 })).toEqual({ ok: false, reason: 'unsupported-version' })
    expect(parseTeamPresetValue({ ...DOCUMENT, version: '1' })).toEqual({ ok: false, reason: 'invalid-format' })
  })

  it('still reads a version 1 document and reports its revision', () => {
    const legacy = { ...DOCUMENT, version: 1 }
    const parsed = parseTeamPresetValue(legacy)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.transfer.version).toBe(1)
    // A version 1 document carries no metadata, so none is invented.
    expect(parsed.transfer.team.metadata).toBeUndefined()
  })

  it('refuses a document carrying a field a shared preset cannot hold', () => {
    expect(parseTeamPresetValue({ ...DOCUMENT, extra: true }))
      .toEqual({ ok: false, reason: 'unsupported-fields' })
    expect(parseTeamPresetValue(document({
      captain: { ...DOCUMENT.team.captain, provider: 'deepseek' },
    }))).toEqual({ ok: false, reason: 'unsupported-fields' })
    expect(parseTeamPresetValue(document({
      members: [{ ...DOCUMENT.team.members[0]!, tools: ['read'] }],
    }))).toEqual({ ok: false, reason: 'unsupported-fields' })
  })

  it('refuses a slot that is missing one of its fields', () => {
    expect(parseTeamPresetValue(document({
      captain: { name: 'lead', description: '', color: '' },
    }))).toEqual({ ok: false, reason: 'invalid-format' })
  })

  it('refuses two members under one name', () => {
    const members = [DOCUMENT.team.members[0]!, { ...DOCUMENT.team.members[0]!, name: 'Reviewer' }]
    expect(parseTeamPresetValue(document({ members }))).toEqual({ ok: false, reason: 'duplicate-members' })
  })

  it('refuses more members than one Team may declare', () => {
    const members = Array.from({ length: MAX_TRANSFER_MEMBERS + 1 }, (_, index) => ({
      name: `member-${String(index)}`, description: '', systemPrompt: '', color: '',
    }))
    expect(parseTeamPresetValue(document({ members }))).toEqual({ ok: false, reason: 'too-many-members' })
  })

  it('refuses text too large to be a Team preset', () => {
    expect(parseTeamPresetText('x'.repeat(MAX_TRANSFER_CHARS + 1))).toEqual({ ok: false, reason: 'too-large' })
  })
})

describe('building local agents from a document', () => {
  it('gives the imported Team the local defaults the document does not carry', () => {
    const imported = teamFromTransfer(DOCUMENT, 'team-9')
    expect(imported.members[0]?.id).toEqual(expect.any(String))
    expect({ ...imported, members: imported.members.map(({ id: _id, ...member }) => member) }).toEqual({
      id: 'team-9',
      name: 'Review team',
      description: 'Reviews changes before they land',
      captain: {
        name: 'team-lead',
        color: '#4c8dff',
        description: 'Keeps the queue moving',
        toolMode: 'all',
        tools: [],
        systemPrompt: 'You lead.',
      },
      members: [{
        name: 'reviewer',
        color: '#2fbf71',
        description: 'checks diffs',
        toolMode: 'all',
        tools: [],
        systemPrompt: 'You review one diff at a time.',
        provider: '',
        model: '',
        reasoningEffort: '',
      }],
    })
  })

  it('overwrites only the fields a shared slot carries', () => {
    const configured = TEAM.members[0]!
    const shared = { name: 'reviewer', description: 'new role', systemPrompt: 'New prompt.', color: '#e05c6b' }
    expect(applySharedFields(configured, shared)).toEqual({
      ...configured,
      name: 'reviewer',
      description: 'new role',
      systemPrompt: 'New prompt.',
      color: '#e05c6b',
    })
    expect(memberFromTransfer(shared)).toMatchObject({ provider: '', model: '', reasoningEffort: '', toolMode: 'all' })
    expect(captainFromTransfer(shared)).not.toHaveProperty('provider')
  })
})

describe('name keys', () => {
  it('compares names the way the runtime matches a summoned member', () => {
    expect(slotNameKey('  Reviewer ')).toBe('reviewer')
  })

  it('derives a free name from a taken one', () => {
    expect(uniqueName('Review team', ['Review team'])).toBe('Review team 2')
    expect(uniqueName('Review team', ['Review team', 'Review team 2'])).toBe('Review team 3')
    expect(uniqueName('Review team', ['Other'])).toBe('Review team')
    expect(uniqueName('', ['Review team'])).toBe('')
  })
})

describe('import collisions', () => {
  it('finds the Team a document would overwrite and the names it already uses', () => {
    expect(importConflicts([TEAM], DOCUMENT)).toEqual({
      targetIndex: 0,
      targetName: 'Review team',
      captainConflict: 'team-lead',
      memberConflicts: ['reviewer'],
      suggestedTeamName: 'Review team 2',
      suggestedCaptainName: 'team-lead 2',
    })
  })

  it('reports no collision for names nothing uses', () => {
    const free = document({
      name: 'Build team',
      captain: { ...DOCUMENT.team.captain, name: 'builder-lead' },
      members: [{ ...DOCUMENT.team.members[0]!, name: 'builder' }],
    })
    expect(importConflicts([TEAM], free)).toEqual({
      targetIndex: undefined,
      targetName: '',
      captainConflict: '',
      memberConflicts: [],
      suggestedTeamName: 'Build team',
      suggestedCaptainName: 'builder-lead',
    })
  })

  it('never collides on an unnamed Team, whose identity is its local id', () => {
    expect(importConflicts([{ ...TEAM, name: '' }], document({ name: '' })).targetIndex).toBeUndefined()
  })

  it('matches names case-insensitively and ignores surrounding space', () => {
    const noisy = document({
      name: ' review TEAM ',
      captain: { ...DOCUMENT.team.captain, name: ' Team-Lead ' },
      members: [{ ...DOCUMENT.team.members[0]!, name: 'Reviewer' }],
    })
    expect(importConflicts([TEAM], noisy)).toMatchObject({
      targetIndex: 0,
      captainConflict: ' Team-Lead ',
      memberConflicts: ['Reviewer'],
    })
  })

  it('does not compare agents across Teams the document would not overwrite', () => {
    const other: TeamPreset = {
      ...TEAM,
      id: 'team-2',
      name: 'Other team',
      members: [{ ...TEAM.members[0]!, name: 'reviewer' }],
    }
    const free = document({ name: 'Build team' })
    expect(importConflicts([other], free).memberConflicts).toEqual([])
  })
})

describe('display metadata in the shared document', () => {
  /** One Team carrying every metadata field. */
  const withMetadata: TeamPreset = {
    ...TEAM,
    metadata: {
      summary: '适合跨模块功能开发',
      tags: ['软件研发', '多角色协作'],
      useCases: ['复杂重构', '全栈集成'],
      quickPrompts: ['为现有项目增加用户认证模块并验证'],
      notes: '适合已有明确目标的工程任务',
    },
  }

  it('exports metadata and reads it back unchanged', () => {
    const text = serializeTeamPreset(withMetadata)
    const parsed = parseTeamPresetText(text)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.transfer.version).toBe(2)
    expect(parsed.transfer.team.metadata).toEqual(withMetadata.metadata)
    // Round-trip into a stored Team keeps the metadata verbatim.
    expect(teamFromTransfer(parsed.transfer, 'copy').metadata).toEqual(withMetadata.metadata)
  })

  it('omits an absent or empty metadata object instead of writing blanks', () => {
    expect(exportTeamPreset(TEAM).team.metadata).toBeUndefined()
    expect(exportTeamPreset({ ...TEAM, metadata: { tags: [] } }).team.metadata).toBeUndefined()
  })

  it('never carries runtime or local fields beside the metadata', () => {
    const document = exportTeamPreset(withMetadata)
    const json = JSON.stringify(document)
    expect(json).not.toContain('deepseek-chat')
    expect(json).not.toContain('reasoningEffort')
    expect(json).not.toContain('toolMode')
    expect(json).not.toContain('bash')
    expect(json).not.toContain('team-skill')
  })

  it('refuses an oversized or malformed metadata field', () => {
    const tooLong = { ...DOCUMENT, version: 2, team: { ...DOCUMENT.team, metadata: { summary: 'x'.repeat(METADATA_LIMITS.summary + 1) } } }
    expect(parseTeamPresetValue(tooLong)).toEqual({ ok: false, reason: 'invalid-metadata' })
    const notAList = { ...DOCUMENT, version: 2, team: { ...DOCUMENT.team, metadata: { tags: 'not-a-list' } } }
    expect(parseTeamPresetValue(notAList)).toEqual({ ok: false, reason: 'invalid-metadata' })
    const unknownKey = { ...DOCUMENT, version: 2, team: { ...DOCUMENT.team, metadata: { injected: 'x' } } }
    expect(parseTeamPresetValue(unknownKey)).toEqual({ ok: false, reason: 'unsupported-fields' })
  })

  it('refuses a metadata object larger than the document budget', () => {
    const huge = {
      ...DOCUMENT,
      version: 2,
      team: {
        ...DOCUMENT.team,
        metadata: {
          tags: Array.from({ length: METADATA_LIMITS.tags }, () => 'x'.repeat(METADATA_LIMITS.tag)),
          useCases: Array.from({ length: METADATA_LIMITS.useCases }, () => 'y'.repeat(METADATA_LIMITS.useCase)),
          quickPrompts: Array.from({ length: METADATA_LIMITS.quickPrompts }, () => 'z'.repeat(METADATA_LIMITS.quickPrompt)),
          notes: 'n'.repeat(METADATA_LIMITS.notes),
        },
      },
    }
    expect(metadataChars(huge.team.metadata as never)).toBeGreaterThan(METADATA_LIMITS.total)
    expect(parseTeamPresetValue(huge)).toEqual({ ok: false, reason: 'invalid-metadata' })
  })

  it('carries official default skill declarations but no local binding', () => {
    const document = exportTeamPreset(TEAM, {
      officialSkills: [{ skillId: 'git-release-hygiene', roleName: 'repository-specialist' }],
    })
    expect(document.team.officialSkills).toEqual([{ skillId: 'git-release-hygiene', roleName: 'repository-specialist' }])
    const parsed = parseTeamPresetValue(JSON.parse(JSON.stringify(document)))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.transfer.team.officialSkills).toEqual(document.team.officialSkills)
    // An imported Team never gains a local assignment from a document.
    expect(teamFromTransfer(parsed.transfer, 'copy')).not.toHaveProperty('skillBindings')
  })
})

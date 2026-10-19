/**
 * Display metadata is presentation data and nothing else.
 *
 * The claim the settings page makes to the user — "仅用于展示与搜索，不会自动
 * 注入队长或队员的运行时上下文" — is only honest if every artefact the runtime
 * builds is byte-identical with and without it. This spec pins that: ten
 * kilobytes of metadata must not reach the captain briefing, a member briefing,
 * the member roster, the frozen definition fingerprint that decides whether a
 * Team has to be re-applied, or the preset tools' model-facing projections.
 */

import { describe, expect, it } from 'vitest'
import { definitionFingerprint, captainBriefing, memberBriefing, memberTargets, memberTeamDivision, toolMode } from '../src/presets.ts'
import { exportTeamPreset, metadataChars, METADATA_LIMITS } from '../src/preset-transfer.ts'
import { slot, team } from './fixtures/team-presets.ts'
import type { TeamDisplayMetadata, TeamPreset } from '../src/types.ts'

/**
 * Roughly fifteen kilobytes of display metadata: within the format budget, far
 * past any size a prompt could absorb without changing it.
 */
function bulkyMetadata(): TeamDisplayMetadata {
  return {
    summary: '摘'.repeat(METADATA_LIMITS.summary),
    tags: Array.from({ length: METADATA_LIMITS.tags }, (_, index) => `标${String(index)}`.padEnd(METADATA_LIMITS.tag, 'x')),
    useCases: Array.from({ length: METADATA_LIMITS.useCases }, (_, index) => `场${String(index)}`.padEnd(METADATA_LIMITS.useCase, 'y')),
    quickPrompts: Array.from({ length: METADATA_LIMITS.quickPrompts - 2 }, (_, index) => `任${String(index)}`.padEnd(METADATA_LIMITS.quickPrompt, 'z')),
    notes: '备'.repeat(100),
  }
}

/** One Team with two members and a captain, with every runtime field set. */
function baseTeam(): TeamPreset {
  return team(
    [
      slot({ id: 'role-reviewer', name: 'reviewer', description: 'checks diffs', systemPrompt: 'REVIEW_RULES', tools: ['read'], toolMode: 'custom' }),
      slot({ id: 'role-executor', name: 'executor', description: 'writes code', systemPrompt: 'EXEC_RULES', provider: 'p', model: 'm' }),
    ],
    { description: 'TEAM_PURPOSE', systemPrompt: 'CAPTAIN_RULES' },
  )
}

describe('display metadata never reaches the runtime', () => {
  const metadata = bulkyMetadata()
  const plain = baseTeam()
  const decorated: TeamPreset = { ...baseTeam(), metadata }

  it('is genuinely large enough to matter', () => {
    expect(metadataChars(metadata)).toBeGreaterThan(12 * 1024)
    expect(metadataChars(metadata)).toBeLessThanOrEqual(METADATA_LIMITS.total)
  })

  it('leaves the captain briefing byte-identical', () => {
    expect(captainBriefing(decorated)).toBe(captainBriefing(plain))
  })

  it('leaves every member briefing and the member roster byte-identical', () => {
    const before = memberTargets(plain)
    const after = memberTargets(decorated)
    expect(after.map(row => row.target)).toEqual(before.map(row => row.target))
    for (const [index, row] of after.entries()) {
      const previous = before[index]!
      expect(memberBriefing(decorated, row.member, row.target)).toBe(memberBriefing(plain, previous.member, previous.target))
      expect(memberTeamDivision(decorated, row.target)).toBe(memberTeamDivision(plain, previous.target))
    }
  })

  it('leaves the frozen definition fingerprint identical', () => {
    // A metadata edit must not look like a definition change, or the plugin
    // would re-apply the Team (and re-declare its tool surface) for a field the
    // model never sees.
    expect(definitionFingerprint(decorated)).toBe(definitionFingerprint(plain))
    // Editing a real runtime field still moves the fingerprint.
    const renamed: TeamPreset = { ...plain, name: 'Another name' }
    expect(definitionFingerprint(renamed)).not.toBe(definitionFingerprint(plain))
  })

  it('leaves the effective tool policy identical', () => {
    expect(toolMode(decorated.captain)).toBe(toolMode(plain.captain))
    expect(decorated.members.map(member => toolMode(member))).toEqual(plain.members.map(member => toolMode(member)))
  })

  it('never appears in any string the runtime composes', () => {
    const composed = [
      captainBriefing(decorated),
      memberTeamDivision(decorated, memberTargets(decorated)[0]!.target),
      ...memberTargets(decorated).map(row => memberBriefing(decorated, row.member, row.target)),
    ].join('\n')
    for (const text of [metadata.summary!, metadata.tags![0]!, metadata.useCases![0]!, metadata.quickPrompts![0]!, metadata.notes!]) {
      expect(composed).not.toContain(text)
    }
  })

  it('is carried by the shared document even though it is not carried by the runtime', () => {
    // The contrast is the point: the same object is exported and imported, and
    // is ignored by every runtime projection above.
    const document = exportTeamPreset(decorated)
    expect(document.team.metadata).toEqual(metadata)
    expect(JSON.stringify(document)).not.toContain('CAPTAIN_RULES' + 'x')
    expect(JSON.stringify(document)).not.toContain('toolMode')
  })

  it('does not carry local category data into the shared document', () => {
    // Category membership is stored beside the Teams, never inside one, so no
    // preset export can leak a personal grouping.
    const document = JSON.stringify(exportTeamPreset(decorated))
    expect(document).not.toContain('category')
    expect(document).not.toContain('teamCategories')
  })
})

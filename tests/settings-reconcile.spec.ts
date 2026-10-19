/**
 * The startup settings pass: it never changes Session policy or unrelated
 * fields, it installs the shipped defaults exactly once, and it never races its
 * own writes.
 */
import { describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import {
  AUDIT_TEAM_ID, BUILTIN_TEAMS, BUILTIN_TEAM_IDS, DISCOVERY_TEAM_ID, ENGINEERING_TEAM_ID, FULLSTACK_TEAM_ID,
  LIGHTWEIGHT_TEAM_ID, PLANNING_TEAM_ID, RESEARCH_TEAM_ID, STANDARD_TEAM_ID, WORKFLOW_TEAM_ID,
  builtinTeamDefinition,
} from '../src/builtin-teams.ts'
import type { Config } from '../src/config.ts'
import type { TeamCategory, TeamCategoryAssignment, TeamPreset } from '../src/types.ts'
import { teamSettingsReconcile } from '../src/settings-reconcile.ts'
import { routedCaptain, slot, team } from './fixtures/team-presets.ts'

/** Every shipped identity, in shipped order: development scale, then work modes. */
const IDS: readonly string[] = BUILTIN_TEAM_IDS

/** The three identities a 0.1.5 deployment was offered. */
const LEGACY_IDS = [LIGHTWEIGHT_TEAM_ID, STANDARD_TEAM_ID, FULLSTACK_TEAM_ID]

/**
 * One deployment that was already offered the shipped defaults.
 *
 * The default fixture starts here so a case about the legacy captain route or a
 * missing member identity keeps meaning exactly what it meant before the same
 * pass also installed the shipped presets.
 */
function fixture(initial: TeamPreset[], seeded: readonly string[] = IDS) {
  const ctx = new Context()
  let teams = initial
  let marker = [...seeded]
  let categories: TeamCategory[] = []
  let teamCategories: TeamCategoryAssignment[] = []
  let revision = 0
  let active = true
  const update = vi.fn(async (_ns: string, patch: {
    teams: TeamPreset[]
    seededDefaults: string[]
    teamCategories?: TeamCategoryAssignment[]
  }, expected?: number) => {
    if (expected !== revision) throw new Error('revision conflict')
    teams = patch.teams
    marker = patch.seededDefaults
    // The Host applies a partial patch; an omitted field keeps its stored value.
    if (patch.teamCategories !== undefined) teamCategories = patch.teamCategories
    revision++
  })
  ctx.provide('settings', { describe: () => active ? [{ ns: 'test', revision }] : [], update })
  const config: Config = {
    teams: { get: () => teams },
    selections: { get: () => [] },
    seededDefaults: { get: () => marker },
    categories: { get: () => categories },
    teamCategories: { get: () => teamCategories },
    freshProvider: 'spawn',
    forkProvider: 'fork',
  }
  return {
    ctx,
    update,
    reconcile: teamSettingsReconcile(ctx, config, 'test'),
    current: () => teams,
    currentMarker: () => marker,
    currentCategories: () => teamCategories,
    replace(next: TeamPreset[]) { teams = next; revision++ },
    /** Store one local category and its memberships, as the page would. */
    storeCategories(next: TeamCategory[], memberships: TeamCategoryAssignment[]) {
      categories = next
      teamCategories = memberships
      revision++
    },
    setActive(value: boolean) { active = value },
  }
}

describe('minimal settings reconcile', () => {
  it('removes only obsolete captain fields and adds unique IDs without rewriting unrelated data', async () => {
    const captain = { ...routedCaptain(), extension: { value: 7 } }
    const initial = team([slot({ id: 'kept-id', tools: ['read'], provider: 'p', model: 'm' }), slot({ id: 'kept-id' }), slot()], captain)
    const h = fixture([initial])
    await h.reconcile.request()
    expect(h.update).toHaveBeenCalledOnce()
    const migrated = h.current()[0]!
    expect(migrated.captain).toHaveProperty('extension', { value: 7 })
    expect(migrated.captain).not.toHaveProperty('provider')
    expect(migrated.captain).not.toHaveProperty('model')
    expect(migrated.members[0]).toBe(initial.members[0])
    expect(new Set(migrated.members.map(member => member.id)).size).toBe(3)
    for (let i = 0; i < 50; i++) await h.reconcile.request()
    expect(h.update).toHaveBeenCalledOnce()
    expect(h.update.mock.calls[0]?.[1]).not.toHaveProperty('selections')
  })

  it('coalesces repeated notifications while a reconcile write is pending', async () => {
    const h = fixture([team([slot()])])
    let release!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    const commit = h.update.getMockImplementation()!
    h.update.mockImplementationOnce(async (...args) => { await gate; await commit(...args) })
    const running = h.reconcile.request()
    for (let i = 0; i < 100; i++) void h.reconcile.request()
    expect(h.update).toHaveBeenCalledOnce()
    release()
    await running
    expect(h.update).toHaveBeenCalledOnce()
  })

  it('does not repeatedly write a refused snapshot and retries only changed documents', async () => {
    const h = fixture([team([slot()])])
    h.update.mockRejectedValueOnce(new Error('read only'))
    await h.reconcile.request()
    await h.reconcile.request()
    expect(h.update).toHaveBeenCalledOnce()
    h.replace([team([slot()], { description: 'new user edit' })])
    await h.reconcile.request()
    expect(h.update).toHaveBeenCalledTimes(2)
    expect(h.current()[0]?.captain.description).toBe('new user edit')
  })

  it('rebases a queued attempt after CAS conflict instead of overwriting a newer user edit', async () => {
    const h = fixture([team([slot()])])
    let release!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    const commit = h.update.getMockImplementation()!
    h.update.mockImplementationOnce(async (...args) => { await gate; await commit(...args) })
    const running = h.reconcile.request()
    h.replace([team([slot({ id: 'user-id' })], { ...routedCaptain(), description: 'preserve this user edit' })])
    void h.reconcile.request()
    release()
    await running
    expect(h.update).toHaveBeenCalledTimes(2)
    expect(h.update.mock.calls[0]?.[2]).toBe(0)
    expect(h.update.mock.calls[1]?.[2]).toBe(1)
    expect(h.current()[0]?.captain.description).toBe('preserve this user edit')
    expect(h.current()[0]?.members[0]?.id).toBe('user-id')
  })

  it('allows only the already-admitted write to settle after disposal, with no queued retry', async () => {
    const h = fixture([team([slot()])])
    let release!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    const commit = h.update.getMockImplementation()!
    h.update.mockImplementationOnce(async (...args) => { await gate; await commit(...args) })
    const running = h.reconcile.request()
    void h.reconcile.request()
    h.reconcile.dispose()
    release()
    await running
    await h.reconcile.request()
    expect(h.update).toHaveBeenCalledOnce()
  })

  it('does not admit a write after disposal', async () => {
    const h = fixture([team([slot()])])
    h.reconcile.dispose()
    await h.reconcile.request()
    expect(h.update).not.toHaveBeenCalled()
  })

  it('contains settings discovery failure instead of rejecting its scheduled request', async () => {
    const h = fixture([team([slot()])])
    const read = vi.spyOn(h.ctx.settings, 'describe').mockImplementation(() => { throw new Error('discovery failed') })
    await expect(h.reconcile.request()).resolves.toBeUndefined()
    expect(h.update).not.toHaveBeenCalled()
    read.mockRestore()
  })

  it('waits for an active settings entry instead of writing without a revision', async () => {
    const h = fixture([team([slot()])])
    h.setActive(false)
    await h.reconcile.request()
    expect(h.update).not.toHaveBeenCalled()
    h.setActive(true)
    await h.reconcile.request()
    expect(h.update).toHaveBeenCalledOnce()
  })
})

describe('local category memberships in the startup reconcile', () => {
  it('drops a membership whose category no longer exists', async () => {
    const h = fixture([team([slot()])])
    h.storeCategories([], [{ teamId: 'team-1', categoryId: 'deleted-category' }])
    await h.reconcile.request()
    expect(h.update).toHaveBeenCalledOnce()
    expect(h.current()[0]?.id).toBe('team-1')
    expect(h.update.mock.calls[0]?.[1]).toMatchObject({ teamCategories: [] })
    // One repair, then silence.
    await h.reconcile.request()
    expect(h.update).toHaveBeenCalledOnce()
  })

  it('keeps a membership that names a shipped Team identity it can still restore', async () => {
    const h = fixture([team([slot()])])
    const company = { id: 'cat-work', name: '工作', order: 0 }
    const membership = { teamId: LIGHTWEIGHT_TEAM_ID, categoryId: company.id }
    // The shipped Team is not stored right now — the user deleted it — but the
    // identity is official, so a restore must return the Team to its group.
    h.storeCategories([company], [membership])
    await h.reconcile.request()
    expect(h.update).toHaveBeenCalledOnce()
    // Nothing was pruned, so the write stays the two-field patch it always was
    // and the stored membership is left exactly where it was.
    expect(h.update.mock.calls[0]?.[1]).not.toHaveProperty('teamCategories')
    expect(h.currentCategories()).toEqual([membership])
  })

  it('drops a membership naming a custom Team that no longer exists', async () => {
    const h = fixture([team([slot()])])
    const company = { id: 'cat-work', name: '工作', order: 0 }
    h.storeCategories([company], [{ teamId: 'team-deleted', categoryId: company.id }])
    await h.reconcile.request()
    expect(h.update.mock.calls[0]?.[1]).toMatchObject({ teamCategories: [] })
  })
})

describe('shipped defaults in the startup reconcile', () => {
  it('installs every shipped preset on a deployment that was never offered them', async () => {
    const h = fixture([], [])
    await h.reconcile.request()
    expect(h.update).toHaveBeenCalledOnce()
    const [namespace, patch] = h.update.mock.calls[0]!
    expect(namespace).toBe('test')
    expect(patch.teams.map(entry => entry.id)).toEqual(IDS)
    expect(patch.seededDefaults).toEqual(IDS)
    expect(patch.teams).toEqual(BUILTIN_TEAMS.map(builtinTeamDefinition))
    // The pass wrote once; every later notification finds nothing left to do.
    await h.reconcile.request()
    expect(h.update).toHaveBeenCalledOnce()
  })

  it('keeps a preset the user deleted deleted', async () => {
    const h = fixture([], IDS)
    await h.reconcile.request()
    expect(h.update).not.toHaveBeenCalled()
    expect(h.current()).toEqual([])
  })

  it('marks the presets a deployment already holds instead of duplicating them', async () => {
    const stored = builtinTeamDefinition(BUILTIN_TEAMS[0]!)
    const offered = IDS.filter(id => id !== LIGHTWEIGHT_TEAM_ID)
    const h = fixture([stored], offered)
    await h.reconcile.request()
    expect(h.update).toHaveBeenCalledOnce()
    expect(h.current()).toEqual([stored])
    // The marker keeps the order it was offered in, with the newly marked
    // preset appended: it is an append-only record, never a reordering.
    expect(h.currentMarker()).toEqual([...offered, LIGHTWEIGHT_TEAM_ID])
    await h.reconcile.request()
    expect(h.update).toHaveBeenCalledOnce()
  })

  it('upgrades a 0.1.5 deployment by adding only the six work modes', async () => {
    // The realistic upgrade: three stored 0.1.5 Teams and the three identities
    // that release had already offered.
    const stored = LEGACY_IDS.map(id => builtinTeamDefinition(BUILTIN_TEAMS.find(entry => entry.id === id)!))
    const h = fixture(stored, LEGACY_IDS)
    await h.reconcile.request()
    expect(h.update).toHaveBeenCalledOnce()
    const teams = h.current()
    expect(teams.map(entry => entry.id)).toEqual(IDS)
    // The stored copies are untouched; only the new identities are appended.
    expect(teams.slice(0, 3)).toEqual(stored)
    expect(h.currentMarker()).toEqual(IDS)
    // Idempotent: a second startup finds nothing to write.
    await h.reconcile.request()
    expect(h.update).toHaveBeenCalledOnce()
  })

  it('does not resurrect a 0.1.5 Team the user deleted, even across the upgrade', async () => {
    // The user deleted the standard Team in 0.1.5, so only two of the three
    // legacy identities are stored — but all three were offered.
    const stored = [LIGHTWEIGHT_TEAM_ID, FULLSTACK_TEAM_ID]
      .map(id => builtinTeamDefinition(BUILTIN_TEAMS.find(entry => entry.id === id)!))
    const h = fixture(stored, LEGACY_IDS)
    await h.reconcile.request()
    expect(h.update).toHaveBeenCalledOnce()
    const teams = h.current()
    expect(teams.map(entry => entry.id)).toEqual([LIGHTWEIGHT_TEAM_ID, FULLSTACK_TEAM_ID, ...IDS.slice(3)])
    expect(teams.map(entry => entry.id)).not.toContain(STANDARD_TEAM_ID)
  })

  it('installs the defaults and cleans a legacy document in one write', async () => {
    const legacy = team([slot()], routedCaptain())
    const h = fixture([legacy], [])
    await h.reconcile.request()
    expect(h.update).toHaveBeenCalledOnce()
    const stored = h.current()
    expect(stored.map(entry => entry.id)).toEqual(['team-1', ...IDS])
    expect(stored[0]?.captain).not.toHaveProperty('provider')
    expect(stored[0]?.members[0]?.id).toBeTruthy()
    expect(h.currentMarker()).toEqual(IDS)
  })
})

/**
 * The startup settings pass: it never changes Session policy or unrelated
 * fields, it installs the shipped defaults exactly once, and it never races its
 * own writes.
 */
import { describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import {
  BUILTIN_TEAMS, FULLSTACK_TEAM_ID, LIGHTWEIGHT_TEAM_ID, STANDARD_TEAM_ID, builtinTeamDefinition,
} from '../src/builtin-teams.ts'
import type { Config } from '../src/config.ts'
import type { TeamPreset } from '../src/types.ts'
import { teamSettingsReconcile } from '../src/settings-reconcile.ts'
import { routedCaptain, slot, team } from './fixtures/team-presets.ts'

/** Every shipped identity, in shipped order. */
const IDS = [LIGHTWEIGHT_TEAM_ID, STANDARD_TEAM_ID, FULLSTACK_TEAM_ID]

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
  let revision = 0
  let active = true
  const update = vi.fn(async (_ns: string, patch: { teams: TeamPreset[]; seededDefaults: string[] }, expected?: number) => {
    if (expected !== revision) throw new Error('revision conflict')
    teams = patch.teams
    marker = patch.seededDefaults
    revision++
  })
  ctx.provide('settings', { describe: () => active ? [{ ns: 'test', revision }] : [], update })
  const config: Config = {
    teams: { get: () => teams },
    selections: { get: () => [] },
    seededDefaults: { get: () => marker },
    freshProvider: 'spawn',
    forkProvider: 'fork',
  }
  return {
    ctx,
    update,
    reconcile: teamSettingsReconcile(ctx, config, 'test'),
    current: () => teams,
    currentMarker: () => marker,
    replace(next: TeamPreset[]) { teams = next; revision++ },
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

describe('shipped defaults in the startup reconcile', () => {
  it('installs the three presets on a deployment that was never offered them', async () => {
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
    const h = fixture([stored], [STANDARD_TEAM_ID, FULLSTACK_TEAM_ID])
    await h.reconcile.request()
    expect(h.update).toHaveBeenCalledOnce()
    expect(h.current()).toEqual([stored])
    // The marker keeps the order it was offered in, with the newly marked
    // preset appended: it is an append-only record, never a reordering.
    expect(h.currentMarker()).toEqual([STANDARD_TEAM_ID, FULLSTACK_TEAM_ID, LIGHTWEIGHT_TEAM_ID])
    await h.reconcile.request()
    expect(h.update).toHaveBeenCalledOnce()
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

/** Migration never changes Session policy or unrelated fields, nor races its own writes. */
import { describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { Config } from '../src/config.ts'
import type { TeamPreset } from '../src/types.ts'
import { teamSettingsMigration } from '../src/settings-migration.ts'
import { routedCaptain, slot, team } from './fixtures/team-presets.ts'

function fixture(initial: TeamPreset[]) {
  const ctx = new Context()
  let teams = initial
  let revision = 0
  let active = true
  const update = vi.fn(async (_ns: string, patch: { teams: TeamPreset[] }, expected?: number) => {
    if (expected !== revision) throw new Error('revision conflict')
    teams = patch.teams
    revision++
  })
  ctx.provide('settings', { describe: () => active ? [{ ns: 'test', revision }] : [], update })
  const config: Config = { teams: { get: () => teams }, selections: { get: () => [] }, freshProvider: 'spawn', forkProvider: 'fork' }
  return { ctx, update, migration: teamSettingsMigration(ctx, config, 'test'), current: () => teams,
    replace(next: TeamPreset[]) { teams = next; revision++ }, setActive(value: boolean) { active = value } }
}

describe('minimal settings migration', () => {
  it('removes only obsolete captain fields and adds unique IDs without rewriting unrelated data', async () => {
    const captain = { ...routedCaptain(), extension: { value: 7 } }
    const initial = team([slot({ id: 'kept-id', tools: ['read'], provider: 'p', model: 'm' }), slot({ id: 'kept-id' }), slot()], captain)
    const h = fixture([initial])
    await h.migration.request()
    expect(h.update).toHaveBeenCalledOnce()
    const migrated = h.current()[0]!
    expect(migrated.captain).toHaveProperty('extension', { value: 7 })
    expect(migrated.captain).not.toHaveProperty('provider')
    expect(migrated.captain).not.toHaveProperty('model')
    expect(migrated.members[0]).toBe(initial.members[0])
    expect(new Set(migrated.members.map(member => member.id)).size).toBe(3)
    for (let i = 0; i < 50; i++) await h.migration.request()
    expect(h.update).toHaveBeenCalledOnce()
    expect(h.update.mock.calls[0]?.[1]).not.toHaveProperty('selections')
  })

  it('coalesces repeated notifications while a migration write is pending', async () => {
    const h = fixture([team([slot()])])
    let release!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    const commit = h.update.getMockImplementation()!
    h.update.mockImplementationOnce(async (...args) => { await gate; await commit(...args) })
    const running = h.migration.request()
    for (let i = 0; i < 100; i++) void h.migration.request()
    expect(h.update).toHaveBeenCalledOnce()
    release()
    await running
    expect(h.update).toHaveBeenCalledOnce()
  })

  it('does not repeatedly write a refused snapshot and retries only changed documents', async () => {
    const h = fixture([team([slot()])])
    h.update.mockRejectedValueOnce(new Error('read only'))
    await h.migration.request()
    await h.migration.request()
    expect(h.update).toHaveBeenCalledOnce()
    h.replace([team([slot()], { description: 'new user edit' })])
    await h.migration.request()
    expect(h.update).toHaveBeenCalledTimes(2)
    expect(h.current()[0]?.captain.description).toBe('new user edit')
  })

  it('rebases a queued attempt after CAS conflict instead of overwriting a newer user edit', async () => {
    const h = fixture([team([slot()])])
    let release!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    const commit = h.update.getMockImplementation()!
    h.update.mockImplementationOnce(async (...args) => { await gate; await commit(...args) })
    const running = h.migration.request()
    h.replace([team([slot({ id: 'user-id' })], { ...routedCaptain(), description: 'preserve this user edit' })])
    void h.migration.request()
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
    const running = h.migration.request()
    void h.migration.request()
    h.migration.dispose()
    release()
    await running
    await h.migration.request()
    expect(h.update).toHaveBeenCalledOnce()
  })

  it('does not admit a write after disposal', async () => {
    const h = fixture([team([slot()])])
    h.migration.dispose()
    await h.migration.request()
    expect(h.update).not.toHaveBeenCalled()
  })

  it('contains settings discovery failure instead of rejecting its scheduled request', async () => {
    const h = fixture([team([slot()])])
    const read = vi.spyOn(h.ctx.settings, 'describe').mockImplementation(() => { throw new Error('discovery failed') })
    await expect(h.migration.request()).resolves.toBeUndefined()
    expect(h.update).not.toHaveBeenCalled()
    read.mockRestore()
  })

  it('waits for an active settings entry instead of writing without a revision', async () => {
    const h = fixture([team([slot()])])
    h.setActive(false)
    await h.migration.request()
    expect(h.update).not.toHaveBeenCalled()
    h.setActive(true)
    await h.migration.request()
    expect(h.update).toHaveBeenCalledOnce()
  })
})

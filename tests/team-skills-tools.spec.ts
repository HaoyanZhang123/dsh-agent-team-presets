/**
 * The Agent-facing Team Skill tools: the same manager rules, reached from the
 * captain instead of the page.
 */

import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { buildSkillPackage } from '../src/team-skills/import.ts'
import { TeamSkillManager } from '../src/team-skills/manager.ts'
import { TeamSkillStore } from '../src/team-skills/store.ts'

const roots: string[] = []
const contexts: Context[] = []
afterEach(async () => {
  for (const ctx of contexts.splice(0)) await ctx.fiber.dispose()
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})

const TEXT = (value: string): Uint8Array => new TextEncoder().encode(value)

/**
 * Build a manager over one stored custom skill.
 * @param root - scratch directory.
 * @returns the manager and the asset identity.
 */
async function fixture(root: string): Promise<{ manager: TeamSkillManager; assetId: string }> {
  const store = new TeamSkillStore(root)
  await store.open()
  const built = buildSkillPackage([{ path: 'SKILL.md', bytes: TEXT('---\nname: demo-skill\ndescription: d\n---\n\nBody\n') }])
  if (!built.ok) throw new Error('fixture')
  const asset = await store.install(built.skill, { id: 'custom:demo-skill', origin: 'custom', version: '1' })
  const manager = new TeamSkillManager(store, root, {
    teams: () => [{ id: 'team-1', name: 'T', captain: { name: 'lead' }, members: [{ name: 'dev' }] } as never],
    activeAssetIds: () => new Set(),
    activeSessions: () => [],
  })
  await manager.open()
  return { manager, assetId: asset.id }
}

describe('the Team Skill tools', () => {
  it('binds and unbinds one role through the same rules the page uses', async () => {
    const root = await mkdtemp(join(tmpdir(), 'team-skill-tools-'))
    roots.push(root)
    const { manager, assetId } = await fixture(root)
    const assigned = await manager.assign({ teamId: 'team-1', roleId: 'dev', assetId })
    expect(assigned).toMatchObject({ ok: true })
    expect(manager.assetsFor('team-1', 'dev').map(asset => asset.id)).toEqual([assetId])
    expect(manager.bindingSummaries(assetId)).toHaveLength(1)
    expect(await manager.unassign('team-1', 'dev', assetId)).toBe(true)
    expect(manager.assetsFor('team-1', 'dev')).toEqual([])
  })

  it('refuses to delete while a role holds the skill, and names the holder', async () => {
    const root = await mkdtemp(join(tmpdir(), 'team-skill-tools-'))
    roots.push(root)
    const { manager, assetId } = await fixture(root)
    await manager.assign({ teamId: 'team-1', roleId: 'dev', assetId })
    const outcome = await manager.remove(assetId)
    expect(outcome.ok).toBe(false)
    const binding = outcome.blockers.find(blocker => blocker.kind === 'binding')
    expect(binding).toMatchObject({ kind: 'binding' })
    if (binding?.kind !== 'binding') return
    expect(binding.bindings[0]).toMatchObject({ teamId: 'team-1', roleName: 'dev' })
    await manager.unassign('team-1', 'dev', assetId)
    expect((await manager.remove(assetId)).ok).toBe(true)
  })
})

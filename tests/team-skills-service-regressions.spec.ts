import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { TeamSkillStore } from '../src/team-skills/store.ts'
import { TeamSkillManager } from '../src/team-skills/manager.ts'
import { TeamSkillService } from '../src/team-skills/service.ts'
import { team, slot } from './fixtures/team-presets.ts'

const roots: string[] = []
const contexts: Context[] = []
afterEach(async () => {
  vi.restoreAllMocks()
  for (const ctx of contexts.splice(0)) await ctx.fiber.dispose()
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'skill-service-'))
  roots.push(root)
  const store = new TeamSkillStore(root)
  await store.open()
  const teams = [team(['dev', 'already', 'explicit', 'unrelated'].map(id => slot({ id, name: id })), {})]
  const manager = new TeamSkillManager(store, root, { teams: () => teams, activeAssetIds: () => new Set(), activeSessions: () => [] })
  await manager.open()
  await store.install({ name: 'demo', description: 'demo', files: [{ path: 'SKILL.md', bytes: new TextEncoder().encode('---\nname: demo\ndescription: demo\n---\n\nBody\n') }], totalBytes: 1 }, { id: 'builtin:demo', origin: 'builtin', version: '1' })
  const ctx = new Context()
  contexts.push(ctx)
  const resync = vi.fn()
  const service = new TeamSkillService(ctx, { store, manager, teams: () => teams, official: () => ['demo'], ready: Promise.resolve(true), resync })
  return { root, store, manager, service, resync }
}

describe('Team Skill override service regressions', () => {
  it('switches builtin users atomically, deduplicates and keeps explicit override choices', async () => {
    const { root, store, manager, service, resync } = await fixture()
    await store.createOverride('demo', 'override:demo')
    await store.createOverride('demo', 'override:another')
    for (const roleId of ['dev', 'already', 'explicit']) {
      expect((await manager.assign({ teamId: 'team-1', roleId, assetId: 'builtin:demo' })).ok).toBe(true)
    }
    await manager.assign({ teamId: 'team-1', roleId: 'already', assetId: 'override:demo' })
    await manager.assign({ teamId: 'team-1', roleId: 'explicit', assetId: 'override:another' })
    const revision = manager.bindingRevision
    const answer = await service.overrideSkill('demo')
    expect('asset' in answer && answer.asset.id).toBe('override:demo')
    expect(manager.bindingRevision).toBe(revision + 1)
    expect(manager.assetsFor('team-1', 'dev').map(asset => asset.id)).toEqual(['override:demo'])
    expect(manager.assetsFor('team-1', 'already').map(asset => asset.id)).toEqual(['override:demo'])
    expect(manager.assetsFor('team-1', 'explicit').map(asset => asset.id)).toEqual(['builtin:demo', 'override:another'])
    expect(manager.assetsFor('team-1', 'unrelated')).toEqual([])
    expect(JSON.parse(await readFile(join(root, 'bindings.json'), 'utf8')).bindings).toEqual(manager.list())
    expect(resync).toHaveBeenCalledTimes(1)
    await service.overrideSkill('demo')
    expect(manager.bindingRevision).toBe(revision + 1)
  })

  it('keeps the created override but rolls bindings back on write failure and retries safely', async () => {
    const { root, store, manager, service, resync } = await fixture()
    await manager.assign({ teamId: 'team-1', roleId: 'dev', assetId: 'builtin:demo' })
    const before = manager.list()
    const revision = manager.bindingRevision
    // Create a directory only once override publication succeeds, so the fault
    // is specifically the following bindings commit, not service readiness.
    const create = store.createOverride.bind(store)
    const spy = vi.spyOn(store, 'createOverride').mockImplementationOnce(async (...args) => {
      const asset = await create(...args)
      await rm(join(root, 'bindings.json'))
      await mkdir(join(root, 'bindings.json'))
      return asset
    })
    expect(await service.overrideSkill('demo')).toMatchObject({ ok: false, reason: 'override-refused' })
    expect(store.get('override:demo')).toBeDefined()
    const version = store.get('override:demo')!.version
    expect(manager.list()).toEqual(before)
    expect(manager.bindingRevision).toBe(revision)
    expect(resync).not.toHaveBeenCalled()
    await rm(join(root, 'bindings.json'), { recursive: true })
    spy.mockRestore()
    expect('asset' in await service.overrideSkill('demo')).toBe(true)
    expect(store.get('override:demo')!.version).toBe(version)
    expect(manager.assetsFor('team-1', 'dev').map(asset => asset.id)).toEqual(['override:demo'])
    expect(resync).toHaveBeenCalledTimes(1)
  })

  it('creates the import folder for the open gesture and stays idempotent', async () => {
    const { root, service } = await fixture()
    expect(await service.prepareImportFolder()).toMatchObject({ ok: true, root, path: join(root, 'inbox') })
    expect((await stat(join(root, 'inbox'))).isDirectory()).toBe(true)
    expect(await service.prepareImportFolder()).toMatchObject({ ok: true, path: join(root, 'inbox') })
  })

  it('scans the import folder and reports one reason per refused folder', async () => {
    const { root, store, service } = await fixture()
    const inbox = join(root, 'inbox')
    await mkdir(inbox, { recursive: true })
    const write = async (folder: string, body: string): Promise<void> => {
      await mkdir(join(inbox, folder), { recursive: true })
      await writeFile(join(inbox, folder, 'SKILL.md'), body)
    }
    await write('alpha', '---\nname: alpha\ndescription: alpha skill\n---\n\nBody\n')
    await write('duplicate-demo', '---\nname: demo\ndescription: same name as the shipped one\n---\n\nBody\n')
    await write('bad-name', '---\nname: Bad Name\ndescription: not kebab-case\n---\n\nBody\n')
    await mkdir(join(inbox, 'no-skill'))
    await writeFile(join(inbox, 'no-skill', 'README.md'), 'no instructions')
    await writeFile(join(inbox, 'plain.txt'), 'not a folder')

    const first = await service.scanImportFolder()
    if (!('entries' in first)) throw new Error('the scan was refused')
    expect(first).toMatchObject({ ok: true, scanned: 5, imported: 1, existing: 1, invalid: 3 })
    const rows = Object.fromEntries(first.entries.map(entry => [entry.folder, entry]))
    expect(rows['alpha']).toMatchObject({ status: 'imported', skillId: 'alpha', assetId: 'custom:alpha' })
    expect(rows['duplicate-demo']).toMatchObject({ status: 'existing', reason: 'duplicate', assetId: 'builtin:demo' })
    expect(rows['bad-name']).toMatchObject({ status: 'invalid', reason: 'invalid-name' })
    expect(rows['no-skill']).toMatchObject({ status: 'invalid', reason: 'missing-skill-file' })
    expect(rows['plain.txt']).toMatchObject({ status: 'invalid', reason: 'not-directory' })
    expect(await store.readText('custom:alpha', 'SKILL.md')).toContain('Body')

    // A second scan is idempotent: the published folder is now simply present.
    const second = await service.scanImportFolder()
    if (!('entries' in second)) throw new Error('the rescan was refused')
    expect(second).toMatchObject({ scanned: 5, imported: 0, existing: 2, invalid: 3 })
  })

  it('reports an empty scan when the import folder does not exist', async () => {
    const { root, service } = await fixture()
    const answer = await service.scanImportFolder()
    expect(answer).toMatchObject({ ok: true, root: join(root, 'inbox'), scanned: 0, imported: 0, existing: 0, invalid: 0, entries: [] })
  })

  it('keeps the full MCP dependency declaration in the detail it returns', async () => {
    const { store, service } = await fixture()
    const custom = await store.install({ name: 'browser', description: 'browser', files: [{ path: 'SKILL.md', bytes: new TextEncoder().encode('---\nname: browser\ndescription: browser\n---\n\nBody\n') }], totalBytes: 1 }, { id: 'custom:browser', origin: 'custom', version: '1' })
    await store.updateDependencies(custom.id, {
      executables: [],
      otherSkills: [],
      mcpServers: [{ serverName: 'browser', required: true, toolNames: ['click'], capabilities: ['tools'] }],
    })
    const detail = await service.detail(custom.id)
    expect(detail).toMatchObject({
      dependencies: {
        mcpServers: ['browser'],
        mcpDeclarations: [{ serverName: 'browser', required: true, toolNames: ['click'], capabilities: ['tools'] }],
        unverified: ['browser'],
      },
    })
  })

  it('serializes an assignment against a concurrent dependency publish', async () => {
    const { store, manager } = await fixture()
    const custom = await store.install({ name: 'browser', description: 'browser', files: [{ path: 'SKILL.md', bytes: new TextEncoder().encode('---\nname: browser\ndescription: browser\n---\n\nBody\n') }], totalBytes: 1 }, { id: 'custom:browser', origin: 'custom', version: '1' })
    let release!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    const order: string[] = []
    vi.spyOn(store, 'verify').mockImplementationOnce(async () => { await gate; return true })
    const assignment = manager.assign({ teamId: 'team-1', roleId: 'dev', assetId: custom.id }).then((result) => { order.push('assign'); return result })
    await vi.waitFor(() => expect(store.verify).toHaveBeenCalled())
    const update = store.updateDependencies(custom.id, { executables: [], otherSkills: [], mcpServers: [] }).then((asset) => { order.push('update'); return asset })
    // The publish must queue behind the check-and-bind transaction instead of
    // changing the asset version the assignment already validated.
    await new Promise<void>(resolve => { setTimeout(resolve, 25) })
    expect(order).toEqual([])
    release()
    expect((await assignment).ok).toBe(true)
    await update
    expect(order).toEqual(['assign', 'update'])
    expect(manager.assetsFor('team-1', 'dev').map(asset => asset.id)).toEqual([custom.id])
  })

  it('restores builtin bindings through the service and triggers resync', async () => {
    const { manager, service, resync } = await fixture()
    const spy = vi.spyOn(manager, 'restoreBuiltinBindings')
    const answer = await service.restoreBuiltinBindings(['builtin-fullstack'])
    expect(spy).toHaveBeenCalledWith(['builtin-fullstack'])
    expect(resync).toHaveBeenCalled()
    expect(answer).toHaveProperty('assets')
  })
})

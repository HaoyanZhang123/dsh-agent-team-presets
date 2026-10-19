/**
 * Real-process crash recovery: SIGKILL a child in the middle of one Team Skill
 * transaction, then reopen the store and require a consistent, complete state.
 *
 * The kill point is intentionally unpredictable. Every trial therefore asserts
 * the invariant that holds wherever the kill landed: the registry never lists an
 * asset whose bytes are unreadable, both outcomes (committed or rolled back) are
 * usable, and no stage/backup/journal debris survives the reopen.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { TeamSkillStore } from '../src/team-skills/store.ts'

const roots: string[] = []
const writer = join(dirname(fileURLToPath(import.meta.url)), 'fixtures/skill-crash-writer.mjs')

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})

/** Run one child until it prints `ready`, then kill it `delayMs` after `go`. */
async function killedRun(root: string, mode: 'install' | 'remove', delayMs: number): Promise<void> {
  const child = spawn(process.execPath, [writer, root, mode], { stdio: ['pipe', 'pipe', 'inherit'] })
  const exited = new Promise<void>((resolve, reject) => {
    child.on('error', reject)
    child.on('exit', () => { resolve() })
  })
  await new Promise<void>((resolve, reject) => {
    const onData = (chunk: Buffer): void => {
      if (!chunk.toString().includes('ready')) return
      child.stdout.off('data', onData)
      resolve()
    }
    child.stdout.on('data', onData)
    child.on('error', reject)
  })
  child.stdin.write('go\n')
  await new Promise<void>(resolve => { setTimeout(resolve, delayMs) })
  child.kill('SIGKILL')
  await exited
}

describe('Team Skill crash recovery', () => {
  it.each([0, 2, 5, 9])('reopens a consistent store after SIGKILL during install (delay %dms)', async (delay) => {
    const root = await mkdtemp(join(tmpdir(), 'skill-crash-install-'))
    roots.push(root)
    await killedRun(root, 'install', delay)
    const store = new TeamSkillStore(root)
    await store.open()
    for (const asset of store.list()) expect(await store.verify(asset.id), asset.id).toBe(true)
    const recovered = store.get('custom:crash')
    if (recovered === undefined) {
      // Rolled back: the identity is free and a retry publishes version 1.
      const created = await store.install({
        name: 'crash', description: 'crash', totalBytes: 1,
        files: [{ path: 'SKILL.md', bytes: new TextEncoder().encode('---\nname: crash\ndescription: crash\n---\n\nBody\n') }],
      }, { id: 'custom:crash', origin: 'custom', version: '1' })
      expect(await store.readText(created.id, 'SKILL.md')).toContain('Body')
    } else {
      expect(await store.readText(recovered.id, 'SKILL.md')).toContain('Body')
    }
    // No stage directory, backup, or journal may survive the reopen.
    expect((await readdir(root)).filter(name => name.startsWith('.stage-') || name.startsWith('.removed-')))
      .toEqual([])
    expect(await readdir(root)).not.toContain('transaction.json')
  })

  it.each([0, 2, 5, 9])('reopens a consistent store after SIGKILL during removal (delay %dms)', async (delay) => {
    const root = await mkdtemp(join(tmpdir(), 'skill-crash-remove-'))
    roots.push(root)
    await killedRun(root, 'remove', delay)
    const store = new TeamSkillStore(root)
    await store.open()
    for (const asset of store.list()) expect(await store.verify(asset.id), asset.id).toBe(true)
    const recovered = store.get('custom:crash')
    if (recovered !== undefined) {
      expect(await store.readText(recovered.id, 'SKILL.md')).toContain('Body')
    } else {
      // Rolled forward: the deletion is complete and its version is reusable.
      const created = await store.install({
        name: 'crash', description: 'crash', totalBytes: 1,
        files: [{ path: 'SKILL.md', bytes: new TextEncoder().encode('---\nname: crash\ndescription: crash\n---\n\nBody\n') }],
      }, { id: 'custom:crash', origin: 'custom', version: '1' })
      expect(await store.readText(created.id, 'SKILL.md')).toContain('Body')
    }
    expect((await readdir(root)).filter(name => name.startsWith('.stage-') || name.startsWith('.removed-')))
      .toEqual([])
    expect(await readdir(root)).not.toContain('transaction.json')
  })
})

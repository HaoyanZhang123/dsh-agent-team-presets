/**
 * Real storage stack for member-snapshot tests: the storage hub, the JSON
 * backend, and the schema-validated domain form, exactly as the `dsh-base`
 * bundle composes them.
 *
 * Tests mount this instead of stubbing `storageDomain`, so a member snapshot is
 * proven to survive the medium the shipped bundle actually uses. A test that
 * wants to exercise the "no durable store" refusal simply does not mount it.
 * @module dsh-agent-team-presets/tests/fixtures/member-storage
 */

import type { Context } from '@deepseek-ai/cordis'
import Storage from '@deepseek-ai/dsh-storage'
import * as StorageJson from '@deepseek-ai/dsh-storage-json'
import * as StorageDomain from '@deepseek-ai/dsh-storage-domain'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

/** Handle on one mounted member storage stack. */
export interface MemberStorage {
  /** Directory the backend owns. */
  readonly root: string
  /** Path of the member unit document. */
  readonly unitPath: string
  /** Read the stored unit document, or undefined before the first write. */
  readUnit(): Promise<Record<string, unknown> | undefined>
}

/**
 * Mount the official storage hub, JSON backend, and domain form.
 * @param ctx - the test context to compose into.
 * @param root - directory the JSON backend owns.
 * @returns the handle used to inspect the stored document.
 */
export async function mountMemberStorage(ctx: Context, root: string): Promise<MemberStorage> {
  await ctx.plugin(Storage)
  await ctx.plugin(StorageJson, { root })
  await ctx.plugin(StorageDomain, { backend: 'json' })
  const unitPath = join(root, 'agent_team_presets_members.json')
  return {
    root,
    unitPath,
    readUnit: async () => {
      try {
        return JSON.parse(await readFile(unitPath, 'utf8')) as Record<string, unknown>
      } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
        throw error
      }
    },
  }
}

/**
 * Read every member record the unit currently holds.
 * @param storage - one mounted stack.
 * @returns the stored records, in unit order.
 */
export async function memberRecords(storage: MemberStorage): Promise<Record<string, unknown>[]> {
  const unit = await storage.readUnit()
  const table = (unit?.tables as Record<string, Record<string, unknown>> | undefined)?.members
  return Object.values(table ?? {})
}

/**
 * Read one member's stored snapshot by its exact teammate target.
 * @param storage - one mounted stack.
 * @param memberName - the exact teammate target.
 * @returns the stored record, or undefined when no creation recorded that name.
 */
export async function memberRecord(
  storage: MemberStorage,
  memberName: string,
): Promise<Record<string, unknown> | undefined> {
  return (await memberRecords(storage)).find(record => record.memberName === memberName)
}

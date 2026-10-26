/**
 * Whether an assigned Team Skill can actually reach the model.
 *
 * Registering a provider in one Agent scope is necessary but not sufficient: the
 * host publishes the model-facing catalog from `agent/pre-step`, and it reads
 * that catalog only while the exact `skill` tool definition stays visible to the
 * same Agent. A Team tool policy that excludes `skill` therefore leaves the
 * assignment installed and permanently invisible, which the model cannot
 * distinguish from "nothing was ever assigned".
 *
 * These cases run the real registry, the real tool and the real waterfall; a
 * stub would prove only that this file can call itself.
 */

import { afterEach, describe, expect, it } from 'vitest'
import { provideWorkingDirectoryFixture } from '@deepseek-ai/dsh-agent-loop-testkit'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { agentEvents, type Agent } from '@deepseek-ai/dsh-agent'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import { mountAgentLoopTestDependencies, mountAgentLoopTestHarness } from '@deepseek-ai/dsh-agent-loop-testkit'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import * as toolSkill from '@deepseek-ai/dsh-tool-skill'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { buildSkillPackage } from '../src/team-skills/import.ts'
import { TeamSkillManager } from '../src/team-skills/manager.ts'
import { TeamSkillRuntime } from '../src/team-skills/provider.ts'
import { TeamSkills } from '../src/team-skills/index.ts'
import { TeamSkillStore } from '../src/team-skills/store.ts'
import { inheritedFilter, policyOf } from '../src/tool-policy.ts'
import { toolMode } from '../src/presets.ts'
import { captainSlot, slot, team } from './fixtures/team-presets.ts'

const roots: string[] = []
const contexts: Context[] = []
afterEach(async () => {
  for (const ctx of contexts.splice(0)) await ctx.fiber.dispose()
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})

/** One legal skill folder with a distinctive body. */
const BODY = '---\nname: release-check\ndescription: Verify a release before tagging\n---\n\nFollow the release checklist.\n'

/** One stored asset identifier used by these cases. */
const ASSET_ID = 'custom:release-check'

/** Boot the smallest composition that can produce a real model-facing catalog. */
async function setup(): Promise<{ ctx: Context; root: string; agent: Agent }> {
  const ctx = new Context()
  contexts.push(ctx)
  const root = await mkdtemp(join(tmpdir(), "team-skill-visibility-"))
  roots.push(root)
  // The testkit already mounts SystemPrompt, ToolRuntime and AgentRegistry.
  await mountAgentLoopTestDependencies(ctx, { workingDirectory: true })
  await ctx.plugin(SkillRegistry)
  await ctx.plugin(toolSkill)
  // A second global tool, so an allow-list can keep the catalog while naming
  // something else, and lose the catalog when it omits the skill tool.
  await ctx.plugin({
    name: 'read-file-fixture',
    inject: ['tools'],
    apply: (inner: Context) => {
      inner.tools.register(defineTool({
        name: 'read_file',
        description: 'Read one file.',
        parameters: { path: { type: 'string', required: true } },
        output: { schema: { type: 'object', additionalProperties: true, properties: {} } },
        execute: async () => ({}),
      }))
    },
  })
  await mountAgentLoopTestHarness(ctx)
  const { agent } = await ctx.agents.create({ sessionId: 'root' as never, agentOptions: { provider: 'mock', model: 'mock' } })
  return { ctx, root, agent }
}

/** Install one asset and bind it to one Team role. */
async function bindAsset(root: string): Promise<{ store: TeamSkillStore; manager: TeamSkillManager }> {
  const store = new TeamSkillStore(root)
  await store.open()
  const built = buildSkillPackage([{ path: "SKILL.md", bytes: new TextEncoder().encode(BODY) }])
  if (!built.ok) throw new Error("fixture is not a legal skill")
  await store.install(built.skill, { id: ASSET_ID, origin: 'custom', version: '1' })
  const manager = new TeamSkillManager(store, root, {
    teams: () => [team([slot({ name: "reviewer" })], { name: "captain" })],
    activeAssetIds: () => new Set(), activeSessions: () => [],
  })
  await manager.open()
  await manager.assign({ teamId: 'team-1', roleId: 'reviewer', assetId: ASSET_ID })
  return { store, manager }
}

/** The skill names the host would put in front of this Agent. */
async function publishedSkillNames(ctx: Context, agent: Agent): Promise<string[]> {
  const decision = await agentEvents(ctx, agent).waterfall(
    'agent/pre-step',
    { messages: [], turn: 1, step: 1, signal: new AbortController().signal },
    () => Promise.resolve({ kind: 'enter' as const, messages: [] }),
  )
  if (decision.kind !== "enter") return []
  return decision.messages.flatMap((message) => {
    const source = message.source as { kind?: string; entries?: { name: string }[] } | undefined
    return source?.kind === 'skill-catalog' ? (source.entries ?? []).map(entry => entry.name) : []
  })
}

describe('an assigned Team Skill reaches the model', () => {
  it('publishes the assigned name while the skill tool stays visible', async () => {
    const { ctx, root, agent } = await setup()
    const { store, manager } = await bindAsset(root)
    const runtime = new TeamSkillRuntime(ctx, store, () => {})
    await runtime.sync({ agent, assets: manager.assetsFor('team-1', 'reviewer') })
    expect(await publishedSkillNames(ctx, agent)).toContain("release-check")
  })

  it('publishes nothing once a Team policy hides the skill tool', async () => {
    const { ctx, root, agent } = await setup()
    const { store, manager } = await bindAsset(root)
    const runtime = new TeamSkillRuntime(ctx, store, () => {})
    await runtime.sync({ agent, assets: manager.assetsFor('team-1', 'reviewer') })
    // The real restriction path an applied Team installs: an allow-list that
    // names the skill tool keeps the catalog; one that omits it removes it.
    const withoutSkill = inheritedFilter(agent, policyOf('team-1', slot({ toolMode: 'custom', tools: ['read_file'] })))
    const hidden = agent.ctx.tools.restrict({ allow: ["read_file"] })
    expect(await publishedSkillNames(ctx, agent)).not.toContain("release-check")
    hidden()
    expect(withoutSkill?.allow ?? []).not.toContain("skill")
    expect(await publishedSkillNames(ctx, agent)).toContain("release-check")
  })

  it('refuses to bind a skill to a role whose allow-list hides the skill tool', async () => {
    const { root } = await setup()
    const store = new TeamSkillStore(root)
    await store.open()
    const built = buildSkillPackage([{ path: "SKILL.md", bytes: new TextEncoder().encode(BODY) }])
    if (!built.ok) throw new Error("fixture is not a legal skill")
    await store.install(built.skill, { id: ASSET_ID, origin: 'custom', version: '1' })
    const manager = new TeamSkillManager(store, root, {
      teams: () => [team([
        slot({ name: "hidden", id: "hidden", toolMode: "custom", tools: ["read_file"] }),
        slot({ name: "visible", id: "visible", toolMode: "custom", tools: ["read_file", "skill"] }),
        slot({ name: "open", id: "open" }),
      ], { name: "captain" })],
      activeAssetIds: () => new Set(), activeSessions: () => [],
    })
    await manager.open()
    const refused = await manager.assign({ teamId: "team-1", roleId: "hidden", assetId: ASSET_ID })
    expect(refused.ok).toBe(false)
    if (refused.ok) throw new Error("unreachable")
    expect(refused.reason).toContain("skill-tool-hidden")
    expect(refused.reason).toContain("skill")
    // The same asset binds normally wherever the catalog stays reachable.
    expect((await manager.assign({ teamId: "team-1", roleId: "visible", assetId: ASSET_ID })).ok).toBe(true)
    expect((await manager.assign({ teamId: "team-1", roleId: "open", assetId: ASSET_ID })).ok).toBe(true)
    expect(manager.list().map(row => row.roleId).sort()).toEqual(["open", "visible"])
  })

  it('resolves syncAgent only after the provider is registered', async () => {
    const { ctx, root, agent } = await setup()
    const { store, manager } = await bindAsset(root)
    const subsystem = new TeamSkills(
      ctx, root, () => [team([slot({ name: "reviewer" })], { name: "captain" })],
      () => {},
    )
    await subsystem.open(() => {})
    // Publication must already hold on the awaited edge: a member that starts
    // its first request before this resolves would see an empty catalog.
    await subsystem.syncAgent(agent, { teamId: "team-1", roleId: "reviewer", captain: false })
    expect(await publishedSkillNames(ctx, agent)).toContain("release-check")
    expect(subsystem.manager.list().length).toBeGreaterThan(0)
    await subsystem.close()
    expect(store.list().length).toBeGreaterThan(0)
  })
})

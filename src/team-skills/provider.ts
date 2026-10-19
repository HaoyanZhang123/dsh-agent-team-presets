/**
 * Per-member Team Skill visibility.
 *
 * The one rule this module exists to enforce: a Team Skill is visible to the
 * exact Agent it was assigned to, and to nobody else. The DSH skill registry is
 * layered by Cordis scope, and a read merges the global layer with the viewing
 * Agent's own chain, so registering a provider *inside a scope keyed by that
 * Agent* is what makes the assignment real. Registering on the plugin context
 * would put the provider in the global layer and expose it to every Session in
 * the deployment — the failure mode v0.1.6 exists to remove.
 *
 * Registration is therefore a lifecycle, not a startup step: it happens when the
 * assigned Agent is created or resumed, and it is disposed when that Agent is
 * disposed. Only the candidate list is scoped — a skill's body is read when the
 * model actually loads it, so discovery costs a name and a description.
 * @module dsh-agent-team-presets/team-skills/provider
 */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { createScope } from '@deepseek-ai/dsh-scope'
import type { Scope } from '@deepseek-ai/dsh-scope'
import type { SkillCandidate, SkillProvider } from '@deepseek-ai/dsh-skill'
import type { TeamSkillAsset } from '../types.ts'
import type { TeamSkillStore } from './store.ts'

/** Provider name this plugin registers inside one Agent's scope. */
export const TEAM_SKILL_PROVIDER = 'dsh-team-skills'

/**
 * Precedence rank of a Team Skill.
 *
 * The standard packaged-provider rank: a Team Skill competes at the same level
 * as a bundled provider, while project and user skill providers keep winning a
 * same-name conflict by rank. Isolation is provided by the scope layer, not by
 * outranking anyone, so this plugin never shadows a user's own skill.
 */
const TEAM_SKILL_RANK = 600

/** What one Agent's registration needs. */
export interface AgentSkillBinding {
  /** The Agent whose scope receives the provider. */
  readonly agent: Agent
  /** Assets assigned to that Agent's role. */
  readonly assets: readonly TeamSkillAsset[]
}

/** One live registration and the exact disposers that release it. */
interface LiveRegistration {
  readonly scope: Scope
  readonly assets: readonly TeamSkillAsset[]
  /** The exact provider disposer; calling it unregisters discovery in this turn. */
  readonly disposeProvider: () => void
  /** The `inject` fiber that minted the scope; disposing it unwinds the registration. */
  readonly disposeInject: ReturnType<Context['inject']>
}

/**
 * A provider that lists assigned assets and loads their bodies on demand.
 * @param assets - the assets this Agent was assigned.
 * @param store - the store the bodies are read from.
 * @returns the provider to register in the Agent's scope.
 */
function providerFor(assets: readonly TeamSkillAsset[], store: TeamSkillStore): SkillProvider {
  const candidates: SkillCandidate[] = assets.map(asset => ({
    name: asset.skillId,
    description: asset.description,
    invocation: { modelInvocable: true, userInvocable: true },
    provider: TEAM_SKILL_PROVIDER,
    source: 'custom',
    rank: TEAM_SKILL_RANK,
    // The version-pinned directory, so an edit that publishes a new version
    // cannot change the bytes a running member reads.
    resourceBase: { kind: 'directory', path: store.assetPath(asset.id, asset.version) },
    locator: { assetId: asset.id, version: asset.version },
  }))
  const byName = new Map(assets.map(asset => [asset.skillId, asset]))
  return {
    name: TEAM_SKILL_PROVIDER,
    list: () => Promise.resolve(candidates),
    get: async (candidate: SkillCandidate) => {
      const asset = byName.get(candidate.name)
      if (asset === undefined) return undefined
      const body = await store.readText(asset.id, 'SKILL.md')
      return {
        name: asset.skillId,
        description: asset.description,
        invocation: candidate.invocation,
        provider: TEAM_SKILL_PROVIDER,
        source: 'custom',
        ...candidate.resourceBase === undefined ? {} : { resourceBase: candidate.resourceBase },
        content: stripFrontmatter(body),
      }
    },
  }
}

/**
 * Remove the YAML frontmatter from one skill body.
 *
 * The registry renders the body, not the document; the frontmatter has already
 * been surfaced as the candidate's name and description.
 * @param text - the whole `SKILL.md`.
 * @returns the instruction body.
 */
export function stripFrontmatter(text: string): string {
  const match = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/u.exec(text)
  return match === null ? text.trim() : text.slice(match[0].length).trim()
}

/** Installs and releases per-Agent Team Skill providers. */
export class TeamSkillRuntime {
  private readonly live = new Map<Agent, LiveRegistration>()
  /** The assignment each Agent is *supposed* to have, authoritative immediately. */
  private readonly desired = new Map<Agent, readonly TeamSkillAsset[]>()
  private readonly store: TeamSkillStore
  private disposed = false

  /**
   * @param ctx - the plugin context scopes are minted under.
   * @param store - the asset store bodies are read from.
   * @param log - receives diagnostic text when a registration cannot be made.
   */
  constructor(
    private readonly ctx: Context,
    store: TeamSkillStore,
    private readonly log: (message: string) => void,
  ) {
    this.store = store
  }

  /**
   * Whether this deployment can scope skill providers at all.
   * @returns whether the skill service is composed and exposes a provider registry.
   */
  get available(): boolean {
    const skills = this.ctx.get('skills') as { registerProvider?: unknown } | undefined
    return skills !== undefined && typeof skills.registerProvider === 'function'
  }

  /**
   * Install or replace one Agent's registration.
   *
   * An empty assignment releases any previous registration, so removing the
   * last skill from a role takes effect on the next turn instead of leaving a
   * stale provider behind.
   *
   * `inject` runs its callback once the service is readable, which may be a
   * later tick than this call, so the intended assignment is recorded first and
   * the actual scope is installed by the callback. The callback re-checks the
   * intent before installing, because a second assignment may have replaced it
   * meanwhile.
   * @param binding - the Agent and the assets it should see.
   * @returns resolution once the registration is installed (or immediately when
   *   there is nothing to install). Callers that drive a UI may await it; the
   *   runtime lifecycle does not, because the intent is authoritative at once.
   */
  async sync(binding: AgentSkillBinding): Promise<void> {
    if (this.disposed) return
    this.release(binding.agent)
    this.desired.set(binding.agent, binding.assets)
    if (binding.assets.length === 0) return
    if (!this.available) {
      this.log('the skill service is not composed, so Team Skills stay unavailable in this deployment')
      return
    }
    let settle: () => void = () => {}
    const installed = new Promise<void>((resolve) => { settle = resolve })
    this.pendingSettle.set(binding.agent, settle)
    const disposeInject = this.ctx.inject(['skills'], (injected) => {
      settle()
      const intended = this.desired.get(binding.agent)
      if (this.disposed || intended !== binding.assets || intended === undefined || intended.length === 0) return
      // A scope keyed by the Agent itself is exactly the layer the host's
      // `skill` tool reads when it passes `scope: exec.agent`.
      const minted = createScope(injected, binding.agent)
      let disposeProvider: () => void
      try {
        disposeProvider = minted.ctx.skills.registerProvider(() => providerFor(intended, this.store))
      } catch (error: unknown) {
        void minted.dispose()
        this.log(`Team Skills could not be scoped to one Agent: ${String(error)}`)
        return
      }
      this.live.set(binding.agent, { scope: minted, assets: intended, disposeProvider, disposeInject })
      return () => {}
    })
    // The inject fiber is released with the scope on the next `release`, so it
    // is kept even while the callback has not run yet.
    this.pendingInject.set(binding.agent, disposeInject)
    await installed
  }

  /** Settlers for assignments whose `inject` callback has not run yet. */
  private readonly pendingSettle = new Map<Agent, () => void>()

  /** The inject fibers, which own the scope's registration lifetime. */
  private readonly pendingInject = new Map<Agent, ReturnType<Context['inject']>>()

  /**
   * Release one Agent's registration.
   * @param agent - the Agent whose scope is released.
   * @returns after the scope is disposed.
   */
  release(agent: Agent): void {
    this.desired.delete(agent)
    this.pendingSettle.get(agent)?.()
    this.pendingSettle.delete(agent)
    const pending = this.pendingInject.get(agent)
    this.pendingInject.delete(agent)
    const registration = this.live.get(agent)
    this.live.delete(agent)
    // The exact provider disposer runs synchronously, which is what a release
    // has to guarantee: a member that is gone must not stay discoverable for a
    // later turn. The scope itself is unwound on the next microtask.
    if (registration !== undefined) {
      registration.disposeProvider()
      void registration.scope.rawDispose()
    }
    if (pending !== undefined) void pending.dispose()
  }

  /**
   * The assets currently registered for one Agent.
   * @param agent - the Agent to inspect.
   * @returns the registered assets, for the runtime's own diagnostics.
   */
  assetsOf(agent: Agent): readonly TeamSkillAsset[] {
    return this.desired.get(agent) ?? []
  }

  /**
   * Every asset identifier a live assignment is serving.
   *
   * This is the fact a delete has to consult: a running member reading this
   * version must not have its resources removed underneath it. The intended
   * assignment counts even before its scope is minted, because the member is
   * already live and about to read.
   * @returns the live asset identifiers.
   */
  activeAssetIds(): ReadonlySet<string> {
    const ids = new Set<string>()
    for (const assets of this.desired.values()) {
      for (const asset of assets) ids.add(asset.id)
    }
    return ids
  }

  /**
   * Labels of the Agents a live assignment is serving one asset for.
   *
   * A session names the Agent that owns the registration, so a refused delete can
   * say *who* is holding the skill instead of a generic phrase.
   * @param assetId - asset identity.
   * @returns one label per live holder, sorted for a stable message.
   */
  activeLabels(assetId: string): string[] {
    const labels: string[] = []
    for (const [agent, assets] of this.desired) {
      if (!assets.some(asset => asset.id === assetId)) continue
      const id = (agent as unknown as { id?: unknown }).id
      labels.push(typeof id === 'string' && id !== '' ? id : 'an active member')
    }
    return labels.sort((left, right) => left.localeCompare(right))
  }

  /**
   * Release every registration and refuse later ones.
   * @returns after every scope is disposed.
   */
  async dispose(): Promise<void> {
    this.disposed = true
    const registrations = [...this.live.values()]
    const pending = [...this.pendingInject.values()]
    this.live.clear()
    this.pendingInject.clear()
    this.desired.clear()
    await Promise.allSettled(registrations.map((registration) => {
      registration.disposeProvider()
      return registration.scope.dispose()
    }))
    for (const fiber of pending) void fiber.dispose()
  }
}

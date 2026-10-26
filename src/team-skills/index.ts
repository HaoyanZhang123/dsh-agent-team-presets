/**
 * The Team Skill subsystem as one object the plugin lifecycle drives.
 *
 * This module is the seam between the plugin and the store/manager/provider
 * trio: it resolves the private root, loads the shipped skills, and answers the
 * two lifecycle questions the runtime asks — "what does this role get?" and
 * "this Agent is gone, release it".
 *
 * The private root is resolved from the Harness home the deployment itself uses
 * (`$DSH_HOME`, else `~/.dsh`) under a plugin-owned directory. v0.2.1-rc.2
 * publishes no per-plugin data-directory API, so this is a documented
 * derivation rather than a guess about a global skill directory: it is never a
 * user or project skill folder, it is never scanned by the host's own skill
 * providers, and an explicit `skillRoot` config value always wins.
 * @module dsh-agent-team-presets/team-skills
 */

import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readdir } from 'node:fs/promises'
import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { TeamSkillManager, CAPTAIN_ROLE } from './manager.ts'
import { TeamSkillRuntime } from './provider.ts'
import { TeamSkillStore } from './store.ts'
import type { TeamSkillAsset, TeamPreset } from '../types.ts'
import { memberTargets } from '../presets.ts'

/** The skills the package ships under `assets/skills`. */
export const OFFICIAL_SKILL_IDS = [
  'github-repository-presentation',
  'git-release-hygiene',
  'grilling',
  'research',
] as const

/** Version stamped on the shipped assets; bumped when the packaged copies change. */
export const OFFICIAL_SKILL_VERSION = '1'

/**
 * Resolve the private Team Skill root.
 * @param configured - an explicit `skillRoot` from the plugin config, when set.
 * @returns the absolute root directory.
 */
export function resolveSkillRoot(configured: string | undefined): string {
  // A hand-written Config (a test double, an older embedding) may predate the
  // field; deriving the default is always correct, so it is not an error.
  if (configured !== undefined && configured.trim() !== '') return configured
  const home = process.env['DSH_HOME'] !== undefined && process.env['DSH_HOME'] !== ''
    ? process.env['DSH_HOME']
    : join(homedir(), '.dsh')
  return join(home, 'agent-team-presets', 'team-skills')
}

/**
 * Locate the shipped skill documents inside this package.
 * @returns the absolute `assets/skills` directory.
 */
export function officialSkillDirectory(): string {
  // Built output lives in `lib/`, one level below the package root.
  return join(dirname(dirname(fileURLToPath(import.meta.url))), 'assets', 'skills')
}

/** What the plugin runtime needs to know about one Team role. */
export interface TeamSkillRole {
  /** Team identity the role belongs to. */
  readonly teamId: string
  /** Role identity, or {@link CAPTAIN_ROLE}. */
  readonly roleId: string
  /** Whether this is the captain slot. */
  readonly captain: boolean
}

/**
 * Resolve the role identity one live member belongs to.
 *
 * The member's own durable snapshot names the role, and the roster gives the
 * teammate target; a role without a stored identity falls back to its display
 * name, which is how shipped presets identify their members.
 * @param team - the Team the member belongs to.
 * @param memberTarget - the target the captain summoned it under.
 * @returns the role identity, or undefined when the target matches no member.
 */
export function roleOfMember(team: TeamPreset, memberTarget: string): string | undefined {
  const row = memberTargets(team).find(candidate => candidate.target === memberTarget)
  if (row === undefined) return undefined
  return row.member.id ?? row.member.name
}

/** The Team Skill subsystem, ready for the runtime to drive. */
export class TeamSkills {
  /** The asset store. */
  readonly store: TeamSkillStore
  /** The binding table and its delete guards. */
  readonly manager: TeamSkillManager
  /** The per-Agent provider lifecycle. */
  readonly runtime: TeamSkillRuntime
  /** Shipped skill ids this deployment actually provides. */
  official: readonly string[] = []
  /** Retain a degraded-start reason for both GUI and tool callers. */
  issue: string | undefined
  private opened = false
  private readonly syncGeneration = new WeakMap<Agent, number>()
  private closed = false
  private readonly log: (message: string) => void

  /**
   * @param ctx - the plugin context.
   * @param root - absolute private root directory.
   * @param teams - reads the Teams the page currently shows.
   * @param log - diagnostic sink.
   */
  constructor(
    ctx: Context,
    readonly root: string,
    teams: () => readonly TeamPreset[],
    log: (message: string) => void,
  ) {
    this.log = log
    this.store = new TeamSkillStore(root)
    this.runtime = new TeamSkillRuntime(ctx, this.store, log)
    this.manager = new TeamSkillManager(this.store, root, {
      teams,
      activeAssetIds: () => this.runtime.activeAssetIds(),
      // The Agent that owns the registration is the only identity this layer can
      // name truthfully; it is what the delete refusal lists.
      activeSessions: assetId => this.runtime.activeLabels(assetId),
    })
  }

  /**
   * Load the registry, the bindings, and the shipped skills.
   *
   * Every failure is reported rather than thrown: a deployment whose store
   * cannot open must still serve its Teams.
   * @param log - diagnostic sink for a degraded start.
   * @returns whether the subsystem is usable.
   */
  async open(log: (message: string) => void): Promise<boolean> {
    if (this.opened) return true
    try {
      await this.store.open()
      await this.manager.open()
      const directory = officialSkillDirectory()
      const entries: { skillId: string; directory: string; version: string }[] = []
      for (const skillId of OFFICIAL_SKILL_IDS) {
        // A package built without the shipped skills is a valid deployment: the
        // Teams work, only the official skills are absent.
        try {
          await readdir(join(directory, skillId))
          entries.push({ skillId, directory: join(directory, skillId), version: OFFICIAL_SKILL_VERSION })
        } catch {
          log(`the shipped skill "${skillId}" is not present in this installation`)
        }
      }
      this.official = entries.map(entry => entry.skillId)
      const warnings: string[] = []
      const changed = await this.store.ensureOfficial(entries, warnings)
      for (const warning of warnings) log(warning)
      if (changed.length > 0) log(`Team Skill store updated: ${changed.join(', ')}`)
      await this.manager.reconcile()
      this.opened = true
      this.issue = undefined
      return true
    } catch (error: unknown) {
      this.issue = `Team Skills are unavailable in this deployment: ${String(error)}`
      log(this.issue)
      return false
    }
  }

  /**
   * Resolve the assets one role receives.
   * @param role - Team and role identity.
   * @returns the bound assets that still exist.
   */
  assetsForRole(role: TeamSkillRole): TeamSkillAsset[] {
    return this.manager.assetsFor(role.teamId, role.roleId)
  }

  /**
   * Apply one Agent's assignment, installing or releasing its provider.
   * @param agent - the Agent whose scope is synchronized.
   * @param role - the role it fills, or undefined when it fills none.
   * @returns after the registration matches the current bindings.
   */
  /**
   * Install one Agent's assignment, resolving once the registration exists.
   *
   * Resolving matters at a creation edge: the host reads the model-facing
   * catalog from a step boundary, and an Agent that starts before the provider
   * is registered spends its first turn believing nothing was assigned. A
   * caller at a creation edge awaits this; a caller reacting to an edited
   * setting does not need to, because that Agent is already running.
   * @param agent - the Agent whose visible skills change.
   * @param role - the assignment, or undefined to release the registration.
   * @returns after the intended registration is installed.
   */
  async syncAgent(agent: Agent, role: TeamSkillRole | undefined): Promise<void> {
    if (!this.opened) return
    const generation = (this.syncGeneration.get(agent) ?? 0) + 1
    this.syncGeneration.set(agent, generation)
    const installed = this.runtime.sync({ agent, assets: role === undefined ? [] : this.assetsForRole(role) })
    void this.manager.reconcile().then(() => {
      if (this.closed || this.syncGeneration.get(agent) !== generation) return
      this.runtime.sync({ agent, assets: role === undefined || !this.manager.hasRole(role.teamId, role.roleId) ? [] : this.assetsForRole(role) })
    }).catch(error => this.log(`Team Skill reconciliation failed: ${String(error)}`))
    await installed
  }

  /**
   * Release one Agent's registration.
   * @param agent - the disposed Agent.
   */
  releaseAgent(agent: Agent): void {
    this.syncGeneration.set(agent, (this.syncGeneration.get(agent) ?? 0) + 1)
    this.runtime.release(agent)
  }

  /**
   * Re-apply every assignment after the bindings changed.
   * @param registered - every live Agent and the role it fills.
   */
  resync(registered: readonly { agent: Agent; role: TeamSkillRole | undefined }[]): void {
    for (const row of registered) this.syncAgent(row.agent, row.role)
  }

  /** Release the whole subsystem. */
  async close(): Promise<void> {
    this.closed = true
    await this.runtime.dispose()
  }
}

export { CAPTAIN_ROLE }

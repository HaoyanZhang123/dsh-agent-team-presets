/**
 * Who receives which Team Skill, and what may not be deleted.
 *
 * A Team is the organizing container, but the smallest unit that actually takes
 * effect is a member: `teamId + roleId`, with the captain stored under its own
 * role slot so a captain assignment can never be mistaken for a member's. The
 * bindings live in their own document beside the asset registry, never inside a
 * Team preset, because a role assignment is a local preference and a preset
 * document is shared.
 *
 * Deletion is guarded here rather than in the page, so the Agent-facing path
 * and the visual path cannot disagree about whether a delete is allowed. Three
 * independent reasons block it: a role still binds the asset, a live member is
 * running on it, or another asset declares it as a dependency. A text-scan hit
 * is only a warning — static scanning of Markdown and scripts cannot prove a
 * reference, and pretending otherwise would either block legitimate deletes or
 * hide a real one.
 * @module dsh-agent-team-presets/team-skills/manager
 */

import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { delimiter, join } from 'node:path'
import { constants } from 'node:fs'
import type {
  TeamSkillAsset, TeamSkillBinding, TeamSkillBindingSummary, TeamSkillDeleteBlocker,
} from '../types.ts'
import type { TeamPreset } from '../types.ts'
import type { TeamSkillStore } from './store.ts'

/** Bindings document revision this build understands. */
const BINDINGS_VERSION = 1

/** The role slot the captain is stored under. */
export const CAPTAIN_ROLE = 'captain'

/** One bindings document. */
interface BindingsDocument {
  readonly version: number
  readonly bindings: readonly TeamSkillBinding[]
}

/** What the manager needs from the rest of the plugin to answer a delete. */
export interface TeamSkillGuardContext {
  /** Teams the page currently shows, for dependency labels. */
  readonly teams: () => readonly TeamPreset[]
  /** Asset identifiers a live member or Session is currently reading. */
  readonly activeAssetIds: () => ReadonlySet<string>
  /** Live Session labels running a member on one asset, for the refusal. */
  readonly activeSessions: (assetId: string) => readonly string[]
}

/** Why one assignment was refused. */
export type TeamSkillAssignFailure = 'unknown-asset' | 'unknown-role' | 'asset-missing'

/** Result of one assignment attempt. */
export type TeamSkillAssignResult =
  | { readonly ok: true; readonly binding: TeamSkillBinding }
  | { readonly ok: false; readonly reason: TeamSkillAssignFailure }

/** Deletion outcome carrying every blocking reason at once. */
export interface TeamSkillDeleteOutcome {
  readonly ok: boolean
  readonly blockers: readonly TeamSkillDeleteBlocker[]
  readonly warnings: readonly string[]
}

/** The Team Skill library plus its role bindings. */
export class TeamSkillManager {
  private bindings: TeamSkillBinding[] = []
  private revision = 0
  private opened = false
  private readonly guards: TeamSkillGuardContext

  /**
   * @param store - the asset store this manager binds assets from.
   * @param root - the same private root the store uses.
   * @param guards - live facts a delete has to consult.
   */
  constructor(
    private readonly store: TeamSkillStore,
    private readonly root: string,
    guards: TeamSkillGuardContext,
  ) {
    this.guards = guards
  }

  /** Binding revision, bumped by every assignment change. */
  get bindingRevision(): number {
    return this.revision
  }

  /**
   * Read the bindings document.
   *
   * A malformed document refuses the open instead of starting empty: silently
   * dropping every assignment would make each member lose its skills with no
   * explanation.
   * @returns after the table is loaded.
   */
  async open(): Promise<void> {
    if (this.opened) return
    try {
      const raw = await readFile(join(this.root, 'bindings.json'), 'utf8')
      const parsed = JSON.parse(raw) as Partial<BindingsDocument>
      if (parsed.version !== BINDINGS_VERSION || !Array.isArray(parsed.bindings)) {
        throw new Error(`the Team Skill bindings at ${this.root} have an unexpected layout; refusing to guess at them`)
      }
      this.bindings = [...parsed.bindings]
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
    this.opened = true
  }

  /** Every binding, in a stable order. */
  list(): readonly TeamSkillBinding[] {
    return [...this.bindings].sort((left, right) => left.teamId.localeCompare(right.teamId) || left.roleId.localeCompare(right.roleId))
  }

  /**
   * Assign one asset to one role slot.
   * @param input - team, role, and asset.
   * @returns the stored binding or the reason it was refused.
   */
  async assign(input: { teamId: string; roleId: string; assetId: string; captain?: boolean }): Promise<TeamSkillAssignResult> {
    if (this.store.get(input.assetId) === undefined) return { ok: false, reason: 'unknown-asset' }
    const binding: TeamSkillBinding = {
      teamId: input.teamId,
      roleId: input.roleId,
      assetId: input.assetId,
      ...input.captain === true ? { captain: true } : {},
    }
    // A role may hold several skills, so only the same asset is replaced; the
    // slot is not exclusive.
    this.bindings = [
      ...this.bindings.filter(row => !(row.teamId === binding.teamId && row.roleId === binding.roleId && row.assetId === binding.assetId)),
      binding,
    ]
    await this.flush()
    return { ok: true, binding }
  }

  /**
   * Remove the assignment of one role slot.
   * @param teamId - Team identity.
   * @param roleId - role identity, or {@link CAPTAIN_ROLE}.
   * @returns whether a binding was removed.
   */
  async unassign(teamId: string, roleId: string, assetId?: string): Promise<boolean> {
    const next = this.bindings.filter(row => !(row.teamId === teamId && row.roleId === roleId
      && (assetId === undefined || row.assetId === assetId)))
    if (next.length === this.bindings.length) return false
    this.bindings = next
    await this.flush()
    return true
  }

  /**
   * Drop every binding of one Team, used when a Team is deleted.
   * @param teamId - Team identity.
   * @returns the number of removed bindings.
   */
  async unassignTeam(teamId: string): Promise<number> {
    const next = this.bindings.filter(row => row.teamId !== teamId)
    const removed = this.bindings.length - next.length
    if (removed === 0) return 0
    this.bindings = next
    await this.flush()
    return removed
  }

  /**
   * Resolve the assets one role receives.
   * @param teamId - Team identity.
   * @param roleId - role identity.
   * @returns the bound assets that still exist.
   */
  assetsFor(teamId: string, roleId: string): TeamSkillAsset[] {
    return this.bindings
      .filter(row => row.teamId === teamId && row.roleId === roleId)
      .map(row => this.store.get(row.assetId))
      .filter((asset): asset is TeamSkillAsset => asset !== undefined)
  }

  /**
   * Describe the roles currently bound to one asset.
   * @param assetId - asset identity.
   * @returns one row per binding, with the Team and role names for the dialog.
   */
  bindingSummaries(assetId: string): TeamSkillBindingSummary[] {
    const teams = this.guards.teams()
    return this.bindings
      .filter(row => row.assetId === assetId)
      .map((row) => {
        const team = teams.find(candidate => candidate.id === row.teamId)
        const member = team?.members.find(candidate => (candidate.id ?? '') === row.roleId)
        return {
          teamId: row.teamId,
          teamName: team?.name ?? row.teamId,
          roleId: row.roleId,
          roleName: row.captain === true || row.roleId === CAPTAIN_ROLE
            ? (team?.captain.name ?? CAPTAIN_ROLE)
            : (member?.name ?? row.roleId),
          captain: row.captain === true || row.roleId === CAPTAIN_ROLE,
        }
      })
      .sort((left, right) => left.teamName.localeCompare(right.teamName) || left.roleName.localeCompare(right.roleName))
  }

  /**
   * Delete one asset, refusing while anything still depends on it.
   *
   * Every blocking reason is collected before refusing, so the dialog can list
   * all of them instead of revealing one per attempt.
   * @param assetId - asset identity.
   * @returns the outcome, with blockers when it was refused.
   */
  async remove(assetId: string): Promise<TeamSkillDeleteOutcome> {
    const asset = this.store.get(assetId)
    if (asset === undefined) return { ok: true, blockers: [], warnings: [] }
    const blockers: TeamSkillDeleteBlocker[] = []
    const warnings: string[] = []
    if (asset.origin === 'builtin') blockers.push({ kind: 'official' })
    const bindings = this.bindingSummaries(assetId)
    if (bindings.length > 0) blockers.push({ kind: 'binding', bindings })
    const sessions = this.guards.activeSessions(assetId)
    if (sessions.length > 0) blockers.push({ kind: 'active', sessions })
    const dependents = this.store.list()
      .filter(candidate => candidate.id !== assetId && candidate.dependencies.otherSkills.includes(assetId))
      .map(candidate => candidate.id)
    if (dependents.length > 0) blockers.push({ kind: 'dependency', dependents })
    // A text hit is advisory: it may be a genuine cross-reference or a mention
    // in prose, and only the user can tell which.
    for (const other of this.store.list()) {
      if (other.id === assetId) continue
      const mentions = await this.mentionsAsset(other.id, asset.skillId)
      if (mentions.length > 0) warnings.push(`${other.id} (${other.skillId}): ${mentions.join(', ')}`)
    }
    if (blockers.length > 0) return { ok: false, blockers, warnings }
    await this.store.remove(assetId)
    // A delete that succeeds cannot leave a dangling binding behind.
    const next = this.bindings.filter(row => row.assetId !== assetId)
    if (next.length !== this.bindings.length) {
      this.bindings = next
      await this.flush()
    }
    return { ok: true, blockers: [], warnings }
  }

  /**
   * Find text mentions of one skill name inside another asset.
   * @param assetId - asset whose files are scanned.
   * @param skillId - the name to look for.
   * @returns the matching relative paths.
   */
  private async mentionsAsset(assetId: string, skillId: string): Promise<string[]> {
    const asset = this.store.get(assetId)
    if (asset === undefined) return []
    const hits: string[] = []
    for (const file of asset.files) {
      if (!file.text) continue
      try {
        const text = await this.store.readText(assetId, file.path)
        if (text.includes(skillId)) hits.push(file.path)
      } catch {
        // A file that cannot be read is not evidence of a mention.
      }
    }
    return hits
  }

  /**
   * Resolve one asset's declared executables against the current PATH.
   *
   * Only executables can be checked truthfully from here: an MCP server is a
   * composition-level plugin, so this reports it as *declared* rather than
   * pretending it is connected. A missing executable is a real fact, and the
   * page shows it beside the dependency that asked for it.
   * @param assetId - asset identity.
   * @returns one row per declared executable, plus the declared MCP servers.
   */
  async dependencyReport(assetId: string): Promise<{ executables: { name: string; found: boolean }[]; mcpServers: string[] }> {
    const asset = this.store.get(assetId)
    if (asset === undefined) return { executables: [], mcpServers: [] }
    const directories = (process.env['PATH'] ?? '').split(delimiter).filter(entry => entry !== '')
    const executables: { name: string; found: boolean }[] = []
    for (const name of asset.dependencies.executables) {
      let found = false
      for (const directory of directories) {
        try {
          await access(join(directory, name), constants.X_OK)
          found = true
          break
        } catch {
          // Not in this directory; keep looking.
        }
      }
      executables.push({ name, found })
    }
    return { executables, mcpServers: [...asset.dependencies.mcpServers.map(server => server.serverName)] }
  }

  /**
   * Whether an asset is currently referenced by any role.
   * @param assetId - asset identity.
   * @returns whether at least one binding points at it.
   */
  isBound(assetId: string): boolean {
    return this.bindings.some(row => row.assetId === assetId)
  }

  /**
   * Delete one Team's bindings and its asset-independent bookkeeping.
   * @param teamId - Team identity.
   * @returns the number of removed bindings.
   */
  async forgetTeam(teamId: string): Promise<number> {
    return this.unassignTeam(teamId)
  }

  /**
   * Persist the bindings document atomically enough for a UI write.
   * @returns after the document is on disk.
   */
  private async flush(): Promise<void> {
    await mkdir(this.root, { recursive: true })
    const document: BindingsDocument = { version: BINDINGS_VERSION, bindings: this.list() }
    const path = join(this.root, 'bindings.json')
    const temporary = `${path}.${String(process.pid)}.tmp`
    await writeFile(temporary, `${JSON.stringify(document, null, 2)}\n`, 'utf8')
    await rm(path, { force: true })
    await writeFile(path, `${JSON.stringify(document, null, 2)}\n`, 'utf8')
    await rm(temporary, { force: true })
    this.revision += 1
  }
}

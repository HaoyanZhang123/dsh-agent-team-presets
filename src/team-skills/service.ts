/**
 * The settings page's view of the private Team Skill library.
 *
 * Every judgement stays in the manager and the store: this service only shapes
 * their answers for a Remote call, so the page and any Agent-facing tool cannot
 * disagree about whether an import is safe, a delete is allowed, or a role may
 * receive an asset. The one thing it adds is the roster a binding dialog needs —
 * the Teams the page already shows, with their role identities.
 * @module dsh-agent-team-presets/team-skills/service
 */

import { Context } from '@deepseek-ai/cordis'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import { buildSkillPackage, decodeImportFiles } from './import.ts'
import { CAPTAIN_ROLE, TeamSkillManager } from './manager.ts'
import { TeamSkillStore } from './store.ts'
import type {
  TeamPreset, TeamSkillAssetView, TeamSkillDeleteView, TeamSkillDetailView, TeamSkillImportFile,
  TeamSkillLibraryView, TeamSkillRefusalView, TeamSkillTeamView,
} from '../types.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Remote management surface for the private Team Skill library. */
    teamSkills: TeamSkillService
  }
}

/** Configuration of {@link TeamSkillService}. */
export interface TeamSkillServiceConfig {
  /** The asset store. */
  readonly store: TeamSkillStore
  /** The binding table and its delete guards. */
  readonly manager: TeamSkillManager
  /** The Teams the page shows, read live from Settings. */
  readonly teams: () => readonly TeamPreset[]
  /** Shipped skill ids this deployment provides. */
  readonly official: readonly string[]
  /** Re-applies every live Agent after a binding changed. */
  readonly resync: () => void
}

/** Blank instruction text a freshly created skill starts from. */
const TEMPLATE = '---\nname: SKILL-ID\ndescription: Describe when this method applies.\n---\n\n# Method\n\nDescribe the steps to follow.\n'

/**
 * Remote management surface over the private Team Skill library.
 */
export class TeamSkillService extends TypertRemoteService {
  /**
   * @param ctx - the owning plugin context.
   * @param config - the store, the manager, and the live roster.
   */
  constructor(ctx: Context, private readonly config: TeamSkillServiceConfig) {
    super(ctx, 'teamSkills')
  }

  /**
   * Shape one asset for the page.
   * @param assetId - asset identity.
   * @returns the row, or undefined when it no longer exists.
   */
  private row(assetId: string): TeamSkillAssetView | undefined {
    const asset = this.config.store.get(assetId)
    if (asset === undefined) return undefined
    return {
      id: asset.id,
      skillId: asset.skillId,
      description: asset.description,
      origin: asset.origin,
      version: asset.version,
      ...asset.officialSkillId === undefined ? {} : { officialSkillId: asset.officialSkillId },
      ...asset.updateAvailable === undefined ? {} : { updateAvailable: asset.updateAvailable },
      editable: asset.origin !== 'builtin',
      fileCount: asset.files.length,
      totalBytes: asset.files.reduce((sum, file) => sum + file.size, 0),
      mcpServers: asset.dependencies.mcpServers.map(server => server.serverName),
      bindings: this.config.manager.bindingSummaries(assetId),
    }
  }

  /**
   * Read the Teams the binding dialog addresses.
   * @returns one row per Team, captain slot first.
   */
  private roster(): TeamSkillTeamView[] {
    return this.config.teams().map(team => ({
      id: team.id,
      name: team.name,
      roles: [
        { id: CAPTAIN_ROLE, name: team.captain.name, captain: true },
        // A member without a stored identity is addressed by its name, which is
        // the same fallback the runtime uses when it resolves a claim.
        ...team.members.map(member => ({ id: member.id ?? member.name, name: member.name, captain: false })),
      ],
    }))
  }

  /**
   * List the library, the roster, and the shipped skill ids.
   * @returns one page load.
   */
  @Remote
  library(): TeamSkillLibraryView {
    return {
      root: this.config.store.root,
      assets: this.config.store.list().flatMap((asset) => {
        const row = this.row(asset.id)
        return row === undefined ? [] : [row]
      }),
      teams: this.roster(),
      official: [...this.config.official],
    }
  }

  /**
   * Read one asset with its files and body.
   * @param assetId - asset identity.
   * @returns the detail, or a refusal when the asset is gone.
   */
  @Remote
  async detail(assetId: string): Promise<TeamSkillDetailView | TeamSkillRefusalView> {
    const asset = this.config.store.get(assetId)
    const row = this.row(assetId)
    if (asset === undefined || row === undefined) {
      return { ok: false, reason: 'unknown-asset', detail: `Team Skill "${assetId}" is not installed any more.` }
    }
    let body = ''
    try {
      body = await this.config.store.readText(assetId, 'SKILL.md')
    } catch {
      body = ''
    }
    return {
      asset: row,
      files: asset.files.map(file => ({ path: file.path, size: file.size, text: file.text })),
      body,
    }
  }

  /**
   * Read one text file of an asset.
   * @param assetId - asset identity.
   * @param path - relative path.
   * @returns the text, or a refusal.
   */
  @Remote
  async readFile(assetId: string, path: string): Promise<{ ok: true; path: string; text: string } | TeamSkillRefusalView> {
    try {
      return { ok: true, path, text: await this.config.store.readText(assetId, path) }
    } catch (error: unknown) {
      return { ok: false, reason: 'unreadable', detail: String(error) }
    }
  }

  /**
   * Write one file, publishing a new asset version.
   * @param assetId - asset identity.
   * @param path - relative path.
   * @param text - new content.
   * @returns the refreshed detail, or a refusal.
   */
  @Remote
  async writeFile(assetId: string, path: string, text: string): Promise<TeamSkillDetailView | TeamSkillRefusalView> {
    try {
      await this.config.store.writeFile(assetId, path, text)
    } catch (error: unknown) {
      return { ok: false, reason: 'write-refused', detail: String(error) }
    }
    this.config.resync()
    return this.detail(assetId)
  }

  /**
   * Create one editable skill from the blank template.
   * @param skillId - kebab-case name the new skill takes.
   * @param description - frontmatter description.
   * @returns the new detail, or a refusal when the folder is not a legal skill.
   */
  @Remote
  async create(skillId: string, description: string): Promise<TeamSkillDetailView | TeamSkillRefusalView> {
    const text = TEMPLATE.replace('SKILL-ID', skillId).replace('Describe when this method applies.', description)
    const result = buildSkillPackage([{ path: 'SKILL.md', bytes: new TextEncoder().encode(text) }])
    if (!result.ok) return { ok: false, reason: result.reason, detail: `"${skillId}" is not a legal skill id.` }
    const id = `custom:${skillId}`
    await this.config.store.install(result.skill, { id, origin: 'custom', version: '1' })
    return this.detail(id)
  }

  /**
   * Import one folder, as the browser's picker sends it.
   * @param files - relative paths and base64 content.
   * @returns the new detail, or a refusal naming the exact rule that failed.
   */
  @Remote
  async importFiles(files: readonly TeamSkillImportFile[]): Promise<TeamSkillDetailView | TeamSkillRefusalView> {
    const decoded = decodeImportFiles(files.map(file => ({ path: file.path, base64: file.base64 })))
    const result = buildSkillPackage(decoded)
    if (!result.ok) {
      return { ok: false, reason: result.reason, detail: `${result.reason}${result.path === undefined ? '' : ` at ${result.path}`}` }
    }
    const id = `custom:${result.skill.name}`
    if (this.config.store.get(id) !== undefined) {
      return { ok: false, reason: 'duplicate', detail: `a skill named "${result.skill.name}" already exists` }
    }
    await this.config.store.install(result.skill, { id, origin: 'custom', version: '1' })
    return this.detail(id)
  }

  /**
   * Copy one shipped skill into an editable override.
   * @param skillId - shipped skill id.
   * @returns the new detail, or a refusal.
   */
  @Remote
  async createOverride(skillId: string): Promise<TeamSkillDetailView | TeamSkillRefusalView> {
    const id = `override:${skillId}`
    try {
      await this.config.store.createOverride(skillId, id)
    } catch (error: unknown) {
      return { ok: false, reason: 'override-refused', detail: String(error) }
    }
    return this.detail(id)
  }

  /**
   * Reset one override back to the shipped copy.
   * @param assetId - override identity.
   * @returns the refreshed detail, or a refusal.
   */
  @Remote
  async resetOverride(assetId: string): Promise<TeamSkillDetailView | TeamSkillRefusalView> {
    try {
      await this.config.store.resetOverride(assetId)
    } catch (error: unknown) {
      return { ok: false, reason: 'reset-refused', detail: String(error) }
    }
    this.config.resync()
    return this.detail(assetId)
  }

  /**
   * Delete one asset, listing every blocker at once.
   * @param assetId - asset identity.
   * @returns the outcome.
   */
  @Remote
  async remove(assetId: string): Promise<TeamSkillDeleteView> {
    const outcome = await this.config.manager.remove(assetId)
    if (outcome.ok) this.config.resync()
    return {
      ok: outcome.ok,
      blockers: outcome.blockers.map((blocker) => {
        if (blocker.kind === 'binding') {
          return { kind: 'binding', detail: blocker.bindings.map(row => `${row.teamName} → ${row.roleName}`).join(', ') }
        }
        if (blocker.kind === 'active') return { kind: 'active', detail: blocker.sessions.join(', ') }
        if (blocker.kind === 'dependency') return { kind: 'dependency', detail: blocker.dependents.join(', ') }
        return { kind: 'official', detail: 'a shipped Team Skill is read-only' }
      }),
      warnings: outcome.warnings,
    }
  }

  /**
   * Bind one asset to one role slot.
   * @param teamId - Team identity.
   * @param roleId - role identity, or `captain`.
   * @param assetId - asset identity.
   * @returns whether the assignment landed, and the refreshed library.
   */
  @Remote
  async assign(teamId: string, roleId: string, assetId: string): Promise<{ ok: boolean; detail: string; library: TeamSkillLibraryView }> {
    const result = await this.config.manager.assign({ teamId, roleId, assetId, captain: roleId === CAPTAIN_ROLE })
    if (result.ok) this.config.resync()
    return {
      ok: result.ok,
      detail: result.ok ? '' : result.reason,
      library: this.library(),
    }
  }

  /**
   * Remove one role's assignment.
   * @param teamId - Team identity.
   * @param roleId - role identity.
   * @returns the refreshed library.
   */
  @Remote
  async unassign(teamId: string, roleId: string): Promise<TeamSkillLibraryView> {
    await this.config.manager.unassign(teamId, roleId)
    this.config.resync()
    return this.library()
  }
}

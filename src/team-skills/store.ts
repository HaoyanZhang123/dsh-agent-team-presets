/**
 * The private Team Skill store: folders on disk plus one registry index.
 *
 * A Team Skill is a complete folder, so the store keeps complete folders rather
 * than a database of rows: `<root>/assets/<assetId>/<version>/` holds exactly
 * the bytes an imported package carried, and every version is immutable once
 * written. Edits create a new version directory instead of rewriting the old
 * one, which is what lets a running member keep reading the version it was
 * created with while the user edits a newer one.
 *
 * The registry is a small JSON index beside the folders. It is not the source
 * of truth for the bytes — the folders are — so a registry entry whose folder
 * is missing reports `intact: false` instead of being invented.
 *
 * The root is supplied by the caller. This module never guesses a global skill
 * directory: the plugin's own directory is derived in `src/team-skills/root.ts`,
 * and a test or an embedding can point it anywhere.
 * @module dsh-agent-team-presets/team-skills/store
 */

import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { isTextBytes, assetDirectoryName, resolveInside } from './paths.ts'
import type { SkillPackage } from './import.ts'
import type {
  TeamSkillAsset, TeamSkillDependencies, TeamSkillFile, TeamSkillOrigin,
} from '../types.ts'

/** Registry layout revision; a document with another version refuses the open. */
const REGISTRY_VERSION = 1

/** One registry document. */
interface RegistryDocument {
  readonly version: number
  readonly assets: readonly TeamSkillAsset[]
}

/** One official skill the package ships. */
export interface OfficialSkillEntry {
  /** Kebab-case skill id; also the shipped folder name. */
  readonly skillId: string
  /** Absolute directory of the shipped, read-only copy. */
  readonly directory: string
  /** Shipped asset version. */
  readonly version: string
}

/** A dependency declaration every asset starts with. */
const NO_DEPENDENCIES: TeamSkillDependencies = { mcpServers: [], executables: [], otherSkills: [] }

/**
 * Hash one file.
 * @param bytes - file content.
 * @returns lowercase hex SHA-256.
 */
function digestBytes(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

/**
 * Hash one whole folder in a path-stable way.
 *
 * The digest covers each path and each file digest, so renaming a file changes
 * it even when the bytes are identical — which is the fact an upgrade
 * comparison needs.
 * @param files - every file of the folder.
 * @returns the folder digest.
 */
export function folderDigest(files: readonly TeamSkillFile[]): string {
  const hash = createHash('sha256')
  for (const file of [...files].sort((left, right) => left.path.localeCompare(right.path))) {
    hash.update(`${file.path}\u0000${file.sha256}\n`)
  }
  return hash.digest('hex')
}

/**
 * Build the file table of one package from its decoded bytes.
 * @param files - the package files.
 * @returns the registry file rows, path-ordered.
 */
export function fileTable(files: readonly { readonly path: string; readonly bytes: Uint8Array }[]): TeamSkillFile[] {
  return [...files]
    .sort((left, right) => left.path.localeCompare(right.path))
    .map(file => ({
      path: file.path,
      size: file.bytes.byteLength,
      sha256: digestBytes(file.bytes),
      text: isTextBytes(file.bytes),
    }))
}

/** The private store rooted at one directory. */
export class TeamSkillStore {
  private assets = new Map<string, TeamSkillAsset>()
  private revision = 0
  private opened = false

  /**
   * @param root - absolute directory the caller owns; created on first write.
   */
  constructor(readonly root: string) {}

  /** Registry revision, bumped by every mutation. */
  get registryRevision(): number {
    return this.revision
  }

  /** Absolute path of one asset version's folder. */
  assetPath(assetId: string, version: string): string {
    return join(this.root, 'assets', assetId, version)
  }

  /**
   * Read the registry index, tolerating a missing one.
   *
   * A missing index on a first run is not an error — the store is created by its
   * first write. A malformed index is: silently starting empty would orphan
   * every folder the user already imported, so it throws instead.
   * @returns after the in-memory table is loaded.
   * @throws when the registry document has an unsupported version or shape.
   */
  async open(): Promise<void> {
    if (this.opened) return
    let raw: string
    try {
      raw = await readFile(join(this.root, 'registry.json'), 'utf8')
    } catch {
      this.opened = true
      return
    }
    const parsed = JSON.parse(raw) as Partial<RegistryDocument>
    if (parsed.version !== REGISTRY_VERSION || !Array.isArray(parsed.assets)) {
      throw new Error(`the Team Skill registry at ${this.root} has an unexpected layout; refusing to guess at it`)
    }
    this.assets = new Map(parsed.assets.map(asset => [asset.id, asset]))
    this.opened = true
  }

  /** Every asset, in a stable order. */
  list(): readonly TeamSkillAsset[] {
    return [...this.assets.values()].sort((left, right) => left.skillId.localeCompare(right.skillId) || left.id.localeCompare(right.id))
  }

  /**
   * Look one asset up by identity.
   * @param assetId - asset identity.
   * @returns the asset, or undefined.
   */
  get(assetId: string): TeamSkillAsset | undefined {
    return this.assets.get(assetId)
  }

  /**
   * Look an asset up by its skill name, preferring a user override.
   * @param skillId - kebab-case skill name.
   * @returns the winning asset, or undefined.
   */
  bySkillId(skillId: string): TeamSkillAsset | undefined {
    const candidates = this.list().filter(asset => asset.skillId === skillId)
    return candidates.find(asset => asset.origin === 'override')
      ?? candidates.find(asset => asset.origin === 'custom')
      ?? candidates[0]
  }

  /**
   * Persist the registry index.
   * @returns after the document is on disk.
   */
  private async flush(): Promise<void> {
    await mkdir(this.root, { recursive: true })
    const document: RegistryDocument = { version: REGISTRY_VERSION, assets: this.list() }
    await writeFile(join(this.root, 'registry.json'), `${JSON.stringify(document, null, 2)}\n`, 'utf8')
    this.revision += 1
  }

  /**
   * Install one validated package as a new asset version.
   * @param package_ - the validated folder.
   * @param options - identity, origin, and provenance of the new asset.
   * @returns the stored asset.
   */
  async install(package_: SkillPackage, options: {
    readonly id: string
    readonly origin: TeamSkillOrigin
    readonly version: string
    readonly officialSkillId?: string
    readonly baseVersion?: string
    readonly dependencies?: TeamSkillDependencies
  }): Promise<TeamSkillAsset> {
    const directory = assetDirectoryName(package_.name)
    if (directory !== package_.name) throw new Error(`invalid skill id ${package_.name}`)
    const target = this.assetPath(options.id, options.version)
    for (const file of package_.files) {
      const path = resolveInside(target, file.path)
      await mkdir(join(path, '..'), { recursive: true })
      await writeFile(path, file.bytes)
    }
    const files = fileTable(package_.files)
    const asset: TeamSkillAsset = {
      id: options.id,
      skillId: package_.name,
      description: package_.description,
      origin: options.origin,
      version: options.version,
      ...options.officialSkillId === undefined ? {} : { officialSkillId: options.officialSkillId },
      ...options.baseVersion === undefined ? {} : { baseVersion: options.baseVersion },
      digest: folderDigest(files),
      files,
      dependencies: options.dependencies ?? NO_DEPENDENCIES,
      updatedAt: Date.now(),
    }
    this.assets.set(asset.id, asset)
    await this.flush()
    return asset
  }

  /**
   * Write one edited file as a NEW version of an asset.
   *
   * The previous version folder is left untouched, so a member that already
   * resolved it keeps reading valid bytes.
   * @param assetId - asset being edited.
   * @param path - relative path to write.
   * @param content - new text content.
   * @returns the new asset version.
   * @throws when the asset is an official read-only copy.
   */
  async writeFile(assetId: string, path: string, content: string): Promise<TeamSkillAsset> {
    const asset = requireAsset(this.assets, assetId)
    if (asset.origin === 'builtin') {
      throw new Error('a shipped Team Skill is read-only; create an editable copy instead')
    }
    const files = new Map<string, Uint8Array>()
    for (const file of asset.files) {
      const absolute = resolveInside(this.assetPath(asset.id, asset.version), file.path)
      files.set(file.path, new Uint8Array(await readFile(absolute)))
    }
    files.set(path, new Uint8Array(Buffer.from(content, 'utf8')))
    const version = nextVersion()
    const target = this.assetPath(asset.id, version)
    for (const [relative, bytes] of files) {
      const absolute = resolveInside(target, relative)
      await mkdir(join(absolute, '..'), { recursive: true })
      await writeFile(absolute, bytes)
    }
    const table = fileTable([...files].map(([relative, bytes]) => ({ path: relative, bytes })))
    const next: TeamSkillAsset = { ...asset, version, files: table, digest: folderDigest(table), updatedAt: Date.now() }
    this.assets.set(next.id, next)
    await this.flush()
    return next
  }

  /**
   * Read one file of the asset's current version.
   * @param assetId - asset identity.
   * @param path - relative path.
   * @returns the bytes.
   */
  async readBytes(assetId: string, path: string): Promise<Uint8Array> {
    const asset = requireAsset(this.assets, assetId)
    return new Uint8Array(await readFile(resolveInside(this.assetPath(asset.id, asset.version), path)))
  }

  /**
   * Read one text file of the asset's current version.
   * @param assetId - asset identity.
   * @param path - relative path.
   * @returns the text.
   */
  async readText(assetId: string, path: string): Promise<string> {
    return new TextDecoder('utf-8').decode(await this.readBytes(assetId, path))
  }

  /**
   * Delete one asset and every version folder it owns.
   * @param assetId - asset identity.
   * @returns after the folder and the registry entry are gone.
   * @throws when the asset is shipped read-only.
   */
  async remove(assetId: string): Promise<void> {
    const asset = requireAsset(this.assets, assetId)
    if (asset.origin === 'builtin') throw new Error('a shipped Team Skill is read-only and cannot be deleted')
    await rm(join(this.root, 'assets', assetId), { recursive: true, force: true })
    this.assets.delete(assetId)
    await this.flush()
  }

  /**
   * Copy the shipped official skills into the private store, idempotently.
   *
   * An official asset is only materialized when the exact shipped version is
   * absent, so a restart copies nothing. A user override that was derived from
   * an older shipped version is left exactly as it is and only flagged, because
   * merging a Python/Shell/Markdown folder automatically would silently rewrite
   * the user's own edits.
   * @param entries - every skill the package ships.
   * @returns the identifiers that changed, for the startup log.
   */
  async ensureOfficial(entries: readonly OfficialSkillEntry[]): Promise<readonly string[]> {
    const changed: string[] = []
    for (const entry of entries) {
      const files = await readDirectory(entry.directory)
      const id = `builtin:${entry.skillId}`
      const current = this.assets.get(id)
      if (current === undefined) {
        await this.installFiles(entry.skillId, files, {
          id, origin: 'builtin', version: entry.version, officialSkillId: entry.skillId,
        })
        changed.push(id)
      } else if (current.version !== entry.version || current.digest !== folderDigest(fileTable(files))) {
        // The package shipped a newer copy: replace the read-only official
        // asset, which no member can be pinned to (members bind overrides and
        // custom assets).
        await this.installFiles(entry.skillId, files, {
          id, origin: 'builtin', version: entry.version, officialSkillId: entry.skillId,
        })
        changed.push(id)
      }
      // Flag every override derived from an older shipped version.
      for (const asset of this.list()) {
        if (asset.origin !== 'override' || asset.officialSkillId !== entry.skillId) continue
        const outdated = asset.baseVersion !== entry.version
        if (asset.updateAvailable === outdated) continue
        this.assets.set(asset.id, { ...asset, updateAvailable: outdated })
        changed.push(asset.id)
      }
    }
    if (changed.length > 0) await this.flush()
    return changed
  }

  /**
   * Build the description of one package from the files already read.
   * @param skillId - the name to store under.
   * @param files - decoded files.
   * @param options - identity and provenance.
   * @returns after the asset is stored.
   */
  private async installFiles(skillId: string, files: readonly { path: string; bytes: Uint8Array }[], options: {
    readonly id: string
    readonly origin: TeamSkillOrigin
    readonly version: string
    readonly officialSkillId?: string
    readonly baseVersion?: string
  }): Promise<void> {
    const instruction = files.find(file => file.path === 'SKILL.md')
    const text = instruction === undefined ? '' : new TextDecoder('utf-8').decode(instruction.bytes)
    const description = /^---\r?\n[\s\S]*?\ndescription:\s*(.+)$/mu.exec(text)?.[1]?.trim() ?? ''
    await this.install(
      { name: skillId, description, files: [...files].sort((left, right) => left.path.localeCompare(right.path)), totalBytes: 0 },
      options,
    )
  }

  /**
   * Create an editable copy of one shipped skill.
   *
   * The copy points at the shipped version it started from, so a later upgrade
   * can tell the user that the official copy moved on without touching their
   * edits.
   * @param skillId - shipped skill id.
   * @param id - identity for the new override asset.
   * @returns the new override asset.
   * @throws when the deployment does not ship that skill.
   */
  async createOverride(skillId: string, id: string): Promise<TeamSkillAsset> {
    const official = this.assets.get(`builtin:${skillId}`)
    if (official === undefined) throw new Error(`no shipped skill "${skillId}" is installed in this deployment`)
    const files: { path: string; bytes: Uint8Array }[] = []
    for (const file of official.files) {
      files.push({ path: file.path, bytes: await this.readBytes(official.id, file.path) })
    }
    const version = '1'
    await this.installFiles(official.skillId, files, {
      id, origin: 'override', version, officialSkillId: skillId, baseVersion: official.version,
    })
    return requireAsset(this.assets, id)
  }

  /**
   * Point an override back at the current shipped copy, discarding its edits.
   * @param assetId - override identity.
   * @returns the refreshed asset.
   * @throws when the asset is not an override of a shipped skill.
   */
  async resetOverride(assetId: string): Promise<TeamSkillAsset> {
    const asset = requireAsset(this.assets, assetId)
    if (asset.origin !== 'override' || asset.officialSkillId === undefined) {
      throw new Error('only an override of a shipped Team Skill can be reset')
    }
    const official = this.assets.get(`builtin:${asset.officialSkillId}`)
    if (official === undefined) throw new Error('the shipped skill this override came from is no longer installed')
    const files: { path: string; bytes: Uint8Array }[] = []
    for (const file of official.files) files.push({ path: file.path, bytes: await this.readBytes(official.id, file.path) })
    const version = nextVersion()
    await this.installFiles(official.skillId, files, {
      id: asset.id, origin: 'override', version, officialSkillId: asset.officialSkillId, baseVersion: official.version,
    })
    return requireAsset(this.assets, asset.id)
  }

  /**
   * Check one asset's folder against its registry entry.
   * @param assetId - asset identity.
   * @returns whether every recorded file is present with the recorded digest.
   */
  async verify(assetId: string): Promise<boolean> {
    const asset = this.assets.get(assetId)
    if (asset === undefined) return false
    for (const file of asset.files) {
      try {
        const bytes = new Uint8Array(await readFile(resolveInside(this.assetPath(asset.id, asset.version), file.path)))
        if (digestBytes(bytes) !== file.sha256) return false
      } catch {
        return false
      }
    }
    return true
  }
}

/**
 * Resolve one asset or throw a message a dialog can show.
 * @param assets - the registry table.
 * @param assetId - asset identity.
 * @returns the asset.
 */
function requireAsset(assets: ReadonlyMap<string, TeamSkillAsset>, assetId: string): TeamSkillAsset {
  const asset = assets.get(assetId)
  if (asset === undefined) throw new Error(`unknown Team Skill asset "${assetId}"`)
  return asset
}

/**
 * Derive a version string that sorts after every earlier one.
 * @returns a timestamp-based version.
 */
function nextVersion(): string {
  return String(Date.now())
}

/**
 * Read one directory tree of a shipped skill.
 * @param root - absolute directory.
 * @returns every regular file, path-ordered.
 */
async function readDirectory(root: string): Promise<{ path: string; bytes: Uint8Array }[]> {
  const out: { path: string; bytes: Uint8Array }[] = []
  /**
   * Walk one level.
   * @param relative - current relative directory.
   */
  const walk = async (relative: string): Promise<void> => {
    const directory = relative === '' ? root : join(root, relative)
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const child = relative === '' ? entry.name : `${relative}/${entry.name}`
      if (entry.isSymbolicLink()) throw new Error(`the shipped skill ${root} contains a symbolic link at ${child}`)
      if (entry.isDirectory()) { await walk(child); continue }
      if (!entry.isFile()) continue
      void (await stat(join(root, child)))
      out.push({ path: child, bytes: new Uint8Array(await readFile(join(root, child))) })
    }
  }
  await walk('')
  return out.sort((left, right) => left.path.localeCompare(right.path))
}

/**
 * Copy one shipped folder into the store's asset layout without re-reading it.
 *
 * Exposed for the import path so a user's directory import and a shipped asset
 * share the exact same write rules.
 * @param store - the target store.
 * @param source - absolute source directory.
 * @param options - identity and origin.
 * @returns the stored asset.
 */
export async function installFromDirectory(
  store: TeamSkillStore,
  source: string,
  options: { readonly id: string; readonly skillId: string; readonly origin: TeamSkillOrigin; readonly version: string },
): Promise<TeamSkillAsset> {
  const files = await readDirectory(source)
  const instruction = files.find(file => file.path === 'SKILL.md')
  const text = instruction === undefined ? '' : new TextDecoder('utf-8').decode(instruction.bytes)
  const description = /^---\r?\n[\s\S]*?\ndescription:\s*(.+)$/mu.exec(text)?.[1]?.trim() ?? ''
  return store.install(
    { name: options.skillId, description, files, totalBytes: files.reduce((sum, file) => sum + file.bytes.byteLength, 0) },
    { id: options.id, origin: options.origin, version: options.version },
  )
}

/**
 * Copy one directory into another, used by the version-pinning path.
 * @param from - source directory.
 * @param to - destination directory.
 * @returns after the copy.
 */
export async function copyDirectory(from: string, to: string): Promise<void> {
  await mkdir(to, { recursive: true })
  await cp(from, to, { recursive: true })
}

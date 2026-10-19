/**
 * Reading one Team Skill folder from untrusted input.
 *
 * Two entry points share every check: a browser folder picker hands over
 * relative names and bytes, and a ZIP hands over a central directory that must
 * be validated before anything is inflated. Both converge on
 * {@link buildSkillPackage}, which is the only place that decides whether a set
 * of files is a legal Team Skill — so the two import paths cannot disagree
 * about traversal, size, frontmatter, or duplicates.
 *
 * The importer never executes anything and never rewrites a third-party
 * `SKILL.md`: unknown frontmatter keys are preserved verbatim, because the file
 * belongs to a portable format this plugin only reads.
 * @module dsh-agent-team-presets/team-skills/import
 */

import { inflateRawSync } from 'node:zlib'
import {
  MAX_SKILL_FILE_BYTES, checkFolder, normalizeSkillPath, SkillPathError,
} from './paths.ts'
import type { SkillPathFailure } from './paths.ts'

/** The instruction file every Team Skill must carry. */
export const SKILL_FILE = 'SKILL.md'

/** Most bytes one ZIP may expand to, so a bomb cannot exhaust memory. */
export const MAX_ZIP_BYTES = 64 * 1024 * 1024

/** Most entries one ZIP may declare. */
export const MAX_ZIP_ENTRIES = 4000

/** Why one import was refused. */
export type SkillImportFailure =
  | 'invalid-zip'
  | 'encrypted-zip'
  | 'zip-bomb'
  | 'missing-skill-file'
  | 'invalid-frontmatter'
  | 'invalid-name'
  | 'missing-description'
  | SkillPathFailure

/** One file of an imported folder, decoded. */
export interface ImportedFile {
  /** POSIX-relative path. */
  readonly path: string
  /** Raw bytes. */
  readonly bytes: Uint8Array
}

/** One validated Team Skill folder. */
export interface SkillPackage {
  /** Kebab-case name from the frontmatter; also the default directory name. */
  readonly name: string
  /** Description from the frontmatter. */
  readonly description: string
  /** Every file, path-ordered. */
  readonly files: readonly ImportedFile[]
  /** Total byte length. */
  readonly totalBytes: number
}

/** Result of one import attempt. */
export type SkillImportResult =
  | { readonly ok: true; readonly skill: SkillPackage; readonly warnings: readonly string[] }
  | { readonly ok: false; readonly reason: SkillImportFailure; readonly path?: string }

/** The kebab-case grammar the official skill registry enforces. */
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u

/**
 * Parse the YAML frontmatter of one `SKILL.md`.
 *
 * Only `name` and `description` are interpreted, and both are required by the
 * Agent Skills specification. Everything else — `license`, `compatibility`,
 * `metadata`, `allowed-tools`, an unknown vendor key — stays in the file
 * untouched, because the document is portable and this reader is one consumer.
 * @param text - the whole document.
 * @returns the two required fields, or undefined when the fence is absent.
 */
export function parseSkillFrontmatter(text: string): { name: string; description: string } | undefined {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(text)
  if (match?.[1] === undefined) return undefined
  const fields = new Map<string, string>()
  for (const line of match[1].split(/\r?\n/u)) {
    // A nested block (an indented `metadata:` child, a list item) is not a
    // top-level scalar and is deliberately not folded into the map.
    if (/^\s/u.test(line) || line.trim() === '') continue
    const separator = line.indexOf(':')
    if (separator <= 0) continue
    const key = line.slice(0, separator).trim()
    const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/gu, '')
    fields.set(key, value)
  }
  const name = fields.get('name') ?? ''
  const description = fields.get('description') ?? ''
  return { name, description }
}

/**
 * Validate one decoded folder as a Team Skill.
 *
 * @param input - the files a caller wants to install.
 * @returns the validated package, or the reason it is not one.
 */
export function buildSkillPackage(input: readonly ImportedFile[]): SkillImportResult {
  let files: ImportedFile[]
  try {
    files = input.map(file => ({ path: normalizeSkillPath(file.path), bytes: file.bytes }))
    checkFolder(files.map(file => ({ path: file.path, bytes: file.bytes.byteLength })))
  } catch (error: unknown) {
    if (error instanceof SkillPathError) return { ok: false, reason: error.reason, path: error.path }
    throw error
  }
  // The instruction file leads the listing: every reader looks for it first,
  // and the rest keeps a stable lexical order.
  const ordered = [...files].sort((left, right) => {
    if (left.path === SKILL_FILE) return -1
    if (right.path === SKILL_FILE) return 1
    return left.path.localeCompare(right.path)
  })
  const instruction = ordered.find(file => file.path === SKILL_FILE)
  if (instruction === undefined) return { ok: false, reason: 'missing-skill-file', path: SKILL_FILE }
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(instruction.bytes)
  } catch {
    return { ok: false, reason: 'invalid-frontmatter', path: SKILL_FILE }
  }
  const frontmatter = parseSkillFrontmatter(text)
  if (frontmatter === undefined) return { ok: false, reason: 'invalid-frontmatter', path: SKILL_FILE }
  if (!SKILL_NAME.test(frontmatter.name)) return { ok: false, reason: 'invalid-name', path: SKILL_FILE }
  if (frontmatter.description.trim() === '') return { ok: false, reason: 'missing-description', path: SKILL_FILE }
  const totalBytes = ordered.reduce((sum, file) => sum + file.bytes.byteLength, 0)
  const warnings: string[] = []
  // Advisory only: a script is legitimate content, and refusing it would break
  // the resources a real skill needs. The dialog still tells the user what the
  // folder will carry before they confirm.
  const scripts = ordered.filter(file => /\.(?:py|sh|ps1|bat|cmd)$/u.test(file.path))
  if (scripts.length > 0) {
    warnings.push(`this skill carries ${String(scripts.length)} script file(s); nothing is executed on import`)
  }
  return {
    ok: true,
    skill: { name: frontmatter.name, description: frontmatter.description, files: ordered, totalBytes },
    warnings,
  }
}

/** One entry of a parsed ZIP central directory. */
interface ZipEntry {
  readonly path: string
  readonly method: number
  readonly compressedSize: number
  readonly uncompressedSize: number
  readonly localHeaderOffset: number
  readonly encrypted: boolean
}

/**
 * Read the central directory of one ZIP archive.
 *
 * Only the two methods a browser or `zip -r` actually produces are supported:
 * stored and deflate. Anything else is refused rather than guessed at, and an
 * encrypted entry is refused before any inflation is attempted.
 * @param bytes - the whole archive.
 * @returns the declared entries.
 * @throws {SkillPathError} when the archive is malformed.
 */
function readCentralDirectory(bytes: Uint8Array): ZipEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  // The end-of-central-directory record is followed by a comment of at most
  // 64 KiB, so the search only has to cover that tail.
  let eocd = -1
  for (let at = bytes.length - 22; at >= Math.max(0, bytes.length - 22 - 0xffff); at -= 1) {
    if (view.getUint32(at, true) === 0x06054b50) { eocd = at; break }
  }
  if (eocd < 0) throw new SkillPathError('empty-path', 'zip:eocd')
  const count = view.getUint16(eocd + 10, true)
  const offset = view.getUint32(eocd + 16, true)
  if (count > MAX_ZIP_ENTRIES) throw new SkillPathError('too-many-files', 'zip:entries')
  const entries: ZipEntry[] = []
  let cursor = offset
  for (let index = 0; index < count; index += 1) {
    if (view.getUint32(cursor, true) !== 0x02014b50) throw new SkillPathError('empty-path', `zip:entry:${String(index)}`)
    const flags = view.getUint16(cursor + 8, true)
    const method = view.getUint16(cursor + 10, true)
    const compressedSize = view.getUint32(cursor + 20, true)
    const uncompressedSize = view.getUint32(cursor + 24, true)
    const nameLength = view.getUint16(cursor + 28, true)
    const extraLength = view.getUint16(cursor + 30, true)
    const commentLength = view.getUint16(cursor + 32, true)
    const localHeaderOffset = view.getUint32(cursor + 42, true)
    const name = new TextDecoder('utf-8').decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength))
    cursor += 46 + nameLength + extraLength + commentLength
    // Directory entries are implied by the file paths; a trailing slash is the
    // only marker, and it carries no bytes of its own.
    if (name.endsWith('/')) continue
    entries.push({
      path: name,
      method,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
      encrypted: (flags & 0x1) !== 0,
    })
  }
  return entries
}

/**
 * Inflate one entry's bytes from the local file header.
 * @param bytes - the whole archive.
 * @param entry - its central-directory record.
 * @returns the decoded bytes.
 * @throws {SkillPathError} when the entry cannot be decoded within its limits.
 */
function readEntry(bytes: Uint8Array, entry: ZipEntry): Uint8Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const at = entry.localHeaderOffset
  if (view.getUint32(at, true) !== 0x04034b50) throw new SkillPathError('empty-path', `zip:local:${entry.path}`)
  const nameLength = view.getUint16(at + 26, true)
  const extraLength = view.getUint16(at + 28, true)
  const start = at + 30 + nameLength + extraLength
  if (entry.uncompressedSize > MAX_SKILL_FILE_BYTES) throw new SkillPathError('file-too-large', entry.path)
  const compressed = bytes.subarray(start, start + entry.compressedSize)
  if (entry.method === 0) return compressed.slice()
  if (entry.method !== 8) throw new SkillPathError('empty-path', `zip:method:${entry.path}`)
  const inflated = inflateRawSync(compressed, { maxOutputLength: MAX_SKILL_FILE_BYTES })
  // A liars' archive declares a small size and expands past it: the declared
  // and the actual length must both be inside the limit.
  if (inflated.byteLength !== entry.uncompressedSize) throw new SkillPathError('file-too-large', entry.path)
  return new Uint8Array(inflated)
}

/**
 * Read one ZIP archive as an imported folder.
 *
 * The total expansion is bounded before anything is inflated, so a bomb is
 * refused on its declared sizes even when every entry looks reasonable.
 * @param bytes - the whole archive.
 * @returns the decoded files, or the reason the archive was refused.
 */
export function readZip(bytes: Uint8Array): { ok: true; files: ImportedFile[] } | { ok: false; reason: SkillImportFailure; path?: string } {
  let entries: ZipEntry[]
  try {
    entries = readCentralDirectory(bytes)
  } catch (error: unknown) {
    if (error instanceof SkillPathError) {
      return { ok: false, reason: error.reason === 'too-many-files' ? 'zip-bomb' : 'invalid-zip', path: error.path }
    }
    return { ok: false, reason: 'invalid-zip' }
  }
  if (entries.some(entry => entry.encrypted)) return { ok: false, reason: 'encrypted-zip' }
  const declared = entries.reduce((sum, entry) => sum + entry.uncompressedSize, 0)
  if (declared > MAX_ZIP_BYTES) return { ok: false, reason: 'zip-bomb' }
  const files: ImportedFile[] = []
  try {
    for (const entry of entries) files.push({ path: entry.path, bytes: readEntry(bytes, entry) })
  } catch (error: unknown) {
    if (error instanceof SkillPathError) {
      return { ok: false, reason: error.reason === 'file-too-large' ? 'zip-bomb' : 'invalid-zip', path: error.path }
    }
    return { ok: false, reason: 'invalid-zip' }
  }
  return { ok: true, files }
}

/**
 * Import one ZIP archive as a Team Skill.
 * @param bytes - the archive.
 * @returns the validated package, or the reason it was refused.
 */
export function importZipSkill(bytes: Uint8Array): SkillImportResult {
  const archive = readZip(bytes)
  if (!archive.ok) return archive
  return buildSkillPackage(archive.files)
}

/**
 * Decode the browser's base64 file payloads into bytes.
 *
 * A folder picker cannot hand over a `File` object across the Remote boundary,
 * so it sends base64; this is the one place that decoding happens.
 * @param files - the payloads, with POSIX-relative paths.
 * @returns the decoded files.
 */
export function decodeImportFiles(files: readonly { readonly path: string; readonly base64: string }[]): ImportedFile[] {
  return files.map(file => ({ path: file.path, bytes: new Uint8Array(Buffer.from(file.base64, 'base64')) }))
}

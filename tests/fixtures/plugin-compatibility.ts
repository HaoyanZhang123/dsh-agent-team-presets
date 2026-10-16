/**
 * The official plugin-compatibility rule, vendored verbatim for verification.
 *
 * The checkout named by `DSH_CHECKOUT` in this round is `0.2.0-rc.2` at
 * `639ed01539`, whose `plugin-compatibility.ts` still decides loadability from
 * `peerDependencies` alone. The `engines.dsh` rule this manifest now relies on
 * exists only in a later Host commit, so the installed implementation CANNOT
 * verify the declaration: running the old function against `engines.dsh` would
 * pass for the wrong reason.
 *
 * Source (fetched, not retyped):
 *   https://github.com/deepseek-ai/deepseek-harness/blob/3de3a977e0cca074b17744f7372644bc57ee63bd/packages/boot/app-boot/src/plugin-compatibility.ts
 *
 * Only `getDshRuntimeVersion` was omitted: it reads the Host's own package.json
 * and is irrelevant to a caller supplying an explicit runtime version. Every
 * other line below is the upstream text. `tests/engines.spec.ts` also asserts
 * that this fixture and the installed checker agree wherever both define a
 * rule, so the vendored copy cannot silently drift away from the real Host.
 * @module dsh-agent-team-presets/tests/fixtures/plugin-compatibility
 */

/**
 * The subset of the `semver` API the upstream module uses.
 *
 * It is injected through {@link useSemver} instead of imported by package
 * specifier: this fixture lives outside the Host's dependency tree, where a
 * bare `semver` specifier is not resolvable, and the Host's own vendored copy is
 * resolved by absolute path in `./installed-compatibility.ts` — the same module
 * instance the real checker uses.
 */
export interface SemverLike {
  /** Whether a version satisfies a range, with the Host's prerelease policy applied by the caller. */
  satisfies(version: string, range: string, options?: { includePrerelease?: boolean }): boolean
  /** The parsed version, or null when the input is not a semantic version. */
  valid(version: string): string | null
}

let semver: SemverLike | undefined

/**
 * Bind the `semver` implementation the upstream module uses.
 * @param implementation - the resolved real `semver` module.
 * @returns nothing; the binding lasts for this module instance.
 */
export function useSemver(implementation: SemverLike): void {
  semver = implementation
}

/** Unmet dsh requirements and the exact plugin/runtime exemption decision. */
export interface PluginCompatibility {
  name: string
  version: string
  runtimeVersion: string
  /** Only requirements the running dsh version does not satisfy: `engines.dsh`, or dsh peer package names. */
  requirements: Record<string, string>
  exempted: boolean
}

function objectOf(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${field} must be an object`)
  }
  return value as Record<string, unknown>
}

function implementation(): SemverLike {
  if (semver === undefined) throw new Error('the vendored compatibility rule was used before useSemver() bound the real semver module')
  return semver
}

function runtimeVersionOf(value: unknown): string {
  if (typeof value !== 'string' || implementation().valid(value) === null) {
    throw new Error(`Invalid dsh runtime version: ${JSON.stringify(value)}; expected a semantic version`)
  }
  return value
}

function identityField(manifest: Record<string, unknown>, field: 'name' | 'version'): string {
  const value = Object.hasOwn(manifest, field) ? manifest[field] : undefined
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Plugin manifest ${field} must be a non-empty string when dsh requirements are unmet`)
  }
  return value
}

function satisfies(runtimeVersion: string, range: string): boolean {
  return range.trim() !== '' && implementation().satisfies(runtimeVersion, range, { includePrerelease: true })
}

function unmetRequirements(fields: Record<string, unknown>, runtimeVersion: string): Record<string, string> {
  const engines = Object.hasOwn(fields, 'engines') ? objectOf(fields.engines, 'Plugin manifest engines') : {}
  if (Object.hasOwn(engines, 'dsh')) {
    const range = engines.dsh
    if (typeof range !== 'string') throw new Error('Plugin manifest engines.dsh must be a string')
    return satisfies(runtimeVersion, range) ? {} : { 'engines.dsh': range }
  }
  if (!Object.hasOwn(fields, 'peerDependencies')) return {}
  const dependencies = objectOf(fields.peerDependencies, 'Plugin manifest peerDependencies')
  const unmet: Record<string, string> = {}
  for (const [name, range] of Object.entries(dependencies)) {
    if (typeof range !== 'string') {
      throw new Error(`Plugin manifest peerDependencies[${JSON.stringify(name)}] must be a string`)
    }
    if (name !== '@deepseek-ai/dsh' && !name.startsWith('@deepseek-ai/dsh-')) continue
    const requirement = ['workspace:^', 'workspace:~', 'workspace:*'].includes(range) ? runtimeVersion : range
    if (!satisfies(runtimeVersion, requirement)) unmet[name] = range
  }
  return unmet
}

/**
 * Check the plugin's dsh requirements against the runtime. An own `engines.dsh` range decides alone and
 * peerDependencies are ignored; otherwise every @deepseek-ai/dsh or @deepseek-ai/dsh-* peer must match.
 * Prereleases participate in ranges. For peers only, workspace:^, workspace:~, and workspace:* refer to
 * the current runtime; other empty or invalid ranges, including any workspace: `engines.dsh`, are unmet.
 * @param manifest - parsed plugin package.json; inherited fields are ignored.
 * @param exemptions - exact plugin name@version keys mapped to exact runtime versions.
 * @param runtimeVersion - the running dsh version to check against.
 * @returns unmet requirements and exemption status, or undefined when every requirement is met.
 * @throws for malformed manifest engines or peer fields, invalid runtime versions, or missing identity on a mismatch.
 */
export function evaluatePluginCompatibility(
  manifest: object,
  exemptions: Readonly<Record<string, readonly string[]>>,
  runtimeVersion: string,
): PluginCompatibility | undefined {
  runtimeVersionOf(runtimeVersion)
  const fields = objectOf(manifest, 'Plugin manifest')
  const requirements = unmetRequirements(fields, runtimeVersion)
  if (Object.keys(requirements).length === 0) return undefined
  const name = identityField(fields, 'name')
  const version = identityField(fields, 'version')
  const key = `${name}@${version}`
  const exemptedVersions = Object.hasOwn(exemptions, key) ? exemptions[key] : undefined
  const exempted = exemptedVersions?.includes(runtimeVersion) === true
  return { name, version, runtimeVersion, requirements, exempted }
}

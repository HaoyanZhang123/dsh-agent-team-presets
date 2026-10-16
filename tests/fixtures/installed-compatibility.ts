/**
 * The installed Host's own plugin-compatibility implementation.
 *
 * Loaded by absolute path from `DSH_CHECKOUT` rather than by package specifier,
 * because the subpath is not part of that package's published `exports` map.
 * `tests/engines.spec.ts` uses this to prove the vendored rule in
 * `./plugin-compatibility.ts` still agrees with the Host wherever both define a
 * rule, so a declaration cannot be verified against a stale copy.
 * @module dsh-agent-team-presets/tests/fixtures/installed-compatibility
 */

import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { checkoutRoot } from './checkout.ts'
import { useSemver } from './plugin-compatibility.ts'
import type { PluginCompatibility, SemverLike } from './plugin-compatibility.ts'

interface CompatibilityModule {
  evaluatePluginCompatibility(
    manifest: object,
    exemptions?: Readonly<Record<string, readonly string[]>>,
    runtimeVersion?: string,
  ): PluginCompatibility | undefined
}

const root = checkoutRoot()
const implementationPath = join(root, 'packages/boot/app-boot/src/plugin-compatibility.ts')
if (!existsSync(implementationPath)) {
  throw new Error(`The checkout under test does not provide ${implementationPath}; cannot verify the declaration against the installed Host.`)
}

// Node's own resolution from the package that depends on semver, so the same
// module instance the installed checker loaded is the one bound below. This is
// resolved from a file URL, never by package specifier: this repository has no
// dependency on semver of its own.
const requireFromAppBoot = createRequire(join(root, 'packages/boot/app-boot/package.json'))
const semverPath = requireFromAppBoot.resolve('semver')
/** The real `semver` module plus the range parser this repository's test needs. */
export const semver = requireFromAppBoot('semver') as SemverLike & { validRange(range: string): string | null }

// The vendored rule receives the very same implementation the Host resolves,
// so a difference between the two cannot come from two semver copies.
useSemver(semver)

const installed = await import(pathToFileURL(implementationPath).href) as CompatibilityModule

/**
 * Evaluate one manifest with the implementation the running Host ships.
 * @param manifest - parsed plugin package.json.
 * @param runtimeVersion - the dsh runtime version to check against.
 * @returns the unmet requirements, or undefined when compatible.
 */
export function installedCompatibility(
  manifest: object,
  runtimeVersion: string,
): PluginCompatibility | undefined {
  return installed.evaluatePluginCompatibility(manifest, {}, runtimeVersion)
}

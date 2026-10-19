/**
 * The two professional skills this plugin ships beside its Teams.
 *
 * A Team prompt can tell a role to follow a house style for repository
 * presentation or for Git delivery, but a prompt cannot make that style
 * *available*: it would have to restate the whole method in every role, and a
 * restated method drifts from the one the user actually reviewed. So the method
 * ships as a skill instead, and the roles name it.
 *
 * The bodies are plain `SKILL.md` bundles under `assets/skills`, which is what
 * the official bundled providers ship too. Registering them through
 * `ctx.skills` — rather than copying them into a user directory — is what keeps
 * install, upgrade, and removal honest: the files arrive and leave with the
 * package, no user directory is guessed, and a skill provider the deployment
 * composed still wins by rank.
 *
 * Nothing here is required for the plugin to work. A deployment that composes no
 * skill service simply gets the Teams without these two skills, and every role
 * prompt is written to keep working when the named skill is unavailable.
 * @module dsh-agent-team-presets/skills
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type { SkillCandidate, SkillProvider } from '@deepseek-ai/dsh-skill'

/**
 * Standard precedence rank for packaged skill providers.
 *
 * Mirrors the published `BUNDLED_SKILL_RANK` constant of the optional
 * `@deepseek-ai/dsh-skill` package. It is restated here as a plain number so
 * this module has no top-level VALUE import of that optional package: a
 * deployment that composes no skill service must still be able to load the
 * plugin entry (and with it every Team), and a static import would make the
 * whole `lib/index.js` unresolvable instead of merely disabling the skills.
 */
const BUNDLED_SKILL_RANK = 600

/** Provider name this plugin registers on `ctx.skills`. */
export const SKILL_PROVIDER = 'dsh-team-presets'

/** Every skill this plugin ships, in the order it lists them. */
export const SHIPPED_SKILLS = ['github-repository-presentation', 'git-release-hygiene'] as const

/** One shipped skill: the directory it lives in and the body it loads from. */
interface ShippedSkill {
  /** Kebab-case skill name, matching both the frontmatter and the directory. */
  readonly name: (typeof SHIPPED_SKILLS)[number]
  /** Absolute bundle directory, used as the resource base of the loaded skill. */
  readonly directory: string
  /** Absolute `SKILL.md` path. */
  readonly path: string
}

/**
 * Where the bundled skill documents live.
 *
 * Resolved from this module's own URL so a package installed anywhere — a
 * profile's `node_modules`, a pnpm store, or a source checkout — reads the
 * documents that shipped with it rather than a path from the machine that built
 * it.
 * @returns the absolute `assets/skills` directory.
 */
function skillRoot(): string {
  // Built output lives in `lib/`, one level below the package root.
  return join(dirname(dirname(fileURLToPath(import.meta.url))), 'assets', 'skills')
}

/**
 * Read one required frontmatter scalar.
 *
 * The shipped documents carry a deliberately simple frontmatter — one `key:
 * value` per line, no nesting, no quoting — so this reads it without pulling a
 * YAML parser into the Host entry. A document that stops matching that shape is
 * a build error here rather than a silent misparse at runtime.
 * @param frontmatter - the text between the two `---` fences.
 * @param key - field name to read.
 * @param path - document path, used only for the error message.
 * @returns the field's value.
 * @throws {Error} when the field is absent or empty.
 */
function readFrontmatterField(frontmatter: string, key: string, path: string): string {
  const line = frontmatter.split(/\r?\n/).find(row => row.startsWith(`${key}:`))
  const value = line === undefined ? '' : line.slice(key.length + 1).trim()
  if (value === '') throw new Error(`dsh-team-presets: ${path} has no ${key}`)
  return value
}

/**
 * Parse one shipped `SKILL.md`.
 *
 * The name must match the directory and the kebab-case grammar the registry
 * enforces, because a mismatch would list a skill the model can never load.
 * @param skill - the shipped skill to read.
 * @returns its name, description, and body.
 * @throws {Error} when the document is missing frontmatter or names another skill.
 */
function readSkill(skill: ShippedSkill): { name: string; description: string; content: string } {
  const raw = readFileSync(skill.path, 'utf8')
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(raw)
  if (match?.[1] === undefined) throw new Error(`dsh-team-presets: ${skill.path} has no frontmatter`)
  const name = readFrontmatterField(match[1], 'name', skill.path)
  if (name !== skill.name) {
    throw new Error(`dsh-team-presets: ${skill.path} names "${name}", expected "${skill.name}"`)
  }
  return {
    name,
    description: readFrontmatterField(match[1], 'description', skill.path),
    content: raw.slice(match[0].length).trim(),
  }
}

/**
 * Build the provider one deployment registers.
 *
 * Candidates are read once at registration and the body on each load, so an
 * edited document is picked up without re-registering — the same split the
 * filesystem provider makes between discovery and loading.
 * @param root - absolute `assets/skills` directory.
 * @returns the provider to register.
 */
export function shippedSkillProvider(root: string): SkillProvider {
  const skills: ShippedSkill[] = SHIPPED_SKILLS.map(name => ({
    name,
    directory: join(root, name),
    path: join(root, name, 'SKILL.md'),
  }))
  const candidates: SkillCandidate[] = skills.map((skill) => {
    const { description } = readSkill(skill)
    return {
      name: skill.name,
      description,
      invocation: { modelInvocable: true, userInvocable: true },
      provider: SKILL_PROVIDER,
      source: 'bundled',
      rank: BUNDLED_SKILL_RANK,
      resourceBase: { kind: 'directory', path: skill.directory },
      locator: skill.path,
    }
  })
  const byName = new Map(skills.map(skill => [skill.name, skill]))
  return {
    name: SKILL_PROVIDER,
    list: () => Promise.resolve(candidates),
    get: (candidate: SkillCandidate) => {
      const skill = byName.get(candidate.name as (typeof SHIPPED_SKILLS)[number])
      if (skill === undefined) return Promise.resolve(undefined)
      const body = readSkill(skill)
      return Promise.resolve({
        name: body.name,
        description: body.description,
        invocation: candidate.invocation,
        provider: SKILL_PROVIDER,
        source: 'bundled',
        resourceBase: candidate.resourceBase,
        content: body.content,
      })
    },
  }
}

/**
 * Register the shipped skills on the deployment's skill registry.
 *
 * Registration is optional by design: `ctx.inject` waits for `skills` and
 * re-runs if it is replaced, while a deployment that never composes one keeps
 * loading this plugin. A failure to read the bundled documents is logged rather
 * than thrown, because losing two advisory skills must not cost the user every
 * Team in the plugin.
 * @param ctx - the plugin context.
 * @param log - receives diagnostic text when the skills cannot be offered.
 */
export function installShippedSkills(ctx: Context, log: (message: string) => void): void {
  ctx.inject(['skills'], scope => scope.effect(() => {
    try {
      return scope.skills.registerProvider(() => shippedSkillProvider(skillRoot()))
    } catch (error: unknown) {
      log(`shipped skills are unavailable: ${String(error)}`)
      return () => {}
    }
  }, 'agent-team-presets: shipped skills'))
}

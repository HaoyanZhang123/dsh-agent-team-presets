/**
 * The two bundled skills: the documents that ship, and how they reach a model.
 *
 * The documents are checked against the files in `assets/skills`, and the
 * provider is checked as the registry sees it — a candidate list, one load per
 * skill, and a name that matches both the directory and the frontmatter. Nothing
 * here mounts a real registry: the contract under test is the provider's, and a
 * deployment that composes no skill service must keep working without it.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { SHIPPED_SKILLS, SKILL_PROVIDER, installShippedSkills, shippedSkillProvider } from '../src/skills.ts'

/** The bundled skill root, resolved the way the provider resolves it. */
function root(): string {
  return fileURLToPath(new URL('../assets/skills/', import.meta.url))
}

/** Read one document as the repository ships it. */
function document(name: string): string {
  return readFileSync(new URL(`../assets/skills/${name}/SKILL.md`, import.meta.url), 'utf8')
}

describe('bundled skill documents', () => {
  it('ships one frontmatter block per skill, named after its directory', () => {
    for (const name of SHIPPED_SKILLS) {
      const raw = document(name)
      const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(raw)
      expect(match, `${name} must start with frontmatter`).not.toBeNull()
      const frontmatter = match![1]!
      expect(frontmatter).toContain(`name: ${name}`)
      expect(frontmatter).toMatch(/^description: \S/mu)
      // The body is what a model reads; frontmatter is metadata, not instructions.
      expect(raw.slice(match![0].length).trim()).not.toBe('')
    }
  })

  it('ships exactly the two skills the role prompts name', () => {
    expect([...SHIPPED_SKILLS].sort()).toEqual(['git-release-hygiene', 'github-repository-presentation'])
  })
})

describe('the bundled skill provider', () => {
  it('lists every shipped skill as a bundled candidate with a resource base', async () => {
    const provider = shippedSkillProvider(root())
    expect(provider.name).toBe(SKILL_PROVIDER)
    const candidates = await provider.list({})
    expect(candidates.map(candidate => candidate.name)).toEqual([...SHIPPED_SKILLS])
    for (const candidate of candidates) {
      expect(candidate.provider).toBe(SKILL_PROVIDER)
      expect(candidate.source).toBe('bundled')
      expect(candidate.invocation).toEqual({ modelInvocable: true, userInvocable: true })
      expect(candidate.resourceBase).toMatchObject({ kind: 'directory' })
      // The description comes from the document, so a model routes on what the
      // author wrote rather than on a copy kept beside it.
      expect(candidate.description.length).toBeGreaterThan(0)
      expect(document(candidate.name)).toContain(`description: ${candidate.description}`)
    }
  })

  it('loads the body without the frontmatter', async () => {
    const provider = shippedSkillProvider(root())
    const [first] = await provider.list({})
    const loaded = await provider.get(first!, {})
    expect(loaded).toBeDefined()
    expect(loaded!.name).toBe(first!.name)
    expect(loaded!.provider).toBe(SKILL_PROVIDER)
    // A loaded skill must not restate its metadata as instructions.
    expect(loaded!.content.startsWith('---')).toBe(false)
    expect(loaded!.content).toContain('#')
  })

  it('returns undefined for a candidate it does not ship', async () => {
    const provider = shippedSkillProvider(root())
    const [first] = await provider.list({})
    const loaded = await provider.get({ ...first!, name: 'not-shipped' }, {})
    expect(loaded).toBeUndefined()
  })
})
describe('registering the skills on a deployment', () => {
  it('registers one provider when the deployment composes a skill registry', async () => {
    const ctx = new Context()
    const registered: string[] = []
    ctx.provide('skills', {
      registerProvider: (create: () => { name: string }) => {
        registered.push(create().name)
        return () => {}
      },
    })
    const warnings: string[] = []
    installShippedSkills(ctx, message => { warnings.push(message) })
    for (let round = 0; round < 3; round += 1) await new Promise<void>(resolve => { setTimeout(resolve, 0) })
    expect(registered).toEqual([SKILL_PROVIDER])
    expect(warnings).toEqual([])
    await ctx.fiber.dispose()
  })

  it('keeps loading a deployment that composes no skill registry', async () => {
    // The plugin must not wait on a service this deployment never provides, or
    // every Team would sit behind an optional skill.
    const ctx = new Context()
    const warnings: string[] = []
    installShippedSkills(ctx, message => { warnings.push(message) })
    for (let round = 0; round < 3; round += 1) await new Promise<void>(resolve => { setTimeout(resolve, 0) })
    expect(warnings).toEqual([])
    await ctx.fiber.dispose()
  })
})

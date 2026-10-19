/**
 * Model-facing Team Skill tools for the Session root.
 *
 * The page and the captain reach the same manager, so an assignment made here
 * obeys exactly the rules the page shows: a skill is bound to one role slot, a
 * delete is refused while anything still holds it, and a shipped skill is
 * read-only. Tools are registered on the root Agent only — a teammate must not
 * be able to grant itself skills, which is the whole point of the isolation.
 * @module dsh-agent-team-presets/team-skills/tools
 */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { InferValue, ValueSchemaSpec } from '@deepseek-ai/dsh-tools'
import type { TeamSkillManager } from './manager.ts'
import type { TeamSkillStore } from './store.ts'

/** One asset row these tools report. */
const ASSET_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    assetId: { type: 'string', required: true },
    skillId: { type: 'string', required: true },
    origin: { type: 'string', required: true },
    description: { type: 'string', required: true },
    editable: { type: 'boolean', required: true },
    bindingCount: { type: 'number', required: true },
  },
} as const

/** The library listing. */
const LIST_VALUE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    skills: { type: 'array', required: true, items: ASSET_SCHEMA },
    teams: {
      type: 'array',
      required: true,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          teamId: { type: 'string', required: true },
          name: { type: 'string', required: true },
          roles: { type: 'array', required: true, items: { type: 'string' } },
        },
      },
    },
    message: { type: 'string', required: true },
  },
} as const

/** One assignment result. */
const ASSIGN_VALUE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ok: { type: 'boolean', required: true },
    message: { type: 'string', required: true },
  },
} as const

/** One delete result, with every blocker the manager reported. */
const REMOVE_VALUE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ok: { type: 'boolean', required: true },
    blockers: { type: 'array', required: true, items: { type: 'string' } },
    message: { type: 'string', required: true },
  },
} as const

/** What the tools need from the plugin. */
export interface TeamSkillToolDeps {
  /** The asset store. */
  readonly store: TeamSkillStore
  /** The binding table and its guards. */
  readonly manager: TeamSkillManager
  /** Reads the Teams the page shows. */
  readonly teams: () => readonly { id: string; name: string; captain: { name: string }; members: readonly { id?: string; name: string }[] }[]
  /** Re-applies live Agents after a binding changed. */
  readonly resync: () => void
}

/**
 * Register the Team Skill tools on one root Agent.
 * @param ctx - the plugin context, for its logger.
 * @param agent - the Session root the tools belong to.
 * @param deps - the store, the manager, and the live roster.
 * @returns the disposer withdrawing all four tools.
 */
export function registerTeamSkillTools(ctx: Context, agent: Agent, deps: TeamSkillToolDeps): () => void {
  const jsonOutput = <const S extends ValueSchemaSpec>(schema: S) => ({
    schema,
    render: (_args: unknown, value: InferValue<S>): [{ type: 'text'; text: string }] => [{ type: 'text', text: JSON.stringify(value) }],
  })

  const disposers = [
    agent.ctx.tools.register(defineTool({
      name: 'list_team_skills',
      description: 'List the Team Skill library and every role slot a skill can be assigned to. A Team Skill is visible only to the Agent it is assigned to; this list is the plugin library, not the global Harness skills.',
      parameters: {},
      output: jsonOutput(LIST_VALUE_SCHEMA),
      execute() {
        const skills = deps.store.list().map(asset => ({
          assetId: asset.id,
          skillId: asset.skillId,
          origin: asset.origin,
          description: asset.description,
          editable: asset.origin !== 'builtin',
          bindingCount: deps.manager.bindingSummaries(asset.id).length,
        }))
        const teams = deps.teams().map(team => ({
          teamId: team.id,
          name: team.name === '' ? team.id : team.name,
          roles: ['captain', ...team.members.map(member => member.id ?? member.name)],
        }))
        ctx.logger.debug('agent-team-presets: list_team_skills served %d skill(s)', skills.length)
        return Promise.resolve({
          skills,
          teams,
          message: skills.length === 0
            ? 'The Team Skill library is empty. Import a folder on the Team skills page first.'
            : `${String(skills.length)} skill(s). Use assign_team_skill with a teamId and roleId from this list; a captain slot is addressed as "captain".`,
        })
      },
    })),
    agent.ctx.tools.register(defineTool({
      name: 'assign_team_skill',
      description: 'Assign one Team Skill to one role of one Team. The skill becomes discoverable only inside that Agent scope, never globally.',
      parameters: {
        team_id: { type: 'string', required: true, description: 'Team identity from list_team_skills.' },
        role_id: { type: 'string', required: true, description: 'Role identity from list_team_skills, or "captain".' },
        skill_id: { type: 'string', required: true, description: 'Asset identity (assetId) or skill name from list_team_skills.' },
      },
      output: jsonOutput(ASSIGN_VALUE_SCHEMA),
      async execute(args) {
        const asset = deps.store.get(args.skill_id) ?? deps.store.bySkillId(args.skill_id)
        if (asset === undefined) return { ok: false, message: `No Team Skill named "${args.skill_id}" is installed.` }
        const team = deps.teams().find(candidate => candidate.id === args.team_id)
        if (team === undefined) return { ok: false, message: `No Team "${args.team_id}" is configured.` }
        const result = await deps.manager.assign({
          teamId: team.id,
          roleId: args.role_id,
          assetId: asset.id,
          captain: args.role_id === 'captain',
        })
        if (!result.ok) return { ok: false, message: `The assignment was refused: ${result.reason}.` }
        deps.resync()
        return { ok: true, message: `"${asset.skillId}" is now assigned to ${team.name} → ${args.role_id}. Assigned skills are discovered through that Agent scope and are not registered globally.` }
      },
    })),
    agent.ctx.tools.register(defineTool({
      name: 'unassign_team_skill',
      description: 'Remove one Team Skill from one role slot.',
      parameters: {
        team_id: { type: 'string', required: true, description: 'Team identity.' },
        role_id: { type: 'string', required: true, description: 'Role identity, or "captain".' },
        skill_id: { type: 'string', required: true, description: 'Asset identity or skill name.' },
      },
      output: jsonOutput(ASSIGN_VALUE_SCHEMA),
      async execute(args) {
        const asset = deps.store.get(args.skill_id) ?? deps.store.bySkillId(args.skill_id)
        if (asset === undefined) return { ok: false, message: `No Team Skill named "${args.skill_id}" is installed.` }
        const removed = await deps.manager.unassign(args.team_id, args.role_id, asset.id)
        if (!removed) return { ok: false, message: 'That role did not hold this Team Skill.' }
        deps.resync()
        return { ok: true, message: `"${asset.skillId}" was removed from ${args.team_id} → ${args.role_id}.` }
      },
    })),
    agent.ctx.tools.register(defineTool({
      name: 'remove_team_skill',
      description: 'Delete one Team Skill from the library. Refused while a role still holds it, a running member uses it, or another skill depends on it; every reason is returned.',
      parameters: {
        skill_id: { type: 'string', required: true, description: 'Asset identity or skill name.' },
      },
      output: jsonOutput(REMOVE_VALUE_SCHEMA),
      async execute(args) {
        const asset = deps.store.get(args.skill_id) ?? deps.store.bySkillId(args.skill_id)
        if (asset === undefined) return { ok: true, blockers: [], message: `No Team Skill named "${args.skill_id}" is installed.` }
        const outcome = await deps.manager.remove(asset.id)
        if (!outcome.ok) {
          const blockers = outcome.blockers.map((blocker) => {
            if (blocker.kind === 'binding') return `bound to ${blocker.bindings.map(row => `${row.teamName} → ${row.roleName}`).join(', ')}`
            if (blocker.kind === 'active') return `in use by ${blocker.sessions.join(', ')}`
            if (blocker.kind === 'dependency') return `required by ${blocker.dependents.join(', ')}`
            return 'shipped with the plugin (read-only)'
          })
          return { ok: false, blockers, message: `"${asset.skillId}" was not deleted.` }
        }
        deps.resync()
        return { ok: true, blockers: [], message: `"${asset.skillId}" was deleted.` }
      },
    })),
  ]
  return () => { for (const dispose of disposers) dispose() }
}

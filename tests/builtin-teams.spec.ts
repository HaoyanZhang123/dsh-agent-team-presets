/**
 * The six Team presets this plugin ships: their documents, the one-time
 * install, and the restore Settings offers.
 *
 * The documents are checked against the copies a reader of this repository can
 * read, so the shipped content cannot drift from what `contrib/default-presets`
 * states. The install and restore rules are checked as pure list operations,
 * which is what both the Host pass and the page call.
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  AUDIT_TEAM_ID,
  BUILTIN_TEAMS,
  DISCOVERY_TEAM_ID,
  ENGINEERING_TEAM_ID,
  PLANNING_TEAM_ID,
  RESEARCH_TEAM_ID,
  WORKFLOW_TEAM_ID,
  builtinTeamDefinition,
  restoreBuiltinTeams,
  seedBuiltinTeams,
} from '../src/builtin-teams.ts'
import { exportTeamPreset, parseTeamPresetText } from '../src/preset-transfer.ts'
import type { TeamPreset } from '../src/types.ts'

/** Every shipped identity, in shipped order. */
const IDS = [DISCOVERY_TEAM_ID, PLANNING_TEAM_ID, WORKFLOW_TEAM_ID, ENGINEERING_TEAM_ID, AUDIT_TEAM_ID, RESEARCH_TEAM_ID]

/** One user-created Team the shipped presets must never touch. */
function userTeam(): TeamPreset {
  return {
    id: 'team-1',
    name: 'My own team',
    description: 'Built by hand',
    captain: {
      name: 'lead', color: '#123456', description: 'leads', toolMode: 'custom', tools: ['read'], systemPrompt: 'lead it',
    },
    members: [{
      id: 'own-member', name: 'helper', color: '', description: '', provider: 'p', model: 'm', reasoningEffort: 'high',
      toolMode: 'all', tools: [], systemPrompt: 'help',
    }],
  }
}

/** One stored copy of a shipped preset, edited the way a user would edit it. */
function editedShipped(): TeamPreset {
  const entry = BUILTIN_TEAMS[0]!
  const definition = builtinTeamDefinition(entry)
  const first = definition.members[0]!
  return {
    ...definition,
    name: 'Renamed by me',
    description: 'Rewritten purpose',
    captain: { ...definition.captain, description: 'my captain', systemPrompt: 'my captain prompt', toolMode: 'custom', tools: ['read'] },
    members: [
      // The shipped first member, keeping the route and policy the user set.
      { ...first, description: 'my member', systemPrompt: 'my member prompt', provider: 'deepseek', model: 'deepseek-chat', reasoningEffort: 'high', toolMode: 'custom', tools: ['write'] },
      // A member the user added, which a restore removes.
      {
        name: 'extra', color: '#000000', description: 'added by me', toolMode: 'all', tools: [], systemPrompt: 'extra',
        id: 'extra-member', provider: '', model: '', reasoningEffort: '',
      },
    ],
  }
}

/** Read one contrib document as the repository publishes it. */
function contrib(name: string): unknown {
  return JSON.parse(readFileSync(new URL(`../contrib/default-presets/${name}`, import.meta.url), 'utf8')) as unknown
}

describe('shipped default Team presets', () => {
  it('ships the six documents exactly as contrib publishes them', () => {
    const files = [
      'discovery-team.json',
      'planning-team.json',
      'workflow-team.json',
      'engineering-team.json',
      'audit-team.json',
      'research-team.json',
    ]
    expect(BUILTIN_TEAMS).toHaveLength(6)
    BUILTIN_TEAMS.forEach((entry, index) => {
      expect(exportTeamPreset(builtinTeamDefinition(entry)), entry.id).toEqual(contrib(files[index]!))
    })
  })

  it('publishes each contrib copy as a document this plugin imports', () => {
    // The README tells a reader they can import these by hand, so the copies
    // must be readable by the same reader an Import preset click uses.
    for (const file of [
      'discovery-team.json',
      'planning-team.json',
      'workflow-team.json',
      'engineering-team.json',
      'audit-team.json',
      'research-team.json',
    ]) {
      const text = readFileSync(new URL(`../contrib/default-presets/${file}`, import.meta.url), 'utf8')
      expect(parseTeamPresetText(text), file).toMatchObject({ ok: true })
    }
  })

  it('orders them the way a working session moves through the work modes', () => {
    expect(BUILTIN_TEAMS.map(entry => entry.id)).toEqual(IDS)
    expect(BUILTIN_TEAMS.map(entry => entry.document.team.name)).toEqual([
      '需求探索',
      '架构规划',
      '既定工作流执行',
      '工程研发协作',
      '独立代码与安全审计',
      '科研协作',
    ])
  })

  it('gives every shipped member a stable, unique role identity', () => {
    for (const entry of BUILTIN_TEAMS) {
      const definition = builtinTeamDefinition(entry)
      const ids = definition.members.map(member => member.id)
      expect(new Set(ids).size).toBe(ids.length)
      expect(ids).toEqual(definition.members.map(member => `${entry.id}:${member.name}`))
      // Two materializations describe the same roles, so restoring a preset
      // twice addresses the members a durable snapshot already bound.
      expect(builtinTeamDefinition(entry)).toEqual(definition)
    }
  })

  it('starts every shipped slot on the Session route and the default tool policy', () => {
    for (const entry of BUILTIN_TEAMS) {
      const definition = builtinTeamDefinition(entry)
      expect(definition.captain).not.toHaveProperty('provider')
      expect(definition.captain.toolMode).toBe('all')
      expect(definition.captain.tools).toEqual([])
      for (const member of definition.members) {
        expect(member.provider).toBe('')
        expect(member.model).toBe('')
        expect(member.reasoningEffort).toBe('')
        expect(member.toolMode).toBe('all')
        expect(member.tools).toEqual([])
      }
      expect(definition.members.length).toBeGreaterThan(0)
    }
  })
})

describe('installing the shipped presets once', () => {
  it('appends every shipped preset to a deployment that holds no Team, and marks them', () => {
    const seeded = seedBuiltinTeams([], [])
    expect(seeded.changed).toBe(true)
    expect(seeded.teams.map(team => team.id)).toEqual(IDS)
    expect(seeded.seeded).toEqual(IDS)
  })

  it('installs nothing once every shipped preset is marked', () => {
    const first = seedBuiltinTeams([], [])
    const second = seedBuiltinTeams(first.teams, first.seeded)
    expect(second.changed).toBe(false)
    expect(second.teams.map(team => team.id)).toEqual(IDS)
    expect(second.seeded).toEqual(IDS)
  })

  it('never reinstalls a preset the user deleted', () => {
    // The user was offered every shipped preset and deleted the second one.
    const remaining = BUILTIN_TEAMS.filter(entry => entry.id !== PLANNING_TEAM_ID).map(builtinTeamDefinition)
    const seeded = seedBuiltinTeams(remaining, IDS)
    expect(seeded.changed).toBe(false)
    expect(seeded.teams.map(team => team.id)).toEqual(IDS.filter(id => id !== PLANNING_TEAM_ID))
  })

  it('never overwrites a shipped preset the user edited', () => {
    const edited = editedShipped()
    const seeded = seedBuiltinTeams([edited], [])
    // The edited copy stays exactly as it was, and is now marked as offered.
    expect(seeded.teams[0]).toBe(edited)
    expect(seeded.seeded).toEqual(IDS)
    // The presets the deployment does not hold are appended behind it.
    expect(seeded.teams.map(team => team.id)).toEqual(IDS)
    expect(seeded.changed).toBe(true)
  })

  it('marks a preset the deployment already holds, without touching it or duplicating it', () => {
    const held = builtinTeamDefinition(BUILTIN_TEAMS[0]!)
    const seeded = seedBuiltinTeams([held], [
      PLANNING_TEAM_ID, WORKFLOW_TEAM_ID, ENGINEERING_TEAM_ID, AUDIT_TEAM_ID, RESEARCH_TEAM_ID,
    ])
    expect(seeded.changed).toBe(true)
    expect(seeded.teams).toEqual([held])
    // The marker is append-only: the newly marked preset joins at the end.
    expect(seeded.seeded).toEqual([
      PLANNING_TEAM_ID, WORKFLOW_TEAM_ID, ENGINEERING_TEAM_ID, AUDIT_TEAM_ID, RESEARCH_TEAM_ID, DISCOVERY_TEAM_ID,
    ])
    // One write is enough: the marker grew once, so the next pass is silent.
    expect(seedBuiltinTeams(seeded.teams, seeded.seeded).changed).toBe(false)
  })

  it('keeps a user Team first and appends the shipped presets behind it', () => {
    const own = userTeam()
    const seeded = seedBuiltinTeams([own], [])
    expect(seeded.teams.map(team => team.id)).toEqual(['team-1', ...IDS])
    expect(seeded.teams[0]).toBe(own)
  })
})

describe('restoring the shipped presets', () => {
  it('puts an edited shipped preset back at its document, keeping local routes and tool policies', () => {
    const edited = editedShipped()
    // Every other shipped preset is present and untouched, so only the edited
    // one is reported as changed.
    const others = BUILTIN_TEAMS.slice(1).map(builtinTeamDefinition)
    const restored = restoreBuiltinTeams([edited, ...others])
    expect(restored.changed).toEqual([DISCOVERY_TEAM_ID])
    const team = restored.teams[0]!
    expect(team.id).toBe(DISCOVERY_TEAM_ID)
    expect(team.name).toBe('需求探索')
    expect(team.description).toBe(BUILTIN_TEAMS[0]!.document.team.description)
    expect(team.captain.description).toBe(BUILTIN_TEAMS[0]!.document.team.captain.description)
    expect(team.captain.systemPrompt).toBe(BUILTIN_TEAMS[0]!.document.team.captain.systemPrompt)
    // The route and the tool policy are local, so the shipped name and prompts
    // come back while the configured model and allow-list stay.
    const member = team.members.find(entry => entry.name === 'technical-scout')!
    expect(member.provider).toBe('deepseek')
    expect(member.model).toBe('deepseek-chat')
    expect(member.reasoningEffort).toBe('high')
    expect(member.tools).toEqual(['write'])
    expect(member.description).toBe(BUILTIN_TEAMS[0]!.document.team.members[0]!.description)
    // A member the document does not name leaves the roster.
    expect(team.members.map(entry => entry.name)).toEqual(BUILTIN_TEAMS[0]!.document.team.members.map(entry => entry.name))
  })

  it('re-adds a shipped preset the user deleted, and reports only that identity', () => {
    const own = userTeam()
    const restored = restoreBuiltinTeams([own])
    expect(restored.changed).toEqual(IDS)
    expect(restored.teams.map(team => team.id)).toEqual(['team-1', ...IDS])
    // The user's Team is untouched, in content and in position.
    expect(restored.teams[0]).toEqual(own)
    expect(restored.teams[1]).toEqual(builtinTeamDefinition(BUILTIN_TEAMS[0]!))
  })

  it('reports nothing when every shipped preset already matches', () => {
    const teams = [userTeam(), ...BUILTIN_TEAMS.map(builtinTeamDefinition)]
    const restored = restoreBuiltinTeams(teams)
    expect(restored.changed).toEqual([])
    expect(restored.teams).toEqual(teams)
    // The restore is idempotent: the list a restore produced restores to itself.
    expect(restoreBuiltinTeams(restored.teams).changed).toEqual([])
  })

  it('never touches a Team the user created, even under a shipped name', () => {
    const sameName: TeamPreset = { ...userTeam(), name: BUILTIN_TEAMS[0]!.document.team.name }
    const restored = restoreBuiltinTeams([sameName])
    expect(restored.teams[0]).toEqual(sameName)
    // The shipped preset still joins it, because identity — not name — decides.
    expect(restored.teams.map(team => team.id)).toEqual(['team-1', ...IDS])
  })
})

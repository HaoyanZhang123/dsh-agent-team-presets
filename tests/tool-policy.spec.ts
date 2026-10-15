/** Persisted strict policy decoding never accepts malformed records as all tools. */
import { describe, expect, it } from 'vitest'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { descriptorPolicy, hasLegacyPresetBriefing } from '../src/tool-policy.ts'
const agentWith = (data: object): Agent => ({ session: { ownEvents: () => [{ type: 'subagent/descriptor', data }] } } as unknown as Agent)
describe('durable strict tool policy', () => {
  it('distinguishes plugin-authored legacy briefings from ordinary native member personas', () => {
    expect(hasLegacyPresetBriefing(agentWith({ mode: 'continuable', persona: 'You are "reviewer" on the Agent Team "Reviews".\n\nYour role: review' }))).toBe(true)
    expect(hasLegacyPresetBriefing(agentWith({ mode: 'continuable', persona: 'You are "member-1" (评审员) on the Agent Team "Reviews".' }))).toBe(true)
    expect(hasLegacyPresetBriefing(agentWith({ mode: 'continuable', persona: 'You are a native teammate.' }))).toBe(false)
    expect(hasLegacyPresetBriefing(agentWith({ mode: 'continuable' }))).toBe(false)
  })

  it('round-trips only a policy a legacy plugin version persisted in the descriptor', () => {
    // The trailer is a FROZEN legacy format: only reading it still matters,
    // because the current implementation keeps a member's policy in its own
    // durable snapshot instead of a model-visible persona trailer.
    const policy = { teamId: 'team-1', mode: 'custom' as const, allow: ['read', 'send_message'] }
    const persona = `review\n\n[team-presets-tool-policy:v1]${JSON.stringify(policy)}`
    expect(descriptorPolicy(agentWith({ mode: 'continuable', persona }))).toEqual(policy)
  })
  it('rejects an array masquerading as a custom policy mode', () => {
    expect(() => descriptorPolicy(agentWith({ mode: 'continuable', persona: '\n\n[team-presets-tool-policy:v1]{"teamId":"t","mode":["custom"],"allow":[]}' }))).toThrow('Invalid persisted')
  })
  it('rejects unknown policy versions instead of dropping their restriction', () => {
    expect(() => descriptorPolicy(agentWith({ mode: 'continuable', persona: '[team-presets-tool-policy:v2]{}' }))).toThrow('Unsupported')
  })
  it('upgrades legacy allow lists only for confirmed Team members', () => {
    const agent = agentWith({ mode: 'continuable', persona: 'legacy', toolFilter: { allow: ['read'] } })
    expect(descriptorPolicy(agent)).toBeUndefined()
    expect(descriptorPolicy(agent, true)).toEqual({ teamId: 'legacy-delegation', mode: 'custom', allow: ['read'] })
  })
  it('refuses all for a legacy Team filter without an allow contract', () => {
    const agent = agentWith({ mode: 'continuable', toolFilter: { deny: ['edit'] } })
    expect(descriptorPolicy(agent)).toBeUndefined()
    expect(descriptorPolicy(agent, true)?.allow).toEqual([])
  })
})

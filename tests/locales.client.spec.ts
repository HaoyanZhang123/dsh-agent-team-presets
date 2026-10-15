/** Locale bundles for the Team presets page and the composer control. */

import { describe, expect, it } from 'vitest'
import { en, NS, zh } from '../src/client/locales.ts'
import { FORM_ISSUE_KEYS, SELECTION_FAILURE_KEYS, selectionFailureText } from '../src/client/locales.ts'
import type { TeamPresetsFormIssue, TeamSelectionFailure } from '../src/client/team-presets-controller.ts'

describe('Team preset locale bundles', () => {
  it('owns one settings namespace', () => {
    expect(NS).toBe('settings.agentTeamPresets')
  })

  it('keeps the same key set in both languages', () => {
    expect(Object.keys(zh).sort()).toEqual(Object.keys(en).sort())
  })

  it('ships no empty copy, so no consumer can render a blank control', () => {
    for (const [key, copy] of Object.entries({ ...en, ...zh })) {
      expect(copy.trim(), key).not.toBe('')
    }
  })

  it('describes the two tool policies distinctly', () => {
    expect(en.toolsDefault).not.toBe(en.toolsCustom)
    expect(zh.toolsDefault).not.toBe(zh.toolsCustom)
  })

  it('names every way the stored section can be unusable, in both languages', () => {
    const issues: TeamPresetsFormIssue[] = ['settings-unavailable', 'namespace-missing', 'schema-rejected']
    for (const issue of issues) {
      const key = FORM_ISSUE_KEYS[issue]
      expect(en[key].trim(), key).not.toBe('')
      expect(zh[key].trim(), key).not.toBe('')
    }
    // Three different conditions with three different owners must not collapse
    // into one message: the reader has to know which one to act on.
    expect(new Set(Object.values(FORM_ISSUE_KEYS)).size).toBe(issues.length)
  })

  it('reports every selection failure kind, and keeps the Host\'s own refusal text', () => {
    const kinds: TeamSelectionFailure['kind'][] = ['unavailable', 'refused', 'failed']
    for (const kind of kinds) {
      const key = SELECTION_FAILURE_KEYS[kind]
      expect(en[key].trim(), key).not.toBe('')
      expect(zh[key].trim(), key).not.toBe('')
    }
    const refusal: TeamSelectionFailure = {
      kind: 'refused', sessionId: 's1', teamId: 'team-1', detail: 'Config field "selections" is not volatile',
    }
    expect(selectionFailureText(refusal, key => en[key])).toContain('Config field "selections" is not volatile')
    // A failure with no Host text still renders a complete sentence.
    expect(selectionFailureText({ ...refusal, detail: undefined }, key => zh[key])).toBe(zh.selectionRefused)
    expect(selectionFailureText({ ...refusal, detail: '' }, key => zh[key])).toBe(zh.selectionRefused)
  })
})

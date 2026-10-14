/**
 * Structural guard for the settings footer layout.
 *
 * The footer lays its status notes and its two action buttons out on one flex
 * row. Before the actions were isolated, a long execution notice (the `busy` and
 * `unknown` states) shrank the buttons with it: `放弃修改` and `保存` wrapped to
 * one character per line and spilled out of their 28px box, in exactly the state
 * the release gate asks a reviewer to read.
 *
 * Layout cannot be asserted without a browser, so this file guards the one
 * declaration that caused it and the browser pass remains the real proof. It
 * fails if the wrapper is dropped or loses `flex-shrink: 0`, which is the
 * refactor that would silently bring the bug back.
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(
  new URL('../src/client/TeamPresetsSection.module.css', import.meta.url),
  'utf8',
)

/** The body of one CSS rule, or `undefined` when the rule is absent. */
function ruleBody(selector: string): string | undefined {
  const match = new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`).exec(css)
  return match?.[1]
}

describe('settings footer layout', () => {
  it('keeps the action buttons out of the notes\' flex shrink', () => {
    const body = ruleBody('.footerActions')
    expect(body, 'the footer needs an actions wrapper').toBeDefined()
    expect(body).toContain('flex-shrink: 0')
  })

  it('keeps the button labels on one line', () => {
    expect(ruleBody('.footerActions')).toContain('white-space: nowrap')
  })

  it('still lets the notes shrink and wrap, so they yield instead of the buttons', () => {
    const notes = ruleBody('.footerNotes')
    expect(notes).toContain('min-width: 0')
    expect(notes).not.toContain('flex-shrink: 0')
  })
})

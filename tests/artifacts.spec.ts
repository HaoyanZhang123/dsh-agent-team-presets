/** Built package smoke tests: loader registration and strict generated wire faces. */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { parseTeamPresetText } from '../src/preset-transfer.ts'

describe('built deliverables', () => {
  it('loads the browser factory with only declared shared dependencies', () => {
    let registration: { id: string; factory: (require: (id: string) => object) => object } | undefined
    runInNewContext(readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8'), {
      window: { __ModuleLoader__: { load: (row: typeof registration) => { registration = row } } },
    })
    expect(registration?.id).toBe('dsh-agent-team-presets')
    const requests: string[] = []
    const exports = registration!.factory(id => {
      requests.push(id)
      if (id === 'react/jsx-runtime') return { jsx: () => null, jsxs: () => null, Fragment: Symbol() }
      if (id === 'react') return { createContext: () => ({}) }
      if (id === '@deepseek-ai/dsh-client-store') return { createStore: () => ({}) }
      if (id === '@deepseek-ai/dsh-client-ui-primitives') return {}
      throw new Error(`Undeclared loader import: ${id}`)
    })
    expect(exports).toHaveProperty('apply')
    expect(exports).toHaveProperty('TEAM_PRESETS_NS', 'agent-team-presets')
    expect(requests).not.toContain('zod')
  })
  it('keeps direct catalog and cancellable execution stream companions', () => {
    const remote = readFileSync(new URL('../lib/typert.remote-client.js', import.meta.url), 'utf8')
    expect(remote).toContain("method: 'catalog'")
    expect(remote).toContain("invocation: { kind: 'direct' }")
    expect(remote).toContain("mode: 'stream'")
    expect(remote).toContain("cancellation: { parameter: 'signal' }")
    expect(remote).toContain("package: 'dsh-agent-team-presets'")
  })
  it('accepts the slim full-stack proposal as a shareable import', () => {
    const json = readFileSync(new URL('../contrib/full-stack-team.slim.v1.json', import.meta.url), 'utf8')
    expect(parseTeamPresetText(json)).toMatchObject({ ok: true, transfer: { team: { name: '全栈软件研发团队' } } })
  })
})

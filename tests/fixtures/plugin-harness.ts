/**
 * Shared doubles for the host services this plugin's member path depends on.
 *
 * Two things changed for every Host-side spec: the plugin mounts only where the
 * deployment composes `subagents` (it is in the plugin's `inject` list, exactly
 * as a deployment that composes Teams provides it), and one Session's Team is
 * now applied through a queued job rather than synchronously. This module keeps
 * both facts in one place instead of repeating them in each fixture.
 */

import type {} from '@deepseek-ai/dsh-subagent'

/**
 * Let the plugin's queued work settle before an assertion.
 *
 * Every queued step — the member execution aliases, the settings migration, and
 * one Session's Team application — resolves on microtasks, and the application
 * job awaits the effective prompt assembly before it installs anything. A
 * handful of macrotask turns therefore drains them deterministically without
 * polling an assertion.
 * @returns resolution once every queued step has had its turn.
 */
export async function settlePlugin(): Promise<void> {
  for (let round = 0; round < 3; round += 1) {
    await new Promise<void>((resolve) => { setTimeout(resolve, 0) })
  }
}

/** Knobs for {@link subagentServiceDouble}. */
export interface SubagentDoubleOptions {
  /** Provider names this deployment registers. Defaults to the plugin's own defaults. */
  readonly providers?: readonly string[]
  /** Absolute delegation depth cap the deployment resolves. Defaults to 2. */
  readonly maxDepth?: number | undefined
}

/**
 * Minimal stand-in for the official `subagents` service.
 *
 * The plugin registers one delegating alias per configured provider and asks
 * for the deployment's depth cap, so the double answers exactly those two
 * questions. It never runs a child: a spec that needs real member execution
 * mounts the official `Subagents` plus a real provider instead.
 * @param options - provider names and the resolved depth cap.
 * @returns a service object suitable for `ctx.provide('subagents', …)`.
 */
export function subagentServiceDouble(options: SubagentDoubleOptions = {}): Record<string, unknown> {
  const providers = options.providers ?? ['spawn', 'fork']
  const provider = (name: string): Record<string, unknown> => ({
    name,
    capabilities: { agentOptions: true, outputSchema: false, depthLimit: true, toolFilter: true, persona: true },
    inheritsParentContext: name !== 'spawn',
    // Presence of this method IS the continuable capability.
    prepareContinuable: async () => ({}),
    start: async () => { throw new Error('the subagent double does not run children') },
  })
  return {
    registerProvider: () => () => {},
    getProvider: (name: string) => providers.includes(name) ? provider(name) : undefined,
    list: () => [...providers],
    resolveMaxDepth: () => options.maxDepth ?? 2,
    drainContinuableChildren: async () => {},
    drainContinuableDescendants: async () => {},
  }
}

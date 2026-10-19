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

/**
 * Wait until one Session root's Team application has installed its captain
 * surface.
 *
 * Host 0.2.1 queues the application and awaits the effective prompt assembly
 * before installing anything, so a fixed number of macrotasks is not a
 * deterministic barrier. The member tool is registered by that installation, so
 * its presence is the observable settlement point.
 * @param ctx - the composed test context.
 * @param agent - the Session-root Agent whose application is awaited.
 * @param timeoutMs - upper bound before the helper fails the case.
 * @returns resolution once the application installed the captain surface.
 * @throws when the application did not settle in time.
 */
export async function waitForTeamApplication(
  ctx: { tools: { get: (name: string, agent: unknown) => unknown } },
  agent: unknown,
  timeoutMs = 5000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (ctx.tools.get('spawn_team_member', agent) !== undefined) {
      // The registration happens inside the application; a strict custom
      // policy is only released after the effective surface is read once more,
      // so let that short tail settle before the caller drives the tool.
      await settlePlugin()
      return
    }
    await new Promise<void>((resolve) => { setTimeout(resolve, 5) })
  }
  throw new Error('the Team application did not settle before the deadline')
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
    drainChildren: async () => {},
    drainDescendants: async () => {},
  }
}

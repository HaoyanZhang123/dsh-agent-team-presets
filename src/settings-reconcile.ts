/**
 * Minimal, revision-fenced reconcile of this plugin's own settings document.
 *
 * One startup pass owns every repair the plugin makes to the stored Teams,
 * because they all rewrite the same `teams` array and two writers would race
 * each other's revision fence:
 *
 * - the legacy captain route, which no current schema declares,
 * - a member identity a stored record never carried,
 * - the shipped default presets, installed once per deployment.
 *
 * The pass never touches Session policy, and it writes only when a repair
 * really applies. Read-only and conflict errors are not retried for the same
 * document: the caller notifies again when the document, the Teams value, or the
 * shipped-defaults marker changes.
 * @module dsh-agent-team-presets/settings-reconcile
 */

import type { Context } from '@deepseek-ai/cordis'
import { randomUUID } from 'node:crypto'
import type {} from '@deepseek-ai/dsh-settings'
import { seedBuiltinTeams } from './builtin-teams.ts'
import type { Config } from './config.ts'
import { withoutCaptainRoutes } from './config.ts'

/** Coalesce startup/config edges into one in-flight write and one latest recheck. */
export function teamSettingsReconcile(ctx: Context, config: Config, namespace: string): {
  request(): Promise<void>
  dispose(): void
} {
  let disposed = false
  let running = false
  let requested = false
  let attempted: string | undefined
  return {
    async request() {
      if (disposed) return
      if (running) { requested = true; return }
      running = true
      try {
        do {
          requested = false
          if (disposed) break
          // Read the revision before the synchronous Config snapshot. A LOADING
          // settings entry is absent: the caller retries after activation.
          const descriptor = ctx.settings.describe().find(row => row.ns === namespace)
          if (descriptor === undefined) break
          const teams = config.teams.get()
          const seeded = config.seededDefaults.get()
          const cleaned = withoutCaptainRoutes(teams).map(team => {
            const used = new Set<string>()
            let changed = false
            const members = team.members.map(member => {
              if (member.id !== undefined && member.id !== '' && !used.has(member.id)) {
                used.add(member.id)
                return member
              }
              changed = true
              const id = randomUUID()
              used.add(id)
              return { ...member, id }
            })
            return changed ? { ...team, members } : team
          })
          // The shipped defaults are appended, never substituted: a preset the
          // user edited keeps every edit, and one the user deleted stays deleted
          // because its identity was marked when it was first offered.
          const installed = seedBuiltinTeams(cleaned, seeded)
          const cleanedChanged = cleaned.length !== teams.length
            || cleaned.some((team, index) => team !== teams[index])
          if (!cleanedChanged && !installed.changed) continue
          const identity = JSON.stringify([descriptor.revision, teams, seeded])
          // Read-only/conflict errors are not retried for the same document.
          // A changed revision, Teams value, or marker admits one fresh attempt.
          if (identity === attempted) continue
          attempted = identity
          try {
            await ctx.settings.update(namespace, {
              teams: installed.teams,
              seededDefaults: [...installed.seeded],
            }, descriptor.revision)
          } catch (error: unknown) {
            ctx.logger.warn('agent-team-presets: settings reconcile refused; normal Sessions remain unaffected: %s', String(error))
          }
        } while (requested && !disposed)
      } catch (error: unknown) {
        // A discovery/preparation failure is diagnostic-only too. The scheduled
        // caller never receives an unhandled rejection that could stop the Host.
        ctx.logger.warn('agent-team-presets: could not prepare settings reconcile; normal Sessions remain unaffected: %s', String(error))
      } finally { running = false }
    },
    // Settings.update has no cancellation parameter. A write already admitted
    // may settle, but disposal prevents every queued/new retry.
    dispose() { disposed = true; requested = false },
  }
}

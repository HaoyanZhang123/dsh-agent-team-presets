/**
 * Agent Team presets: configure reusable Teams in Settings, pick one per
 * Session from the composer, and let its captain summon configured members.
 *
 * The Host half owns the live configuration, applies a selected Team to its
 * Session, and registers the member tool. A Team task owns the definition it
 * started with: while the captain runs or any teammate is running or
 * provisioning, the Session keeps the application it has and adopts the latest
 * stored definition only between Team tasks. Two groups of fields are outside
 * that definition because they are read from the stored Team when they are
 * needed rather than captured with it: a member's model route, which a task
 * therefore picks up for the next member it summons, and the accent colors the
 * roster draws with. A captain runs on the model the Session already selected;
 * only members carry a configurable route. The `./client` half renders the
 * Settings page and the composer control over the same `agent-team-presets`
 * settings namespace.
 * @module dsh-agent-team-presets
 */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/cordis-plugin-loader'
import type {} from '@deepseek-ai/dsh-experimental-agent-team'
import type {} from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-settings'
import type {} from '@deepseek-ai/dsh-system-prompt'
import { applyTeamToAgent, assertTeamApplicable, capabilityRefusal } from './application.ts'
import type { TeamApplication, TeamApplicationOptions } from './application.ts'
import { MemberRuntime } from './member-runtime.ts'
import type { MemberClaim } from './member-runtime.ts'
import { createdDepthRefusal } from './delegation.ts'
import { isPresetMemberProvider, memberProviderMarker, registerMemberProviders } from './member-identity.ts'
import { installNativePresentation, personaBaseline, prepareNativePresentation, readWire } from './presentation.ts'
import type { Config } from './config.ts'
import { teamSettingsReconcile } from './settings-reconcile.ts'
import { isSessionRoot, TeamExecutionMonitor, teammatesBusy } from './execution.ts'
import { RUN_CODE_NAME } from '@deepseek-ai/dsh-tools'
import type { SessionId } from '@deepseek-ai/dsh-session'
import { registerPresetTools } from './preset-tools.ts'
import { installShippedSkills } from './skills.ts'
import { definitionFingerprint, findTeam, selectedTeam, toolMode } from './presets.ts'
import type { TeamPreset } from './types.ts'
import TeamPresetsToolCatalog from './tool-catalog.ts'
import { descriptorPolicy, guardPolicy, hasLegacyPresetBriefing, policyOf } from './tool-policy.ts'

export type * from './types.ts'
export { Config } from './config.ts'
export type { ToolCatalogValue, ToolChoice } from './types.ts'

/** Cordis plugin name. */
export const name = 'agent-team-presets'

/** Settings entry this plugin owns and rewrites when stored Teams are stale. */
const NAMESPACE = 'agent-team-presets'

/**
 * Services this plugin reads: the Session agents it composes, the Team service
 * it summons members through, the tool registry its member and preset tools
 * join, the prompt sections its captain adds, the session projections that
 * authenticate a preset write, and the settings document it owns.
 */
export const inject = ['agents', 'agentTeams', 'tools', 'systemPrompt', 'sessionProjections', 'settings', 'subagents']

/** Diagnostics prefix for the failures this plugin only reports. */
const LOG = 'agent-team-presets'

/**
 * Apply one valid Team preset to one live Session, and keep it current between
 * that Session's Team tasks.
 * @param ctx - the plugin context providing the Session, Team, tool, prompt, and settings services.
 * @param config - the live configuration whose volatile values carry the stored Teams.
 */
export function apply(ctx: Context, config: Config): void {
  const applications = new Map<Agent, TeamApplication>()
  const definitions = new Map<Agent, ReturnType<typeof selectedTeam>>()
  const quarantines = new Map<Agent, { reason: string; dispose: () => void }>()
  const childPolicies = new Map<Agent, () => void>()
  const childEnvelopes = new Map<Agent, ReturnType<typeof policyOf>>()
  /** Teammates whose scoped configuration the durable member runtime installed. */
  const managedMembers = new Set<Agent>()
  // Member snapshots are durable and owned by this activation: a member whose
  // snapshot cannot be read is never created, and one that IS identified with a
  // damaged snapshot vetoes its own creation instead of running on defaults.
  const members = new MemberRuntime(ctx)
  // Every member is summoned through this plugin's own execution alias, so the
  // Host itself persists the fact that the child is preset-managed. The aliases
  // delegate the whole provider contract to the deployment's providers, and
  // this registry keeps them in step with a provider registry that may still be
  // filling up: a provider that activates after this plugin is picked up, and a
  // replaced or withdrawn one is rebound or refused, without restarting.
  const providers = registerMemberProviders(
    ctx,
    { fresh: config.freshProvider, fork: config.forkProvider },
    (context, state, reason) => {
      // `missing` is the expected state while a provider plugin is still
      // loading, so it is not an incident here. It is still the refusal a member
      // creation reports if it is asked for one in that window.
      if (state === 'registration' || state === 'unsupported' || state === 'alias' || state === 'unconfigured') {
        ctx.logger.warn(`${LOG}: ${context} Team members are unavailable: %s`, reason)
      }
    },
  )
  ctx.effect(() => () => { providers.dispose() }, 'agent-team-presets: member execution aliases')
  // The skills the shipped role prompts name. Offered, never required: a
  // deployment without a skill service keeps loading every Team.
  installShippedSkills(ctx, message => { ctx.logger.warn(`${LOG}: %s`, message) })
  const quarantine = (agent: Agent, reason: string): void => {
    const previous = quarantines.get(agent)
    if (previous !== undefined) { previous.reason = reason; return }
    const state = { reason, dispose: () => {} }
    state.dispose = agent.ctx.tools.guard(() => state.reason)
    quarantines.set(agent, state)
  }
  const recovery = 'Choose another valid Team or "No team" in this Session\'s composer Team control. Changes apply once the captain and its teammates are idle.'
  /**
   * Refuse one child: inside the serial `agent/created` transaction a throw
   * aborts creation before the member's first request; a child that is already
   * live cannot be refused retroactively without leaking the registrations its
   * own activation installed, so it is quarantined instead.
   */
  const refuseChild = (agent: Agent, live: boolean, reason: string): void => {
    if (!live) throw new Error(reason)
    ctx.logger.warn(`${LOG}: %s`, reason)
    quarantine(agent, reason)
  }
  const initializeChild = (agent: Agent, live: boolean): void => {
    if (isSessionRoot(agent) || childPolicies.has(agent) || managedMembers.has(agent)) return
    // The child's OWN establishing descriptor comes first: it is where the Host
    // itself persisted the execution backend this member was created through.
    // A child carrying this plugin's alias is preset-managed even when no
    // snapshot can be read, so it can never be mistaken for a native teammate.
    const managed = isPresetMemberProvider(memberProviderMarker(agent))
    let membership: ReturnType<typeof ctx.agentTeams.tryMembership>
    try {
      membership = ctx.agentTeams.tryMembership(agent)
    } catch (error: unknown) {
      // A marked child whose Team identity cannot be resolved is never explained
      // away as an ordinary child: it is refused before its first request.
      if (managed) throw new Error(`Preset-managed child "${agent.id}" could not be resolved from the Team roster: ${String(error)}`)
      throw error
    }
    if (managed && membership?.role !== 'teammate') {
      refuseChild(agent, live, `The Host records child "${agent.id}" as created through this plugin's member backend, `
        + 'but it belongs to no Team roster in this Session. It is refused rather than resumed without its frozen configuration.')
      return
    }
    if (membership?.role === 'teammate') {
      // A member this plugin created is identified by its durable marker and its
      // snapshot; native teammates and provider-owned workers stay upstream-owned.
      let claim: MemberClaim
      try {
        claim = members.claim(agent, { root: membership.root, name: membership.name }, managed)
      } catch (error: unknown) {
        const reason = `Preset-managed teammate "${membership.name}" could not be initialised with its frozen `
          + `configuration: ${String(error)}`
        if (!live) throw new Error(reason)
        ctx.logger.warn(`${LOG}: %s`, reason)
        quarantine(agent, reason)
        return
      }
      if (claim.kind === 'installed') {
        // A record that had no child yet is a NEW generation: the delegation
        // depth cap is re-read on this creation edge, and a member the current
        // settings no longer allow is refused before its first request. A record
        // already bound to this same child is a cold resume of an existing
        // member, not another generation, and is never invalidated by a
        // lowered cap.
        if (claim.record.lifecycle === 'intent' && claim.record.childSessionId === undefined) {
          const refusal = createdDepthRefusal(ctx, agent)
          if (refusal !== undefined) {
            members.release(agent)
            refuseChild(agent, live, refusal)
            return
          }
        }
        managedMembers.add(agent)
        // Ordinary descendants of this member must still see its strict policy,
        // so an escape through a provider path stays refused.
        childEnvelopes.set(agent, {
          teamId: claim.record.teamId,
          mode: claim.record.policy.mode,
          allow: [...claim.record.policy.allow],
        })
        return
      }
      if (claim.kind === 'invalid') {
        // Identified as managed with an unusable snapshot: refuse before any
        // model request rather than run it on the deployment default.
        if (!live) throw new Error(claim.reason)
        ctx.logger.warn(`${LOG}: %s`, claim.reason)
        quarantine(agent, claim.reason)
        return
      }
    }
    // Upstream native teammates are not this plugin's legacy continuations.
    // Upgrade only the historical briefing this plugin authored.
    const legacyPreset = membership?.role === 'teammate' && hasLegacyPresetBriefing(agent)
    const declared = descriptorPolicy(agent, legacyPreset)
    if (declared !== undefined) {
      childPolicies.set(agent, guardPolicy(agent, declared))
      childEnvelopes.set(agent, declared)
      return
    }
    const parentId = agent.session.header.parentSession
    const parent = parentId === undefined ? undefined : ctx.agents.get(parentId)
    if (parent === undefined) return
    // A child that is already live cannot be refused retroactively without
    // leaking the registrations this plugin installed for its parent on the
    // same failed activation, so the startup scan quarantines it instead.
    // Only the serial `agent/created` transaction may veto before a request.
    const refuse = (reason: string): void => {
      if (!live) throw new Error(reason)
      ctx.logger.warn(`${LOG}: %s`, reason)
      quarantine(agent, reason)
    }
    if (quarantines.has(parent)) {
      refuse('Parent Team policy is quarantined; child creation is refused.')
      return
    }
    // A legacy all-tools Team member is intentionally independent of its
    // captain's custom policy. Ordinary descendants, unlike Team slots, inherit.
    if (membership?.role === 'teammate') {
      if (!legacyPreset) {
        // Ordinary native Teams below unselected/all-tools roots stay upstream-
        // owned. Under a strict root, an unmarked creation is not an escape.
        const parentDefinition = definitions.get(parent)
        if (parentDefinition !== undefined && policyOf(parentDefinition.id, parentDefinition.captain).mode === 'custom') {
          refuse('Custom Team policy requires preset-managed child creation; unmarked native members are refused.')
        }
        return
      }
      const legacyAll = { teamId: 'legacy-team', mode: 'all' as const, allow: [] }
      childPolicies.set(agent, guardPolicy(agent, legacyAll))
      childEnvelopes.set(agent, legacyAll)
      return
    }
    const parentDeclared = childEnvelopes.get(parent) ?? descriptorPolicy(parent)
    const rootDefinition = definitions.get(parent)
    const inherited = parentDeclared ?? (rootDefinition === undefined ? undefined : policyOf(rootDefinition.id, rootDefinition.captain))
    if (inherited?.mode === 'custom') {
      refuse('Custom Team policy requires preset-managed child creation; ordinary delegation cannot preserve its strict policy.')
    }
  }
  // Editing tools belong only to selected/applied Team roots by default.
  // Pre-selection editing is an explicit legacy compatibility opt-in.
  const presetTools = new Map<Agent, () => void>()
  /** Session roots whose durable roster settlement waits for the next microtask. */
  const pendingRoster = new Set<Agent>()
  let rosterScheduled = false
  let disposed = false

  // The settings page lists the tools an allow-list may name and streams the
  // execution state it must promise against; both are Remote services, so the
  // browser never guesses a tool name or an execution state.
  const monitor = new TeamExecutionMonitor(ctx, {
    config,
    applied: agent => applications.get(agent),
  })
  ctx.plugin(TeamPresetsToolCatalog, { monitor })
  ctx.effect(() => () => { monitor.dispose() }, 'agent-team-presets: execution monitor')

  // The settings page owns this entry's editing surface, so the Plugins page
  // must not also generate a form for it.
  ctx.effect(() => ctx.settings.configure({ auto: false }, ctx.fiber), 'agent-team-presets: page policy')

  /**
   * Resolve the Session root one Agent's lifecycle edge belongs to.
   * @param agent - the Agent whose status changed.
   * @returns the Agent itself for a Session root, its Team root for a teammate, or undefined.
   */
  const rootOf = (agent: Agent): Agent | undefined => {
    if (isSessionRoot(agent)) return agent
    const membership = ctx.agentTeams.tryMembership(agent)
    return membership?.role === 'teammate' ? membership.root : undefined
  }

  /**
   * Adopt the latest stored definition into one Session, and re-read what the
   * settings page must promise.
   * @param agent - the Session-root Agent to reconcile.
   * @param startingTask - whether this call runs on a root's own wake-up edge.
   */
  const reconcile = (agent: Agent, startingTask = false): void => {
    adopt(agent, startingTask)
    // Any edge that can adopt, drop, or freeze a definition changes what the
    // settings page must promise, so the stream is re-read once per turn.
    monitor.invalidate()
  }

  /** One serialized Team-application job per Session root. */
  interface ApplicationJob {
    /** Monotonic identity of the newest requested application for that root. */
    readonly epoch: number
    /** Settlement of that application, chained behind the root's previous one. */
    readonly promise: Promise<void>
  }
  const jobs = new Map<Agent, ApplicationJob>()

  /**
   * Options that declare a custom Team's native presentation at the Agent scope.
   *
   * The install is part of the application's rollback region: releasing the
   * application releases the declaration with it.
   * @param agent - the Agent the Team is applied to.
   * @param disclosure - locale key of the effective presentation, when it replaced another one.
   * @returns the application options.
   */
  const presentationOptions = (agent: Agent, disclosure?: string): TeamApplicationOptions => ({
    presentation: {
      ...disclosure === undefined ? {} : { disclosure },
      install: () => installNativePresentation(agent),
    },
  })

  /**
   * Report one refused application.
   *
   * A rejected update never lifts the last effective capability policy: the
   * previous application stays installed, and only a Session that has none is
   * quarantined until Settings supplies a valid definition.
   */
  const refuseTeam = (agent: Agent, team: TeamPreset, reason: string): void => {
    ctx.logger.warn(`${LOG}: Team "%s" was refused for Session "%s": %s`, team.id, agent.session.id, reason)
    if (!applications.has(agent)) quarantine(agent, `${reason} ${recovery}`)
  }

  /**
   * Re-install the policy a refused update must not lift.
   *
   * A previous application that had declared its own native presentation has to
   * declare it again here, because releasing that application released the
   * declaration with it. One that merely found the surface already native needs
   * no declaration, and asking for one would risk the very false conflict the
   * preparation step exists to avoid.
   * @param agent - the Session-root Agent.
   * @param previous - the definition that was installed before the refusal.
   * @param redeclareNative - whether that application owned a native declaration.
   */
  const restorePrevious = (
    agent: Agent,
    previous: TeamPreset | undefined,
    redeclareNative: boolean,
  ): void => {
    if (previous === undefined) return
    try {
      const options = toolMode(previous.captain) === 'custom' && redeclareNative
        ? presentationOptions(agent)
        : {}
      applications.set(agent, applyTeamToAgent(
        ctx, agent, previous, providers, () => findTeam(config.teams.get(), previous.id), members, options,
      ))
      definitions.set(agent, previous)
    } catch (error: unknown) {
      ctx.logger.warn(
        `${LOG}: the previous Team "%s" could not be restored for Session "%s": %s`,
        previous.id, agent.session.id, String(error),
      )
    }
  }

  /**
   * Apply one Team after its asynchronous preparation.
   *
   * Nothing of the new application is installed until every check has passed,
   * and the effective wire is read once more after the commit: a strict custom
   * policy is only considered applied when the surface it governs really is the
   * native one, so a declaration that silently lost to another presentation is
   * rolled back instead of being trusted.
   * @param agent - the Session-root Agent.
   * @param team - the definition to apply.
   * @param epoch - identity of this application, so a superseded one stops.
   */
  const commit = async (agent: Agent, team: TeamPreset, epoch: number): Promise<void> => {
    const superseded = (): boolean => disposed || jobs.get(agent)?.epoch !== epoch
    // The effective wire is read BEFORE anything of this application exists: an
    // active complete deployment persona must be recognized from its own text,
    // never from a section this plugin already installed.
    const before = await readWire(agent)
    if (superseded()) return
    let options: TeamApplicationOptions = {}
    if (team.captain.systemPrompt.trim() === '' && before !== undefined) {
      const baseline = personaBaseline(before.sections)
      if (baseline.kind === 'foreign') {
        refuseTeam(agent, team, `the deployment composes a complete prompt section this plugin cannot re-declare safely `
          + `("${baseline.name}"), so this Team could not be made visible to its captain`)
        return
      }
      // The official `minimal` preset declares its persona complete, which would
      // reduce the whole prompt to that one section. Re-declaring its exact text
      // without `complete` keeps the preset's wording and tool set while letting
      // this Team's briefing participate.
      if (baseline.kind === 'persona') options = { personaFallback: baseline.text }
    }
    // The tools catalog is every standing preset's union, not what THIS Session
    // composes, so an unreachable allow-listed capability is refused here rather
    // than silently widened.
    const missing = capabilityRefusal(agent, team)
    if (missing !== undefined) {
      refuseTeam(agent, team, missing)
      return
    }
    if (toolMode(team.captain) === 'custom') {
      const presentation = await prepareNativePresentation(agent)
      if (superseded()) return
      if (presentation.kind === 'conflict' || presentation.kind === 'unknown') {
        refuseTeam(agent, team, presentation.reason)
        return
      }
      // Only an actual override needs a declaration of its own: a surface that is
      // already native is left exactly as the deployment composed it, so this can
      // never be mistaken for a conflict with a same-scope native declaration.
      if (presentation.kind === 'installable') options = { ...options, ...presentationOptions(agent, presentation.disclosure) }
    }
    // The definition is validated before the running application is released,
    // so a preset this Session cannot take never leaves it without one.
    try {
      assertTeamApplicable(agent, team)
    } catch (error: unknown) {
      refuseTeam(agent, team, `application failed validation: ${String(error)}`)
      return
    }
    if (superseded()) return
    const previous = definitions.get(agent)
    const previousApplication = applications.get(agent)
    previousApplication?.dispose()
    applications.delete(agent)
    try {
      // The route is read from the stored Team at spawn time, not captured here:
      // a member's model route is recovery-relevant and outside the definition a
      // running Team task freezes.
      const application = applyTeamToAgent(
        ctx, agent, team, providers, () => findTeam(config.teams.get(), team.id), members, options,
      )
      applications.set(agent, application)
      definitions.set(agent, team)
      if (toolMode(team.captain) === 'custom') {
        const after = await readWire(agent)
        if (after === undefined || after.tools.includes(RUN_CODE_NAME)) {
          application.dispose()
          applications.delete(agent)
          definitions.delete(agent)
          restorePrevious(agent, previous, previousApplication?.presentationNote !== undefined)
          refuseTeam(agent, team, after === undefined
            ? 'the effective tool surface could not be read after the native presentation was installed'
            : 'the effective tool surface still exposes the general purpose PTC transport after the native presentation '
              + 'was installed, so a strict custom policy cannot govern it')
          return
        }
      }
      quarantines.get(agent)?.dispose()
      quarantines.delete(agent)
      monitor.invalidate()
    } catch (error: unknown) {
      applications.delete(agent)
      definitions.delete(agent)
      restorePrevious(agent, previous, previousApplication?.presentationNote !== undefined)
      refuseTeam(agent, team, `application failed: ${String(error)}`)
    }
  }

  /**
   * Queue one application for a Session root, serialized per root.
   *
   * A newer request supersedes an older one through its epoch, and a Session
   * that has no current application stays denied while its first one is being
   * prepared instead of running on the deployment default.
   * @param agent - the Session-root Agent.
   * @param team - the definition to apply.
   */
  const schedule = (agent: Agent, team: TeamPreset): void => {
    const epoch = (jobs.get(agent)?.epoch ?? 0) + 1
    if (!applications.has(agent)) {
      quarantine(agent, `Team "${team.id}" is being validated for this Session; tool access is paused until it is applied. ${recovery}`)
    }
    const prior = jobs.get(agent)?.promise ?? Promise.resolve()
    const promise = prior
      .then(async () => {
        if (disposed || jobs.get(agent)?.epoch !== epoch) return
        await commit(agent, team, epoch)
      })
      .catch((error: unknown) => {
        ctx.logger.warn(
          `${LOG}: applying Team "%s" to Session "%s" failed unexpectedly: %s`,
          team.id, agent.session.id, String(error),
        )
      })
    jobs.set(agent, { epoch, promise })
    void promise.then(() => { monitor.invalidate() })
  }

  /**
   * Adopt the latest stored definition into one Session between its Team tasks.
   *
   * A Team task owns the definition it started with, so the captain's persona
   * section, briefing section, member roster, tool scope, and allow-list stay
   * one frozen snapshot while the captain runs or any teammate is running or
   * provisioning. A member's model route and each slot's accent color are not
   * part of that snapshot: both are read from the stored Team when they are
   * needed, so correcting a route reaches the next member the task summons.
   * The frozen snapshot is the preset object this application captured: a
   * settings write replaces the volatile value instead of mutating it, so the
   * captured Team cannot drift.
   *
   * A root that just woke up is about to assemble its next request, which is
   * the last moment a new definition can still reach it; it therefore counts as
   * between tasks unless a teammate is still running the previous one. Every
   * other edge only re-checks whether the Session became idle enough to adopt.
   * @param agent - the Session-root Agent to adopt into.
   * @param startingTask - whether this call runs on a root's own wake-up edge.
   */
  const adopt = (agent: Agent, startingTask: boolean): void => {
    if (disposed) return
    const selectedId = config.selections.get().find(row => row.sessionId === agent.session.id)?.teamId
    // The preset tools are the discovery path, not a Team capability: a user can
    // ask the captain to adjust "the Team preset" before this Session selects
    // one, and the captain must be able to read the configured Teams and ask
    // which one. They therefore belong to every Session root, exactly as before
    // any Team is selected.
    if (!presetTools.has(agent)) {
      presetTools.set(agent, registerPresetTools(ctx, agent, config, NAMESPACE, root => applications.get(root)?.teamId))
    }
    const busy = startingTask ? teammatesBusy(ctx, agent) : agent.status === 'running' || teammatesBusy(ctx, agent)
    if (busy) {
      // A remount cannot reconstruct the previous frozen root definition from
      // current Settings. Quarantine until a task boundary, never adopt a newly
      // widened policy into an already-running task.
      if (!applications.has(agent) && selectedId !== undefined) quarantine(agent, `Team "${selectedId}" cannot be safely restored into an already-running task; tools are paused until its task boundary. ${recovery}`)
      return
    }
    const team = selectedTeam(config.teams.get(), config.selections.get(), agent.session.id)
    const current = applications.get(agent)
    if (team === undefined) {
      current?.dispose()
      applications.delete(agent)
      definitions.delete(agent)
      quarantines.get(agent)?.dispose()
      quarantines.delete(agent)
      if (selectedId !== undefined) {
        quarantine(agent, `Selected Team "${selectedId}" no longer exists. This is not "No team"; tool access stays denied. ${recovery}`)
      }
      return
    }
    const fingerprint = definitionFingerprint(team)
    if (current !== undefined && current.teamId === team.id && current.fingerprint === fingerprint) return
    // The synchronous probes own which names an allow-list may carry; the
    // asynchronous preparation that follows owns the effective surface. A
    // refusal here leaves the running application untouched. The capability
    // check runs first so the operator reads the actionable reason (which names
    // the Session's own reach) instead of the registry's generic one.
    const unreachable = capabilityRefusal(agent, team)
    if (unreachable !== undefined) {
      refuseTeam(agent, team, unreachable)
      return
    }
    try {
      assertTeamApplicable(agent, team)
    } catch (error: unknown) {
      if (current === undefined) quarantine(agent, `Team "${team.id}" application failed validation; no tools were granted. ${recovery}`)
      ctx.logger.warn(`${LOG}: Team "%s" was refused for Session "%s": %s`, team.id, agent.session.id, String(error))
      return
    }
    schedule(agent, team)
  }

  /**
   * Stop the members this plugin owns, grouped by their exact Team root.
   *
   * Only the children this activation recorded are drained: draining a whole
   * descendant tree would also stop upstream-owned work the plugin never
   * installed, and the Team service offers the selective call for exactly this
   * case.
   * @returns resolution once every recorded child has been asked to stop.
   */
  const drainManagedChildren = async (): Promise<void> => {
    const subagents = ctx.get('subagents')
    if (subagents === undefined) {
      // The whole Host is going down and its subagent service is already gone,
      // so the members it owns are being disposed with it. Reported rather than
      // passed over silently, because this activation did not stop them.
      if (managedMembers.size > 0) {
        ctx.logger.warn(`${LOG}: %d managed Team member(s) were not drained because the subagent service was already released.`, managedMembers.size)
      }
      return
    }
    const byRoot = new Map<Agent, SessionId[]>()
    for (const agent of [...managedMembers]) {
      const membership = ctx.agentTeams.tryMembership(agent)
      if (membership?.role !== 'teammate') continue
      byRoot.set(membership.root, [...byRoot.get(membership.root) ?? [], agent.id])
    }
    for (const [root, ids] of byRoot) {
      try {
        await subagents.drainChildren(root, ids)
      } catch (error: unknown) {
        ctx.logger.warn(
          `${LOG}: managed members of Session "%s" could not be drained: %s`, root.session.id, String(error),
        )
      }
    }
  }

  // The teardown owner is installed before any existing Agent is initialized.
  // Registrations go through `agent.ctx`, whose lifetime outlives a failing
  // plugin fiber, so a throw during the scan would otherwise leave guards and
  // exact-Agent tools installed with no disposer to drain them.
  //
  // The order is deliberate and idempotent: creation admission closes first, so
  // no late tool call can start a member nothing would own; admitted creations
  // and queued applications settle next; only then are the members this
  // activation installed stopped through the official drain; the durable unit
  // closes last. Member-scoped guards are never removed before their member is
  // stopped — they belong to `agent.ctx` and unwind with the residency.
  let shutdown: Promise<void> | undefined
  const teardown = (): Promise<void> => {
    shutdown ??= (async () => {
      disposed = true
      const queued = [...jobs.values()].map(job => job.promise)
      await members.closeAdmission()
      await Promise.allSettled(queued)
      await drainManagedChildren()
      monitor.dispose()
      for (const application of applications.values()) application.dispose()
      applications.clear()
      definitions.clear()
      for (const state of quarantines.values()) state.dispose()
      quarantines.clear()
      for (const dispose of childPolicies.values()) dispose()
      childPolicies.clear()
      childEnvelopes.clear()
      managedMembers.clear()
      for (const dispose of presetTools.values()) dispose()
      presetTools.clear()
      pendingRoster.clear()
      jobs.clear()
      await members.close()
    })()
    return shutdown
  }
  ctx.effect(() => () => teardown(), 'agent-team-presets: ordered shutdown')

  // The stored document is reconciled once at startup: a document written while
  // captains still owned a route is cleaned, a member identity it never carried
  // is added, and the shipped default presets are installed for the first time.
  // HMR can mount after Host ready. The next task crosses Cordis activation,
  // whose LOADING entry is intentionally absent from settings.describe().
  const settingsReconcile = teamSettingsReconcile(ctx, config, NAMESPACE)
  const reconcileTimer = setTimeout(() => { if (!disposed) void settingsReconcile.request() }, 0)
  ctx.effect(() => () => { clearTimeout(reconcileTimer); settingsReconcile.dispose() }, 'agent-team-presets: settings reconcile readiness')

  for (const agent of ctx.agents.list()) {
    if (isSessionRoot(agent)) reconcile(agent)
    else initializeChild(agent, true)
  }
  // The durable unit opens asynchronously, so one synchronous scan cannot see a
  // member's snapshot yet. A member already live at activation — an HMR
  // remount, a resumed Session — is therefore claimed as soon as the store
  // answers. It has already started, so an unusable snapshot quarantines it;
  // the creation veto stays reserved for the serial creation edge.
  void members.whenReady().then(() => {
    if (disposed) return
    for (const agent of ctx.agents.list()) {
      if (!isSessionRoot(agent)) initializeChild(agent, true)
    }
  })
  ctx.on('agent/created', async ({ agent }) => {
    if (isSessionRoot(agent)) { reconcile(agent); return }
    initializeChild(agent, false)
    // A member the runtime just claimed is known by its exact Team identity, so
    // the durable binding is written inside this awaited creation transaction.
    if (managedMembers.has(agent)) {
      const membership = ctx.agentTeams.tryMembership(agent)
      if (membership?.role === 'teammate') await members.bind(agent, { root: membership.root, name: membership.name })
    }
  })
  ctx.on('agent/disposed', ({ agent }) => {
    applications.get(agent)?.dispose()
    applications.delete(agent)
    definitions.delete(agent)
    quarantines.get(agent)?.dispose()
    quarantines.delete(agent)
    childPolicies.get(agent)?.()
    childPolicies.delete(agent)
    childEnvelopes.delete(agent)
    managedMembers.delete(agent)
    members.release(agent)
    presetTools.get(agent)?.()
    presetTools.delete(agent)
    pendingRoster.delete(agent)
    jobs.delete(agent)
    monitor.invalidate()
  })
  ctx.on('loader/volatile-update', () => {
    for (const agent of ctx.agents.list()) {
      if (isSessionRoot(agent)) reconcile(agent)
    }
    if (!disposed) void settingsReconcile.request()
    // A stored change moves the frame even when no Session is online to adopt it.
    monitor.invalidate()
  })
  // The captain running, a teammate running or provisioning, and either of them
  // going idle are the edges that decide whether a Session is inside a Team
  // task. A teammate's edge reaches the root through the roster, so a member
  // finishing can be what releases its Session's frozen definition.
  ctx.on('agent/status', ({ agent, status }) => {
    const root = rootOf(agent)
    if (root === undefined) return
    reconcile(root, isSessionRoot(agent) && status === 'running')
  })
  // A teammate that never got a live child settles in the durable journal
  // instead of through `agent/status`. The phase is read on the next microtask,
  // so the projection has folded the append this listener just saw, and several
  // settlements in one append batch cost one read.
  ctx.on('session/event', (session, event) => {
    if (event.type !== 'team/member') return
    const agent = ctx.agents.get(session.id)
    if (agent === undefined || !isSessionRoot(agent)) return
    pendingRoster.add(agent)
    if (rosterScheduled) return
    rosterScheduled = true
    queueMicrotask(() => {
      rosterScheduled = false
      const roots = [...pendingRoster]
      pendingRoster.clear()
      for (const root of roots) reconcile(root)
    })
  })
}

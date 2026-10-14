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
import { applyTeamToAgent, assertTeamApplicable } from "./application.js";
import { teamSettingsMigration } from "./settings-migration.js";
import { isSessionRoot, TeamExecutionMonitor, teammatesBusy } from "./execution.js";
import { registerPresetTools } from "./preset-tools.js";
import { definitionFingerprint, findTeam, selectedTeam } from "./presets.js";
import TeamPresetsToolCatalog from "./tool-catalog.js";
import { descriptorPolicy, guardPolicy, hasLegacyPresetBriefing, policyOf } from "./tool-policy.js";
export { Config } from "./config.js";
/** Cordis plugin name. */
export const name = 'agent-team-presets';
/** Settings entry this plugin owns and rewrites when stored Teams are stale. */
const NAMESPACE = 'agent-team-presets';
/**
 * Services this plugin reads: the Session agents it composes, the Team service
 * it summons members through, the tool registry its member and preset tools
 * join, the prompt sections its captain adds, the session projections that
 * authenticate a preset write, and the settings document it owns.
 */
export const inject = ['agents', 'agentTeams', 'tools', 'systemPrompt', 'sessionProjections', 'settings'];
/** Diagnostics prefix for the failures this plugin only reports. */
const LOG = 'agent-team-presets';
/**
 * Apply one valid Team preset to one live Session, and keep it current between
 * that Session's Team tasks.
 * @param ctx - the plugin context providing the Session, Team, tool, prompt, and settings services.
 * @param config - the live configuration whose volatile values carry the stored Teams.
 */
export function apply(ctx, config) {
    const providers = { fresh: config.freshProvider, fork: config.forkProvider };
    const applications = new Map();
    const definitions = new Map();
    const quarantines = new Map();
    const childPolicies = new Map();
    const childEnvelopes = new Map();
    const quarantine = (agent, reason) => {
        const previous = quarantines.get(agent);
        if (previous !== undefined) {
            previous.reason = reason;
            return;
        }
        const state = { reason, dispose: () => { } };
        state.dispose = agent.ctx.tools.guard(() => state.reason);
        quarantines.set(agent, state);
    };
    const recovery = 'Choose another valid Team or "No team" in this Session\'s composer Team control. Changes apply once the captain and its teammates are idle.';
    const initializeChild = (agent, live) => {
        if (isSessionRoot(agent) || childPolicies.has(agent))
            return;
        const membership = ctx.agentTeams.tryMembership(agent);
        // Upstream native teammates are not this plugin's legacy continuations.
        // Upgrade only the historical briefing this plugin authored.
        const legacyPreset = membership?.role === 'teammate' && hasLegacyPresetBriefing(agent);
        const declared = descriptorPolicy(agent, legacyPreset);
        if (declared !== undefined) {
            childPolicies.set(agent, guardPolicy(agent, declared));
            childEnvelopes.set(agent, declared);
            return;
        }
        const parentId = agent.session.header.parentSession;
        const parent = parentId === undefined ? undefined : ctx.agents.get(parentId);
        if (parent === undefined)
            return;
        // A child that is already live cannot be refused retroactively without
        // leaking the registrations this plugin installed for its parent on the
        // same failed activation, so the startup scan quarantines it instead.
        // Only the serial `agent/created` transaction may veto before a request.
        const refuse = (reason) => {
            if (!live)
                throw new Error(reason);
            ctx.logger.warn(`${LOG}: %s`, reason);
            quarantine(agent, reason);
        };
        if (quarantines.has(parent)) {
            refuse('Parent Team policy is quarantined; child creation is refused.');
            return;
        }
        // A legacy all-tools Team member is intentionally independent of its
        // captain's custom policy. Ordinary descendants, unlike Team slots, inherit.
        if (membership?.role === 'teammate') {
            if (!legacyPreset) {
                // Ordinary native Teams below unselected/all-tools roots stay upstream-
                // owned. Under a strict root, an unmarked creation is not an escape.
                const parentDefinition = definitions.get(parent);
                if (parentDefinition !== undefined && policyOf(parentDefinition.id, parentDefinition.captain).mode === 'custom') {
                    refuse('Custom Team policy requires preset-managed child creation; unmarked native members are refused.');
                }
                return;
            }
            const legacyAll = { teamId: 'legacy-team', mode: 'all', allow: [] };
            childPolicies.set(agent, guardPolicy(agent, legacyAll));
            childEnvelopes.set(agent, legacyAll);
            return;
        }
        const parentDeclared = childEnvelopes.get(parent) ?? descriptorPolicy(parent);
        const rootDefinition = definitions.get(parent);
        const inherited = parentDeclared ?? (rootDefinition === undefined ? undefined : policyOf(rootDefinition.id, rootDefinition.captain));
        if (inherited?.mode === 'custom') {
            refuse('Custom Team policy requires preset-managed child creation; ordinary delegation cannot preserve its strict policy.');
        }
    };
    // Editing tools belong only to selected/applied Team roots by default.
    // Pre-selection editing is an explicit legacy compatibility opt-in.
    const presetTools = new Map();
    /** Session roots whose durable roster settlement waits for the next microtask. */
    const pendingRoster = new Set();
    let rosterScheduled = false;
    let disposed = false;
    // The settings page lists the tools an allow-list may name and streams the
    // execution state it must promise against; both are Remote services, so the
    // browser never guesses a tool name or an execution state.
    const monitor = new TeamExecutionMonitor(ctx, {
        config,
        applied: agent => applications.get(agent),
    });
    ctx.plugin(TeamPresetsToolCatalog, { monitor });
    ctx.effect(() => () => { monitor.dispose(); }, 'agent-team-presets: execution monitor');
    // The settings page owns this entry's editing surface, so the Plugins page
    // must not also generate a form for it.
    ctx.effect(() => ctx.settings.configure({ auto: false }, ctx.fiber), 'agent-team-presets: page policy');
    /**
     * Resolve the Session root one Agent's lifecycle edge belongs to.
     * @param agent - the Agent whose status changed.
     * @returns the Agent itself for a Session root, its Team root for a teammate, or undefined.
     */
    const rootOf = (agent) => {
        if (isSessionRoot(agent))
            return agent;
        const membership = ctx.agentTeams.tryMembership(agent);
        return membership?.role === 'teammate' ? membership.root : undefined;
    };
    /**
     * Adopt the latest stored definition into one Session, and re-read what the
     * settings page must promise.
     * @param agent - the Session-root Agent to reconcile.
     * @param startingTask - whether this call runs on a root's own wake-up edge.
     */
    const reconcile = (agent, startingTask = false) => {
        adopt(agent, startingTask);
        // Any edge that can adopt, drop, or freeze a definition changes what the
        // settings page must promise, so the stream is re-read once per turn.
        monitor.invalidate();
    };
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
    const adopt = (agent, startingTask) => {
        if (disposed)
            return;
        const selectedId = config.selections.get().find(row => row.sessionId === agent.session.id)?.teamId;
        // The preset tools are the discovery path, not a Team capability: a user can
        // ask the captain to adjust "the Team preset" before this Session selects
        // one, and the captain must be able to read the configured Teams and ask
        // which one. They therefore belong to every Session root, exactly as before
        // any Team is selected.
        if (!presetTools.has(agent)) {
            presetTools.set(agent, registerPresetTools(ctx, agent, config, NAMESPACE, root => applications.get(root)?.teamId));
        }
        const busy = startingTask ? teammatesBusy(ctx, agent) : agent.status === 'running' || teammatesBusy(ctx, agent);
        if (busy) {
            // A remount cannot reconstruct the previous frozen root definition from
            // current Settings. Quarantine until a task boundary, never adopt a newly
            // widened policy into an already-running task.
            if (!applications.has(agent) && selectedId !== undefined)
                quarantine(agent, `Team "${selectedId}" cannot be safely restored into an already-running task; tools are paused until its task boundary. ${recovery}`);
            return;
        }
        const team = selectedTeam(config.teams.get(), config.selections.get(), agent.session.id);
        const current = applications.get(agent);
        if (team === undefined) {
            current?.dispose();
            applications.delete(agent);
            definitions.delete(agent);
            quarantines.get(agent)?.dispose();
            quarantines.delete(agent);
            if (selectedId !== undefined) {
                quarantine(agent, `Selected Team "${selectedId}" no longer exists. This is not "No team"; tool access stays denied. ${recovery}`);
            }
            return;
        }
        const fingerprint = definitionFingerprint(team);
        if (current !== undefined && current.teamId === team.id && current.fingerprint === fingerprint)
            return;
        // The definition is validated before the running application is released,
        // so a preset this Session cannot take never leaves it without one.
        try {
            assertTeamApplicable(agent, team);
        }
        catch (error) {
            // A rejected update must never lift the last effective capability policy.
            // Keep the previous application; a first application failure is quarantined
            // below until Settings supplies a valid definition.
            if (current === undefined)
                quarantine(agent, `Team "${team.id}" application failed validation; no tools were granted. ${recovery}`);
            ctx.logger.warn(`${LOG}: Team "%s" was refused for Session "%s": %s`, team.id, agent.session.id, String(error));
            return;
        }
        const previous = definitions.get(agent);
        current?.dispose();
        applications.delete(agent);
        try {
            // The route is read from the stored Team at spawn time, not captured here:
            // a member's model route is recovery-relevant and outside the definition a
            // running Team task freezes.
            applications.set(agent, applyTeamToAgent(ctx, agent, team, providers, () => findTeam(config.teams.get(), team.id)));
            definitions.set(agent, team);
            quarantines.get(agent)?.dispose();
            quarantines.delete(agent);
        }
        catch (error) {
            if (previous !== undefined) {
                try {
                    applications.set(agent, applyTeamToAgent(ctx, agent, previous, providers, () => findTeam(config.teams.get(), previous.id)));
                }
                catch {
                    quarantine(agent, `Team "${team.id}" application failed and the previous policy could not be restored; tools remain denied. ${recovery}`);
                }
            }
            else
                quarantine(agent, `Team "${team.id}" application failed; tools remain denied. ${recovery}`);
            ctx.logger.warn(`${LOG}: applying Team "%s" to Session "%s" failed: %s`, team.id, agent.session.id, String(error));
        }
    };
    // The teardown owner is installed before any existing Agent is initialized.
    // Registrations go through `agent.ctx`, whose lifetime outlives a failing
    // plugin fiber, so a throw during the scan would otherwise leave guards and
    // exact-Agent tools installed with no disposer to drain them.
    ctx.effect(() => () => {
        disposed = true;
        monitor.dispose();
        for (const application of applications.values())
            application.dispose();
        applications.clear();
        definitions.clear();
        for (const state of quarantines.values())
            state.dispose();
        quarantines.clear();
        for (const dispose of childPolicies.values())
            dispose();
        childPolicies.clear();
        childEnvelopes.clear();
        for (const dispose of presetTools.values())
            dispose();
        presetTools.clear();
        pendingRoster.clear();
    }, 'agent-team-presets: session applications');
    // A document stored while captains still owned a route is cleaned once, so a
    // Session is never composed from a Team shape this plugin no longer applies.
    // HMR can mount after Host ready. The next task crosses Cordis activation,
    // whose LOADING entry is intentionally absent from settings.describe().
    const migration = teamSettingsMigration(ctx, config, NAMESPACE);
    const migrationTimer = setTimeout(() => { if (!disposed)
        void migration.request(); }, 0);
    ctx.effect(() => () => { clearTimeout(migrationTimer); migration.dispose(); }, 'agent-team-presets: migration readiness');
    for (const agent of ctx.agents.list()) {
        if (isSessionRoot(agent))
            reconcile(agent);
        else
            initializeChild(agent, true);
    }
    ctx.on('agent/created', ({ agent }) => {
        if (isSessionRoot(agent))
            reconcile(agent);
        else
            initializeChild(agent, false);
    });
    ctx.on('agent/disposed', ({ agent }) => {
        applications.get(agent)?.dispose();
        applications.delete(agent);
        definitions.delete(agent);
        quarantines.get(agent)?.dispose();
        quarantines.delete(agent);
        childPolicies.get(agent)?.();
        childPolicies.delete(agent);
        childEnvelopes.delete(agent);
        presetTools.get(agent)?.();
        presetTools.delete(agent);
        pendingRoster.delete(agent);
        monitor.invalidate();
    });
    ctx.on('loader/volatile-update', () => {
        for (const agent of ctx.agents.list()) {
            if (isSessionRoot(agent))
                reconcile(agent);
        }
        if (!disposed)
            void migration.request();
        // A stored change moves the frame even when no Session is online to adopt it.
        monitor.invalidate();
    });
    // The captain running, a teammate running or provisioning, and either of them
    // going idle are the edges that decide whether a Session is inside a Team
    // task. A teammate's edge reaches the root through the roster, so a member
    // finishing can be what releases its Session's frozen definition.
    ctx.on('agent/status', ({ agent, status }) => {
        const root = rootOf(agent);
        if (root === undefined)
            return;
        reconcile(root, isSessionRoot(agent) && status === 'running');
    });
    // A teammate that never got a live child settles in the durable journal
    // instead of through `agent/status`. The phase is read on the next microtask,
    // so the projection has folded the append this listener just saw, and several
    // settlements in one append batch cost one read.
    ctx.on('session/event', (session, event) => {
        if (event.type !== 'team/member')
            return;
        const agent = ctx.agents.get(session.id);
        if (agent === undefined || !isSessionRoot(agent))
            return;
        pendingRoster.add(agent);
        if (rosterScheduled)
            return;
        rosterScheduled = true;
        queueMicrotask(() => {
            rosterScheduled = false;
            const roots = [...pendingRoster];
            pendingRoster.clear();
            for (const root of roots)
                reconcile(root);
        });
    });
}

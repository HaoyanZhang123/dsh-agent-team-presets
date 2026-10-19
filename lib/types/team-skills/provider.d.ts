/**
 * Per-member Team Skill visibility.
 *
 * The one rule this module exists to enforce: a Team Skill is visible to the
 * exact Agent it was assigned to, and to nobody else. The DSH skill registry is
 * layered by Cordis scope, and a read merges the global layer with the viewing
 * Agent's own chain, so registering a provider *inside a scope keyed by that
 * Agent* is what makes the assignment real. Registering on the plugin context
 * would put the provider in the global layer and expose it to every Session in
 * the deployment — the failure mode v0.1.6 exists to remove.
 *
 * Registration is therefore a lifecycle, not a startup step: it happens when the
 * assigned Agent is created or resumed, and it is disposed when that Agent is
 * disposed. Only the candidate list is scoped — a skill's body is read when the
 * model actually loads it, so discovery costs a name and a description.
 * @module dsh-agent-team-presets/team-skills/provider
 */
import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { TeamSkillAsset } from '../types.ts';
import type { TeamSkillStore } from './store.ts';
/** Provider name this plugin registers inside one Agent's scope. */
export declare const TEAM_SKILL_PROVIDER = "dsh-team-skills";
/** What one Agent's registration needs. */
export interface AgentSkillBinding {
    /** The Agent whose scope receives the provider. */
    readonly agent: Agent;
    /** Assets assigned to that Agent's role. */
    readonly assets: readonly TeamSkillAsset[];
}
/**
 * Remove the YAML frontmatter from one skill body.
 *
 * The registry renders the body, not the document; the frontmatter has already
 * been surfaced as the candidate's name and description.
 * @param text - the whole `SKILL.md`.
 * @returns the instruction body.
 */
export declare function stripFrontmatter(text: string): string;
/** Installs and releases per-Agent Team Skill providers. */
export declare class TeamSkillRuntime {
    private readonly ctx;
    private readonly log;
    private readonly live;
    /** The assignment each Agent is *supposed* to have, authoritative immediately. */
    private readonly desired;
    private readonly store;
    private disposed;
    /**
     * @param ctx - the plugin context scopes are minted under.
     * @param store - the asset store bodies are read from.
     * @param log - receives diagnostic text when a registration cannot be made.
     */
    constructor(ctx: Context, store: TeamSkillStore, log: (message: string) => void);
    /**
     * Whether this deployment can scope skill providers at all.
     * @returns whether the skill service is composed and exposes a provider registry.
     */
    get available(): boolean;
    /**
     * Install or replace one Agent's registration.
     *
     * An empty assignment releases any previous registration, so removing the
     * last skill from a role takes effect on the next turn instead of leaving a
     * stale provider behind.
     *
     * `inject` runs its callback once the service is readable, which may be a
     * later tick than this call, so the intended assignment is recorded first and
     * the actual scope is installed by the callback. The callback re-checks the
     * intent before installing, because a second assignment may have replaced it
     * meanwhile.
     * @param binding - the Agent and the assets it should see.
     * @returns resolution once the registration is installed (or immediately when
     *   there is nothing to install). Callers that drive a UI may await it; the
     *   runtime lifecycle does not, because the intent is authoritative at once.
     */
    sync(binding: AgentSkillBinding): Promise<void>;
    /** Settlers for assignments whose `inject` callback has not run yet. */
    private readonly pendingSettle;
    /** The inject fibers, which own the scope's registration lifetime. */
    private readonly pendingInject;
    /**
     * Release one Agent's registration.
     * @param agent - the Agent whose scope is released.
     * @returns after the scope is disposed.
     */
    release(agent: Agent): void;
    /**
     * The assets currently registered for one Agent.
     * @param agent - the Agent to inspect.
     * @returns the registered assets, for the runtime's own diagnostics.
     */
    assetsOf(agent: Agent): readonly TeamSkillAsset[];
    /**
     * Every asset identifier a live assignment is serving.
     *
     * This is the fact a delete has to consult: a running member reading this
     * version must not have its resources removed underneath it. The intended
     * assignment counts even before its scope is minted, because the member is
     * already live and about to read.
     * @returns the live asset identifiers.
     */
    activeAssetIds(): ReadonlySet<string>;
    /**
     * Labels of the Agents a live assignment is serving one asset for.
     *
     * A session names the Agent that owns the registration, so a refused delete can
     * say *who* is holding the skill instead of a generic phrase.
     * @param assetId - asset identity.
     * @returns one label per live holder, sorted for a stable message.
     */
    activeLabels(assetId: string): string[];
    /**
     * Release every registration and refuse later ones.
     * @returns after every scope is disposed.
     */
    dispose(): Promise<void>;
}

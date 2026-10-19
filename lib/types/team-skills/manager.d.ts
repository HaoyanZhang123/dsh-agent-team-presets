/**
 * Who receives which Team Skill, and what may not be deleted.
 *
 * A Team is the organizing container, but the smallest unit that actually takes
 * effect is a member: `teamId + roleId`, with the captain stored under its own
 * role slot so a captain assignment can never be mistaken for a member's. The
 * bindings live in their own document beside the asset registry, never inside a
 * Team preset, because a role assignment is a local preference and a preset
 * document is shared.
 *
 * Deletion is guarded here rather than in the page, so the Agent-facing path
 * and the visual path cannot disagree about whether a delete is allowed. Three
 * independent reasons block it: a role still binds the asset, a live member is
 * running on it, or another asset declares it as a dependency. A text-scan hit
 * is only a warning — static scanning of Markdown and scripts cannot prove a
 * reference, and pretending otherwise would either block legitimate deletes or
 * hide a real one.
 * @module dsh-agent-team-presets/team-skills/manager
 */
import type { TeamSkillAsset, TeamSkillBinding, TeamSkillBindingSummary, TeamSkillDeleteBlocker } from '../types.ts';
import type { TeamPreset } from '../types.ts';
import type { TeamSkillStore } from './store.ts';
/** The role slot the captain is stored under. */
export declare const CAPTAIN_ROLE = "captain";
/** What the manager needs from the rest of the plugin to answer a delete. */
export interface TeamSkillGuardContext {
    /** Teams the page currently shows, for dependency labels. */
    readonly teams: () => readonly TeamPreset[];
    /** Asset identifiers a live member or Session is currently reading. */
    readonly activeAssetIds: () => ReadonlySet<string>;
    /** Live Session labels running a member on one asset, for the refusal. */
    readonly activeSessions: (assetId: string) => readonly string[];
}
/** Why one assignment was refused. */
export type TeamSkillAssignFailure = 'unknown-asset' | 'unknown-role' | 'asset-missing';
/** Result of one assignment attempt. */
export type TeamSkillAssignResult = {
    readonly ok: true;
    readonly binding: TeamSkillBinding;
} | {
    readonly ok: false;
    readonly reason: TeamSkillAssignFailure;
};
/** Deletion outcome carrying every blocking reason at once. */
export interface TeamSkillDeleteOutcome {
    readonly ok: boolean;
    readonly blockers: readonly TeamSkillDeleteBlocker[];
    readonly warnings: readonly string[];
}
/** The Team Skill library plus its role bindings. */
export declare class TeamSkillManager {
    private readonly store;
    private readonly root;
    private bindings;
    private revision;
    private opened;
    private readonly guards;
    /**
     * @param store - the asset store this manager binds assets from.
     * @param root - the same private root the store uses.
     * @param guards - live facts a delete has to consult.
     */
    constructor(store: TeamSkillStore, root: string, guards: TeamSkillGuardContext);
    /** Binding revision, bumped by every assignment change. */
    get bindingRevision(): number;
    /**
     * Read the bindings document.
     *
     * A malformed document refuses the open instead of starting empty: silently
     * dropping every assignment would make each member lose its skills with no
     * explanation.
     * @returns after the table is loaded.
     */
    open(): Promise<void>;
    /** Every binding, in a stable order. */
    list(): readonly TeamSkillBinding[];
    /**
     * Assign one asset to one role slot.
     * @param input - team, role, and asset.
     * @returns the stored binding or the reason it was refused.
     */
    assign(input: {
        teamId: string;
        roleId: string;
        assetId: string;
        captain?: boolean;
    }): Promise<TeamSkillAssignResult>;
    /**
     * Remove the assignment of one role slot.
     * @param teamId - Team identity.
     * @param roleId - role identity, or {@link CAPTAIN_ROLE}.
     * @returns whether a binding was removed.
     */
    unassign(teamId: string, roleId: string): Promise<boolean>;
    /**
     * Drop every binding of one Team, used when a Team is deleted.
     * @param teamId - Team identity.
     * @returns the number of removed bindings.
     */
    unassignTeam(teamId: string): Promise<number>;
    /**
     * Resolve the assets one role receives.
     * @param teamId - Team identity.
     * @param roleId - role identity.
     * @returns the bound assets that still exist.
     */
    assetsFor(teamId: string, roleId: string): TeamSkillAsset[];
    /**
     * Describe the roles currently bound to one asset.
     * @param assetId - asset identity.
     * @returns one row per binding, with the Team and role names for the dialog.
     */
    bindingSummaries(assetId: string): TeamSkillBindingSummary[];
    /**
     * Delete one asset, refusing while anything still depends on it.
     *
     * Every blocking reason is collected before refusing, so the dialog can list
     * all of them instead of revealing one per attempt.
     * @param assetId - asset identity.
     * @returns the outcome, with blockers when it was refused.
     */
    remove(assetId: string): Promise<TeamSkillDeleteOutcome>;
    /**
     * Find text mentions of one skill name inside another asset.
     * @param assetId - asset whose files are scanned.
     * @param skillId - the name to look for.
     * @returns the matching relative paths.
     */
    private mentionsAsset;
    /**
     * Whether an asset is currently referenced by any role.
     * @param assetId - asset identity.
     * @returns whether at least one binding points at it.
     */
    isBound(assetId: string): boolean;
    /**
     * Delete one Team's bindings and its asset-independent bookkeeping.
     * @param teamId - Team identity.
     * @returns the number of removed bindings.
     */
    forgetTeam(teamId: string): Promise<number>;
    /**
     * Persist the bindings document atomically enough for a UI write.
     * @returns after the document is on disk.
     */
    private flush;
}

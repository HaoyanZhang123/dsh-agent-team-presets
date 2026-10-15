/**
 * The Team presets this plugin ships as its own defaults.
 *
 * A deployment that installs this plugin gets three ready Teams before its user
 * has read anything about Team presets: a lightweight one for a small module, a
 * standard one for a medium feature or a refactor, and a full-stack one for work
 * that spans web, desktop, and Android. They are ordinary stored Teams in every
 * other respect — editable, duplicable, selectable, and deletable — so the
 * shipped set is a starting point rather than a fixed policy. The one thing that
 * makes them special is that this plugin knows their exact content, which is
 * what lets Settings put them back.
 *
 * Two rules keep that knowledge from becoming a trap:
 *
 * - Installing a shipped preset never overwrites a stored one. Seeding appends a
 *   preset the deployment does not hold and records its identity in
 *   `seededDefaults`, so a shipped preset the user deletes or edits stays
 *   exactly as they left it across restarts. Restoring it is a deliberate act.
 * - Restoring a shipped preset replaces the fields a shared document carries —
 *   the name, the purpose, every standing prompt, the accent colors, and the
 *   roster — and keeps the fields it does not: a member's model route and every
 *   slot's tool policy. A document that never carried a route cannot be evidence
 *   for discarding one, exactly as the import path already treats it.
 *
 * The documents below are the shipped source of truth. `contrib/default-presets`
 * holds the same three documents as JSON for readers of this repository, and
 * `tests/builtin-teams.spec.ts` proves the two cannot drift.
 * @module dsh-agent-team-presets/builtin-teams
 */
import type { TeamPresetTransfer } from './preset-transfer.ts';
import type { TeamPreset } from './types.ts';
/** Identity the lightweight Team is stored under. */
export declare const LIGHTWEIGHT_TEAM_ID = "builtin-lightweight";
/** Identity the standard Team is stored under. */
export declare const STANDARD_TEAM_ID = "builtin-standard";
/** Identity the full-stack Team is stored under. */
export declare const FULLSTACK_TEAM_ID = "builtin-fullstack";
/** One shipped Team: the identity it is stored under and the document it restores from. */
export interface BuiltinTeam {
    /** Stable identity every stored copy of this preset keeps. */
    readonly id: string;
    /** Shareable content the preset is installed and restored from. */
    readonly document: TeamPresetTransfer;
}
/** Every shipped preset, lightest first, in the order a fresh deployment lists them. */
export declare const BUILTIN_TEAMS: readonly BuiltinTeam[];
/** Every shipped identity, in shipped order. */
export declare const BUILTIN_TEAM_IDS: readonly string[];
/**
 * Build the preset one shipped document describes.
 *
 * Everything the document does not carry starts empty, exactly as an import
 * starts: the route follows the Session and the tool policy stays unrestricted.
 * @param entry - the shipped Team to materialize.
 * @returns a fresh preset carrying the document's content.
 */
export declare function builtinTeamDefinition(entry: BuiltinTeam): TeamPreset;
/** What one seeding pass did to the stored Team list. */
export interface BuiltinSeedResult {
    /** The Team list, with every shipped preset the deployment did not hold appended. */
    readonly teams: TeamPreset[];
    /** Identities of the shipped presets this deployment has now been offered. */
    readonly seeded: readonly string[];
    /** Whether the Team list or the marker moved, so the caller knows a write is needed. */
    readonly changed: boolean;
}
/**
 * Install the shipped presets a deployment has not been offered yet.
 *
 * A preset is appended only when the deployment neither holds it nor was ever
 * offered it, and it is marked as offered whether this pass appended it or the
 * deployment already held it. That is what makes the shipped set deletable: the
 * marker records "the user was offered this preset", not "this preset is
 * installed", so deleting one leaves it deleted and installing one happens
 * exactly once. An existing preset is never overwritten here — editing or
 * replacing a stored Team is the user's decision, and `restoreBuiltinTeams` is
 * how they make it.
 * @param teams - the stored Team list, already cleaned of legacy fields.
 * @param seeded - identities the deployment was already offered.
 * @returns the next Team list, the next marker, and whether either changed.
 */
export declare function seedBuiltinTeams(teams: readonly TeamPreset[], seeded: readonly string[]): BuiltinSeedResult;
/** What one restore did to the Team list. */
export interface BuiltinRestoreResult {
    /** The Team list, with every shipped preset at its document's content. */
    readonly teams: TeamPreset[];
    /** Identities of the shipped presets this restore actually changed. */
    readonly changed: readonly string[];
}
/**
 * Put every shipped preset back at its document's content.
 *
 * Only the shipped presets are touched: a Team the user created keeps its
 * identity, its content, and its position, and a shipped preset that is missing
 * is appended rather than substituted for anything else. The result is the list
 * the caller stages, so a restore is reviewable and saved like every other edit
 * on the page.
 * @param teams - the Teams the page currently shows.
 * @returns the restored list and the identities that really moved.
 */
export declare function restoreBuiltinTeams(teams: readonly TeamPreset[]): BuiltinRestoreResult;

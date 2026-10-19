/**
 * The private Team Skill store: folders on disk plus one registry index.
 *
 * A Team Skill is a complete folder, so the store keeps complete folders rather
 * than a database of rows: `<root>/assets/<assetId>/<version>/` holds exactly
 * the bytes an imported package carried, and every version is immutable once
 * written. Edits create a new version directory instead of rewriting the old
 * one, which is what lets a running member keep reading the version it was
 * created with while the user edits a newer one.
 *
 * The registry is a small JSON index beside the folders. It is not the source
 * of truth for the bytes — the folders are — so a registry entry whose folder
 * is missing reports `intact: false` instead of being invented.
 *
 * The root is supplied by the caller. This module never guesses a global skill
 * directory: the plugin's own directory is derived in `src/team-skills/root.ts`,
 * and a test or an embedding can point it anywhere.
 * @module dsh-agent-team-presets/team-skills/store
 */
import type { SkillPackage } from './import.ts';
import type { TeamSkillAsset, TeamSkillDependencies, TeamSkillFile, TeamSkillOrigin } from '../types.ts';
/** One official skill the package ships. */
export interface OfficialSkillEntry {
    /** Kebab-case skill id; also the shipped folder name. */
    readonly skillId: string;
    /** Absolute directory of the shipped, read-only copy. */
    readonly directory: string;
    /** Shipped asset version. */
    readonly version: string;
}
/**
 * Hash one whole folder in a path-stable way.
 *
 * The digest covers each path and each file digest, so renaming a file changes
 * it even when the bytes are identical — which is the fact an upgrade
 * comparison needs.
 * @param files - every file of the folder.
 * @returns the folder digest.
 */
export declare function folderDigest(files: readonly TeamSkillFile[]): string;
/**
 * Build the file table of one package from its decoded bytes.
 * @param files - the package files.
 * @returns the registry file rows, path-ordered.
 */
export declare function fileTable(files: readonly {
    readonly path: string;
    readonly bytes: Uint8Array;
}[]): TeamSkillFile[];
/** The private store rooted at one directory. */
export declare class TeamSkillStore {
    readonly root: string;
    private assets;
    private revision;
    private opened;
    /**
     * @param root - absolute directory the caller owns; created on first write.
     */
    constructor(root: string);
    /** Registry revision, bumped by every mutation. */
    get registryRevision(): number;
    /** Absolute path of one asset version's folder. */
    assetPath(assetId: string, version: string): string;
    /**
     * Read the registry index, tolerating a missing one.
     *
     * A missing index on a first run is not an error — the store is created by its
     * first write. A malformed index is: silently starting empty would orphan
     * every folder the user already imported, so it throws instead.
     * @returns after the in-memory table is loaded.
     * @throws when the registry document has an unsupported version or shape.
     */
    open(): Promise<void>;
    /** Every asset, in a stable order. */
    list(): readonly TeamSkillAsset[];
    /**
     * Look one asset up by identity.
     * @param assetId - asset identity.
     * @returns the asset, or undefined.
     */
    get(assetId: string): TeamSkillAsset | undefined;
    /**
     * Look an asset up by its skill name, preferring a user override.
     * @param skillId - kebab-case skill name.
     * @returns the winning asset, or undefined.
     */
    bySkillId(skillId: string): TeamSkillAsset | undefined;
    /**
     * Persist the registry index.
     * @returns after the document is on disk.
     */
    private flush;
    /**
     * Install one validated package as a new asset version.
     * @param package_ - the validated folder.
     * @param options - identity, origin, and provenance of the new asset.
     * @returns the stored asset.
     */
    install(package_: SkillPackage, options: {
        readonly id: string;
        readonly origin: TeamSkillOrigin;
        readonly version: string;
        readonly officialSkillId?: string;
        readonly baseVersion?: string;
        readonly dependencies?: TeamSkillDependencies;
    }): Promise<TeamSkillAsset>;
    /**
     * Write one edited file as a NEW version of an asset.
     *
     * The previous version folder is left untouched, so a member that already
     * resolved it keeps reading valid bytes.
     * @param assetId - asset being edited.
     * @param path - relative path to write.
     * @param content - new text content.
     * @returns the new asset version.
     * @throws when the asset is an official read-only copy.
     */
    writeFile(assetId: string, path: string, content: string): Promise<TeamSkillAsset>;
    /**
     * Read one file of the asset's current version.
     * @param assetId - asset identity.
     * @param path - relative path.
     * @returns the bytes.
     */
    readBytes(assetId: string, path: string): Promise<Uint8Array>;
    /**
     * Read one text file of the asset's current version.
     * @param assetId - asset identity.
     * @param path - relative path.
     * @returns the text.
     */
    readText(assetId: string, path: string): Promise<string>;
    /**
     * Delete one asset and every version folder it owns.
     * @param assetId - asset identity.
     * @returns after the folder and the registry entry are gone.
     * @throws when the asset is shipped read-only.
     */
    remove(assetId: string): Promise<void>;
    /**
     * Copy the shipped official skills into the private store, idempotently.
     *
     * An official asset is only materialized when the exact shipped version is
     * absent, so a restart copies nothing. A user override that was derived from
     * an older shipped version is left exactly as it is and only flagged, because
     * merging a Python/Shell/Markdown folder automatically would silently rewrite
     * the user's own edits.
     * @param entries - every skill the package ships.
     * @returns the identifiers that changed, for the startup log.
     */
    ensureOfficial(entries: readonly OfficialSkillEntry[]): Promise<readonly string[]>;
    /**
     * Build the description of one package from the files already read.
     * @param skillId - the name to store under.
     * @param files - decoded files.
     * @param options - identity and provenance.
     * @returns after the asset is stored.
     */
    private installFiles;
    /**
     * Create an editable copy of one shipped skill.
     *
     * The copy points at the shipped version it started from, so a later upgrade
     * can tell the user that the official copy moved on without touching their
     * edits.
     * @param skillId - shipped skill id.
     * @param id - identity for the new override asset.
     * @returns the new override asset.
     * @throws when the deployment does not ship that skill.
     */
    createOverride(skillId: string, id: string): Promise<TeamSkillAsset>;
    /**
     * Point an override back at the current shipped copy, discarding its edits.
     * @param assetId - override identity.
     * @returns the refreshed asset.
     * @throws when the asset is not an override of a shipped skill.
     */
    resetOverride(assetId: string): Promise<TeamSkillAsset>;
    /**
     * Check one asset's folder against its registry entry.
     * @param assetId - asset identity.
     * @returns whether every recorded file is present with the recorded digest.
     */
    verify(assetId: string): Promise<boolean>;
}
/**
 * Copy one shipped folder into the store's asset layout without re-reading it.
 *
 * Exposed for the import path so a user's directory import and a shipped asset
 * share the exact same write rules.
 * @param store - the target store.
 * @param source - absolute source directory.
 * @param options - identity and origin.
 * @returns the stored asset.
 */
export declare function installFromDirectory(store: TeamSkillStore, source: string, options: {
    readonly id: string;
    readonly skillId: string;
    readonly origin: TeamSkillOrigin;
    readonly version: string;
}): Promise<TeamSkillAsset>;
/**
 * Copy one directory into another, used by the version-pinning path.
 * @param from - source directory.
 * @param to - destination directory.
 * @returns after the copy.
 */
export declare function copyDirectory(from: string, to: string): Promise<void>;

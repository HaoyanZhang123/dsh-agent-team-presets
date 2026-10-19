/**
 * Page state for the Team Skill library.
 *
 * The controller holds no rules of its own: it calls the Host service and keeps
 * the last answer, so a refusal the Host produced (a delete blocked by a live
 * member, an import that would escape its folder) is displayed exactly as the
 * Host described it. Optimistic edits are deliberately absent — an import can
 * take a moment and a delete can be refused, and a page that showed the change
 * before the Host agreed would have to take it back.
 * @module dsh-agent-team-presets/client/team-skills-controller
 */
import type { Context } from '@deepseek-ai/cordis';
import type { TeamSkillDeleteView, TeamSkillDetailView, TeamSkillLibraryView } from '../types.ts';
/** One page snapshot. */
export interface TeamSkillsState {
    /** Where the library load stands. */
    readonly status: 'loading' | 'ready' | 'unavailable';
    /** The library, once loaded. */
    readonly library: TeamSkillLibraryView | undefined;
    /** The asset the detail panel shows. */
    readonly selectedId: string | undefined;
    /** Its detail, once loaded. */
    readonly detail: TeamSkillDetailView | undefined;
    /** Whether a write is in flight. */
    readonly busy: boolean;
    /** The last message the page must show, already user-facing text. */
    readonly message: string | undefined;
    /** Whether {@link message} reports a refusal rather than success. */
    readonly failed: boolean;
    /** Why the library is unavailable, when the Host has no store. */
    readonly issue: string | undefined;
    /** The file whose text the editor shows. */
    readonly file: string | undefined;
    /** That file's text, once read. */
    readonly fileText: string | undefined;
}
/** The Team Skill page state. */
export declare class TeamSkillsController {
    private state;
    private readonly listeners;
    private disposed;
    /**
     * The Remote namespace, once the gateway announces it.
     *
     * It is resolved through its own `inject` instead of the plugin's required
     * inject list: a namespace the Host fails to announce must cost this panel and
     * nothing else. Waiting for it in the plugin's own inject list took the whole
     * web UI down (one entry "did not activate"), which is exactly the failure a
     * settings panel is never worth.
     */
    private service;
    /**
     * @param ctx - the browser context this panel reads its Remote through.
     */
    constructor(ctx: Context);
    /** Current snapshot, stable between changes. */
    getSnapshot: () => TeamSkillsState;
    /**
     * Subscribe to changes.
     * @param listener - called after every state change.
     * @returns the unsubscribe function.
     */
    subscribe: (listener: () => void) => (() => void);
    /** Stop accepting answers. */
    dispose(): void;
    /**
     * Replace the snapshot and notify.
     * @param patch - fields to change.
     */
    private publish;
    /** Read the library from the Host. */
    refresh(): Promise<void>;
    /**
     * Show one asset's detail.
     * @param assetId - asset identity.
     */
    select(assetId: string): Promise<void>;
    /**
     * Load one file's text into the editor.
     * @param path - relative path inside the asset.
     */
    openFile(path: string): Promise<void>;
    /**
     * Save one file of the selected asset.
     * @param path - relative path.
     * @param text - new content.
     */
    saveFile(path: string, text: string): Promise<void>;
    /**
     * Create one blank skill.
     * @param skillId - kebab-case name.
     * @param description - frontmatter description.
     */
    create(skillId: string, description: string): Promise<void>;
    /**
     * Import one folder the user picked.
     * @param files - the picker's files, already carrying relative paths.
     */
    importFolder(files: readonly {
        path: string;
        content: Uint8Array;
    }[]): Promise<void>;
    /**
     * Copy one shipped skill into an editable override.
     * @param skillId - shipped skill id.
     */
    createOverride(skillId: string): Promise<void>;
    /**
     * Discard one override's edits by re-copying the shipped skill.
     * @param assetId - override identity.
     */
    resetOverride(assetId: string): Promise<void>;
    /**
     * Delete one asset, showing every blocker the Host reported.
     * @param assetId - asset identity.
     * @returns the Host's outcome, so the page can name the blockers.
     */
    remove(assetId: string): Promise<TeamSkillDeleteView | undefined>;
    /**
     * Bind one asset to one role, as the member page's grid does.
     * @param teamId - Team identity.
     * @param roleId - role identity, or `captain`.
     * @param assetId - asset identity.
     */
    assignSkill(teamId: string, roleId: string, assetId: string): Promise<void>;
    /**
     * Remove one asset from one role.
     * @param teamId - Team identity.
     * @param roleId - role identity.
     * @param assetId - asset identity.
     */
    unassignSkill(teamId: string, roleId: string, assetId: string): Promise<void>;
    /**
     * Bind the selected asset to one role.
     * @param teamId - Team identity.
     * @param roleId - role identity, or `captain`.
     */
    assign(teamId: string, roleId: string): Promise<void>;
    /**
     * Remove one role's assignment.
     * @param teamId - Team identity.
     * @param roleId - role identity.
     */
    unassign(teamId: string, roleId: string): Promise<void>;
    /**
     * The generated Client face for this plugin's services.
     * @returns the mounted Remote namespace.
     */
    private api;
    /**
     * Run one write with a busy flag and a single message.
     * @param work - the call, returning the message key or a refusal text.
     */
    private run;
}

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
/**
 * Unwrap one Remote answer, turning a transport failure into the same shape the
 * page shows for a Host refusal.
 * @param result - the wrapped answer.
 * @returns the value, or the failure text.
 */
function unwrap(result) {
    if (result.ok)
        return result.value;
    throw new Error(result.error.message ?? 'the Host refused the call');
}
/**
 * Narrow one answer that may be a refusal.
 * @param value - a service answer.
 * @returns whether it is a detail.
 */
function isDetail(value) {
    return 'asset' in value;
}
/** The Team Skill page state. */
export class TeamSkillsController {
    ctx;
    state = {
        status: 'loading',
        library: undefined,
        selectedId: undefined,
        detail: undefined,
        busy: false,
        message: undefined,
        failed: false,
        issue: undefined,
    };
    listeners = new Set();
    disposed = false;
    /**
     * @param ctx - the browser context, with the Team Skill Remote mounted.
     */
    constructor(ctx) {
        this.ctx = ctx;
    }
    /** Current snapshot, stable between changes. */
    getSnapshot = () => this.state;
    /**
     * Subscribe to changes.
     * @param listener - called after every state change.
     * @returns the unsubscribe function.
     */
    subscribe = (listener) => {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    };
    /** Stop accepting answers. */
    dispose() {
        this.disposed = true;
        this.listeners.clear();
    }
    /**
     * Replace the snapshot and notify.
     * @param patch - fields to change.
     */
    publish(patch) {
        if (this.disposed)
            return;
        this.state = { ...this.state, ...patch };
        for (const listener of this.listeners)
            listener();
    }
    /** Read the library from the Host. */
    async refresh() {
        this.publish({ status: this.state.library === undefined ? 'loading' : 'ready' });
        try {
            const library = unwrap(await this.service().library());
            this.publish({ status: 'ready', library, issue: undefined });
            // A selected asset that no longer exists must not keep a stale detail.
            if (this.state.selectedId !== undefined && !library.assets.some(asset => asset.id === this.state.selectedId)) {
                this.publish({ selectedId: undefined, detail: undefined });
            }
        }
        catch (error) {
            // A missing service means this deployment ships no store; the page says so
            // instead of reporting an empty library the user cannot fill.
            this.publish({ status: 'unavailable', issue: String(error) });
        }
    }
    /**
     * Show one asset's detail.
     * @param assetId - asset identity.
     */
    async select(assetId) {
        this.publish({ selectedId: assetId, detail: undefined });
        const answer = unwrap(await this.service().detail(assetId));
        if (this.disposed || this.state.selectedId !== assetId)
            return;
        if (!isDetail(answer)) {
            this.publish({ message: answer.detail, failed: true });
            return;
        }
        this.publish({ detail: answer });
    }
    /**
     * Save one file of the selected asset.
     * @param path - relative path.
     * @param text - new content.
     */
    async saveFile(path, text) {
        const assetId = this.state.selectedId;
        if (assetId === undefined)
            return;
        await this.run(async () => {
            const answer = unwrap(await this.service().writeFile(assetId, path, text));
            if (!isDetail(answer))
                return answer.detail;
            this.publish({ detail: answer });
            await this.refresh();
            return 'saved';
        });
    }
    /**
     * Create one blank skill.
     * @param skillId - kebab-case name.
     * @param description - frontmatter description.
     */
    async create(skillId, description) {
        await this.run(async () => {
            const answer = unwrap(await this.service().create(skillId, description));
            if (!isDetail(answer))
                return answer.detail;
            this.publish({ detail: answer, selectedId: answer.asset.id });
            await this.refresh();
            return 'created';
        });
    }
    /**
     * Import one folder the user picked.
     * @param files - the picker's files, already carrying relative paths.
     */
    async importFolder(files) {
        if (files.length === 0)
            return;
        const payload = files.map(file => ({
            path: file.path,
            base64: encodeBase64(file.content),
        }));
        await this.run(async () => {
            const answer = unwrap(await this.service().importFiles(payload));
            if (!isDetail(answer))
                return answer.detail;
            this.publish({ detail: answer, selectedId: answer.asset.id });
            await this.refresh();
            return 'imported';
        });
    }
    /**
     * Copy one shipped skill into an editable override.
     * @param skillId - shipped skill id.
     */
    async createOverride(skillId) {
        await this.run(async () => {
            const answer = unwrap(await this.service().createOverride(skillId));
            if (!isDetail(answer))
                return answer.detail;
            this.publish({ detail: answer, selectedId: answer.asset.id });
            await this.refresh();
            return 'override-created';
        });
    }
    /**
     * Discard one override's edits by re-copying the shipped skill.
     * @param assetId - override identity.
     */
    async resetOverride(assetId) {
        await this.run(async () => {
            const answer = unwrap(await this.service().resetOverride(assetId));
            if (!isDetail(answer))
                return answer.detail;
            this.publish({ detail: answer });
            await this.refresh();
            return 'override-reset';
        });
    }
    /**
     * Delete one asset, showing every blocker the Host reported.
     * @param assetId - asset identity.
     * @returns the Host's outcome, so the page can name the blockers.
     */
    async remove(assetId) {
        let outcome;
        await this.run(async () => {
            outcome = unwrap(await this.service().remove(assetId));
            await this.refresh();
            if (!outcome.ok)
                return outcome.blockers.map(blocker => `${blocker.kind}: ${blocker.detail}`).join('; ');
            this.publish({ selectedId: undefined, detail: undefined });
            return 'deleted';
        });
        return outcome;
    }
    /**
     * Bind the selected asset to one role.
     * @param teamId - Team identity.
     * @param roleId - role identity, or `captain`.
     */
    async assign(teamId, roleId) {
        const assetId = this.state.selectedId;
        if (assetId === undefined)
            return;
        await this.run(async () => {
            const answer = unwrap(await this.service().assign(teamId, roleId, assetId));
            this.publish({ library: answer.library });
            if (this.state.selectedId !== undefined)
                await this.select(this.state.selectedId);
            return answer.ok ? 'assigned' : answer.detail;
        });
    }
    /**
     * Remove one role's assignment.
     * @param teamId - Team identity.
     * @param roleId - role identity.
     */
    async unassign(teamId, roleId) {
        await this.run(async () => {
            const library = unwrap(await this.service().unassign(teamId, roleId));
            this.publish({ library });
            if (this.state.selectedId !== undefined)
                await this.select(this.state.selectedId);
            return 'unassigned';
        });
    }
    /**
     * The generated Client face for this plugin's services.
     * @returns the mounted Remote namespace.
     */
    service() {
        return this.ctx.remote.teamSkills;
    }
    /**
     * Run one write with a busy flag and a single message.
     * @param work - the call, returning the message key or a refusal text.
     */
    async run(work) {
        this.publish({ busy: true, message: undefined, failed: false });
        try {
            const message = await work();
            const failed = /:|already exists|read-only|refus/u.test(message) && !/^(saved|created|imported|deleted|assigned|unassigned|override-)/u.test(message);
            this.publish({ busy: false, message, failed });
        }
        catch (error) {
            this.publish({ busy: false, message: String(error), failed: true });
        }
    }
}
/**
 * Encode bytes for the Remote boundary.
 *
 * `btoa` needs a binary string, and a chunked conversion keeps a large skill
 * file from overflowing the call stack of `String.fromCharCode`.
 * @param bytes - file content.
 * @returns base64 text.
 */
function encodeBase64(bytes) {
    let binary = '';
    const chunk = 0x8000;
    for (let at = 0; at < bytes.length; at += chunk) {
        binary += String.fromCharCode(...bytes.subarray(at, at + chunk));
    }
    return btoa(binary);
}

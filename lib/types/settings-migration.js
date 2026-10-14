import { randomUUID } from 'node:crypto';
import { withoutCaptainRoutes } from "./config.js";
/** Coalesce startup/config edges into one in-flight write and one latest recheck. */
export function teamSettingsMigration(ctx, config, namespace) {
    let disposed = false;
    let running = false;
    let requested = false;
    let attempted;
    return {
        async request() {
            if (disposed)
                return;
            if (running) {
                requested = true;
                return;
            }
            running = true;
            try {
                do {
                    requested = false;
                    if (disposed)
                        break;
                    // Read the revision before the synchronous Config snapshot. A LOADING
                    // settings entry is absent: the caller retries after activation.
                    const descriptor = ctx.settings.describe().find(row => row.ns === namespace);
                    if (descriptor === undefined)
                        break;
                    const teams = config.teams.get();
                    const cleaned = withoutCaptainRoutes(teams).map(team => {
                        const used = new Set();
                        let changed = false;
                        const members = team.members.map(member => {
                            if (member.id !== undefined && member.id !== '' && !used.has(member.id)) {
                                used.add(member.id);
                                return member;
                            }
                            changed = true;
                            const id = randomUUID();
                            used.add(id);
                            return { ...member, id };
                        });
                        return changed ? { ...team, members } : team;
                    });
                    if (cleaned.every((team, index) => team === teams[index]))
                        continue;
                    const identity = JSON.stringify([descriptor.revision, teams]);
                    // Read-only/conflict errors are not retried for the same document.
                    // A changed revision or Teams value admits one fresh attempt.
                    if (identity === attempted)
                        continue;
                    attempted = identity;
                    try {
                        await ctx.settings.update(namespace, { teams: cleaned }, descriptor.revision);
                    }
                    catch (error) {
                        ctx.logger.warn('agent-team-presets: settings migration refused; normal Sessions remain unaffected: %s', String(error));
                    }
                } while (requested && !disposed);
            }
            catch (error) {
                // A discovery/preparation failure is diagnostic-only too. The scheduled
                // caller never receives an unhandled rejection that could stop the Host.
                ctx.logger.warn('agent-team-presets: could not prepare settings migration; normal Sessions remain unaffected: %s', String(error));
            }
            finally {
                running = false;
            }
        },
        // Settings.update has no cancellation parameter. A write already admitted
        // may settle, but disposal prevents every queued/new retry.
        dispose() { disposed = true; requested = false; },
    };
}

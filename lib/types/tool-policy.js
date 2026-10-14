import { RUN_CODE_NAME } from '@deepseek-ai/dsh-tools';
import { toolMode } from "./presets.js";
export const PRESET_TOOLS = ['spawn_team_member', 'get_team_preset', 'update_team_preset'];
export const TEAM_TOOLS = ['spawn_teammate', 'send_message', 'list_agents', 'wait_agent', 'interrupt_agent',
    'team_task_create', 'team_task_get', 'team_task_list', 'team_task_update'];
const OWN_TOOLS = new Set([...PRESET_TOOLS, ...TEAM_TOOLS]);
const MARKER = '\n\n[team-presets-tool-policy:v1]';
export function policyOf(teamId, slot) {
    return { teamId, mode: toolMode(slot), allow: [...slot.tools] };
}
/** Probe only inherited names; fixed own-layer Team tools are enforced by guard. */
export function inheritedFilter(agent, policy) {
    if (policy.mode === 'all')
        return undefined;
    if (policy.allow.includes(RUN_CODE_NAME))
        throw new Error('Allow end-capability tools, not the run_code transport.');
    const inherited = [];
    for (const name of policy.allow) {
        if (OWN_TOOLS.has(name))
            continue;
        try {
            agent.ctx.tools.restrict({ allow: [name] })();
            inherited.push(name);
        }
        catch (error) {
            // An arbitrary own-layer registration is valid for this Agent, but cannot
            // be passed to upstream restrict(). The strict guard still checks its name.
            if (agent.ctx.tools.get(name, agent) === undefined)
                throw error;
        }
    }
    return { allow: inherited };
}
/** Own-layer tools and nested PTC capability dispatch both pass through this guard. */
export function guardPolicy(agent, policy) {
    const allowed = new Set(policy.allow);
    let native;
    if (policy.mode === 'custom') {
        try {
            native = agent.ctx.tools.presentAs('native');
        }
        catch { /* An exact-Agent presentation exists; guard still denies run_code. */ }
    }
    const disposeGuard = agent.ctx.tools.guard(exec => {
        if (exec.name === 'spawn_teammate')
            return 'This Team uses preset-managed creation; call spawn_team_member instead.';
        if (policy.mode === 'custom' && ['subagent', 'subagent_fork', 'workflow'].includes(exec.name)) {
            return 'Custom Team policies cannot delegate through providers without a durable strict-policy contract; use preset-managed Team members.';
        }
        if (exec.name === RUN_CODE_NAME && policy.mode === 'custom') {
            // Shipped Node PTC can import fs/child_process outside SDK dispatch. A
            // tool allow-list cannot safely admit that general-purpose code runtime.
            return 'Custom Team policies deny general-purpose run_code; use native allowed tools.';
        }
        if (policy.mode === 'custom' && !allowed.has(exec.name)) {
            return `Team preset "${policy.teamId}" tool policy denies "${exec.name}".`;
        }
        return undefined;
    });
    return () => { disposeGuard(); native?.(); };
}
export function policyPersona(persona, policy) {
    // Literal policy trailer must survive system-prompt template interpolation.
    return `${persona}${MARKER}${JSON.stringify(policy)}`;
}
/** Old plugin-generated briefing, not merely upstream Team membership. */
export function hasLegacyPresetBriefing(agent) {
    for (const event of agent.session.ownEvents()) {
        if (event.type !== 'subagent/descriptor')
            continue;
        const data = event.data;
        return typeof data.persona === 'string' && /^You are "[^"\n]+"(?: \([^\n]*\))? on the Agent Team "/u.test(data.persona);
    }
    return false;
}
/** Read the plugin declaration only from the child's own Host-written descriptor. */
export function descriptorPolicy(agent, legacyTeam = false) {
    for (const event of agent.session.ownEvents()) {
        if (event.type !== 'subagent/descriptor')
            continue;
        const data = event.data;
        if (data.mode !== 'continuable')
            return undefined;
        const persona = typeof data.persona === 'string' ? data.persona : '';
        const at = persona.lastIndexOf(MARKER);
        if (at === -1) {
            if (persona.includes('[team-presets-tool-policy:'))
                throw new Error('Unsupported persisted Team tool policy version');
            if (!legacyTeam)
                return undefined;
            const filter = event.data.toolFilter;
            // Legacy continuable children persist only upstream toolFilter. Upgrade
            // that exact allow-list, never a current/index-matched role definition.
            if (filter?.allow !== undefined) {
                if (!Array.isArray(filter.allow) || filter.allow.some(name => typeof name !== 'string'))
                    throw new Error('Invalid legacy Team tool policy');
                return { teamId: 'legacy-delegation', mode: 'custom', allow: filter.allow };
            }
            if (filter !== undefined)
                return { teamId: 'legacy-delegation', mode: 'custom', allow: [] };
            return undefined;
        }
        const raw = JSON.parse(persona.slice(at + MARKER.length));
        if (typeof raw !== 'object' || raw === null)
            throw new Error('Invalid persisted Team tool policy');
        const policy = raw;
        if (typeof policy.teamId !== 'string' || typeof policy.mode !== 'string' || !['all', 'custom'].includes(policy.mode)
            || !Array.isArray(policy.allow) || policy.allow.some(name => typeof name !== 'string')) {
            throw new Error('Invalid persisted Team tool policy');
        }
        return { teamId: policy.teamId, mode: policy.mode, allow: policy.allow };
    }
    return undefined;
}

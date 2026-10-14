/** Strict tool execution policy, complementing the upstream inherited-surface mask.
 * The upstream continuation descriptor persists persona + filter but no strict
 * own-layer mask. A versioned persona trailer carries that missing declaration
 * until the upstream descriptor offers it directly; never invent session events.
 */
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { ToolRestriction } from '@deepseek-ai/dsh-tools';
import type { TeamSlotPreset } from './types.ts';
export declare const PRESET_TOOLS: readonly ["spawn_team_member", "get_team_preset", "update_team_preset"];
export declare const TEAM_TOOLS: readonly ["spawn_teammate", "send_message", "list_agents", "wait_agent", "interrupt_agent", "team_task_create", "team_task_get", "team_task_list", "team_task_update"];
export interface StrictToolPolicy {
    readonly teamId: string;
    readonly mode: 'all' | 'custom';
    readonly allow: readonly string[];
}
export declare function policyOf(teamId: string, slot: TeamSlotPreset): StrictToolPolicy;
/** Probe only inherited names; fixed own-layer Team tools are enforced by guard. */
export declare function inheritedFilter(agent: Agent, policy: StrictToolPolicy): ToolRestriction | undefined;
/** Own-layer tools and nested PTC capability dispatch both pass through this guard. */
export declare function guardPolicy(agent: Agent, policy: StrictToolPolicy): () => void;
export declare function policyPersona(persona: string, policy: StrictToolPolicy): string;
/** Old plugin-generated briefing, not merely upstream Team membership. */
export declare function hasLegacyPresetBriefing(agent: Agent): boolean;
/** Read the plugin declaration only from the child's own Host-written descriptor. */
export declare function descriptorPolicy(agent: Agent, legacyTeam?: boolean): StrictToolPolicy | undefined;

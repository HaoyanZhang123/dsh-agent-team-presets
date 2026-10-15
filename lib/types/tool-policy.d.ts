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
/**
 * Whether one name is a fixed Team operation this plugin or the Team service
 * registers on an Agent, rather than an inherited capability.
 *
 * A Team allow-list may always name these: they are contributed by the Team
 * composition itself, so a capability preflight must not report them missing
 * merely because the global registry does not carry them yet.
 * @param name - the tool name to classify.
 * @returns whether the name is a fixed own-layer Team operation.
 */
export declare function isOwnLayerTool(name: string): boolean;
export interface StrictToolPolicy {
    readonly teamId: string;
    readonly mode: 'all' | 'custom';
    readonly allow: readonly string[];
}
export declare function policyOf(teamId: string, slot: TeamSlotPreset): StrictToolPolicy;
/** Probe only inherited names; fixed own-layer Team tools are enforced by guard. */
export declare function inheritedFilter(agent: Agent, policy: StrictToolPolicy): ToolRestriction | undefined;
/**
 * Which Team slot a strict guard belongs to.
 *
 * The policy is identical either way; only the refusal wording differs, because
 * a member has no `spawn_team_member` to be redirected to and must ask its
 * Team Lead instead.
 */
export interface GuardRole {
    /** The slot this guard protects; defaults to the captain. */
    readonly role?: 'captain' | 'member';
    /**
     * Who declares the tool presentation this guard relies on.
     *
     * `self` (the default) keeps the historical best-effort declaration for
     * callers that install a legacy child policy with nothing else to prepare it.
     * `caller` means the caller already established a native presentation through
     * {@link prepareNativePresentation} and must not have it declared twice: an
     * Agent scope accepts exactly one declaration, so a second one would throw
     * while the first is still in effect.
     */
    readonly presentation?: 'self' | 'caller';
}
/** Own-layer tools and nested PTC capability dispatch both pass through this guard. */
export declare function guardPolicy(agent: Agent, policy: StrictToolPolicy, role?: GuardRole): () => void;
/** Old plugin-generated briefing, not merely upstream Team membership. */
export declare function hasLegacyPresetBriefing(agent: Agent): boolean;
/**
 * Read a LEGACY plugin declaration from the child's own Host-written descriptor.
 *
 * Only records written by an earlier plugin version can carry one: those
 * versions passed `persona` to the Team service, which a host that forwarded
 * the undeclared field persisted into `subagent/descriptor`. A member created
 * by the current implementation is identified by its durable member snapshot in
 * `./member-store.ts` and never produces this trailer, so this reader exists to
 * keep upgrading old members instead of leaving them on default tools.
 */
export declare function descriptorPolicy(agent: Agent, legacyTeam?: boolean): StrictToolPolicy | undefined;

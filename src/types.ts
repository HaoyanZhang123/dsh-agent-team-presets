/**
 * Shared Team preset records.
 *
 * The Host schema, the browser settings page, and the per-Session selection
 * all read these types; the module imports nothing so both build faces can
 * consume it.
 * @module dsh-agent-team-presets/types
 */

/** Fields a Team slot carries whether it is the captain or one summoned member. */
export type TeamSlotPreset = {
  /** Display name shown in Settings and in the captain's roster. */
  name: string
  /** Accent color as `#rrggbb`; empty keeps the theme default. */
  color: string
  /** Short description of the role, shown in Settings and given to the captain. */
  description: string
  /** Independent tool policy; absent in legacy records infers custom from a nonempty list. */
  toolMode?: 'all' | 'custom'
  /** Tool allow-list in custom mode, including exact-Agent Team tools; empty denies all. */
  tools: readonly string[]
  /**
   * Standing system prompt for this agent. Registered as a prompt section
   * template, so complete `{{variable}}` groups interpolate against registered
   * prompt variables and an unknown variable fails the request loud.
   */
  systemPrompt: string
}

/**
 * The Team captain: the agent that leads the Session.
 *
 * The captain runs on the model the Session already selected, so it holds no
 * route of its own and no setting can change the Session's model.
 */
export type TeamCaptainPreset = TeamSlotPreset

/** One summoned member: a slot plus the route that member runs on. */
export type TeamAgentPreset = TeamSlotPreset & {
  /** Stable role identity, independent of name, order, and runtime instances. */
  id?: string
  /** LLM provider route id; empty runs the member on the Session route. */
  provider: string
  /** Provider-owned model id; empty runs the member on the Session model. */
  model: string
  /** Adapter-owned reasoning effort; empty keeps the model default. */
  reasoningEffort: string
}

/** One reusable Team preset. */
export type TeamPreset = {
  /** Stable identity a Session selection references. */
  id: string
  /** Display name. */
  name: string
  /** What this Team is for; shown in Settings and to its captain. */
  description: string
  /** Agent that leads the Session and summons members. */
  captain: TeamCaptainPreset
  /** Role templates the captain summons by name. */
  members: readonly TeamAgentPreset[]
}

/** One Session's active Team preset. */
export type TeamSelectionRecord = {
  /** Session identity the selection belongs to. */
  sessionId: string
  /** Selected Team identity. */
  teamId: string
}

/** The user-owned Team preset section this plugin projects to the browser. */
export type TeamPresetsSection = {
  /** Every configured Team preset. */
  teams: readonly TeamPreset[]
  /** Every Session's active Team preset. */
  selections: readonly TeamSelectionRecord[]
}

/** One tool a Team member's allow-list may name. */
export type ToolChoice = {
  /** Capability name the strict execution policy accepts verbatim. */
  name: string
  /** Model-facing description, shown as the checkbox hover text. */
  description: string
  /**
   * Whether only the captain can exercise this capability.
   *
   * The Team service enforces this for `interrupt_agent` (a member call is
   * refused with `TEAM_LEAD_REQUIRED`), and this plugin registers the preset
   * tools on the Session root only. A member that selects such a name still
   * cannot use it, so the page must say so instead of offering it as grantable.
   */
  captainOnly?: boolean
  /**
   * Which upstream source the capability was attributed to.
   *
   * The tool registry records no registering package: `register()` stores a
   * definition under its tool name with a fixed label, so "native Harness" and
   * "some third-party plugin" are not separable. Only two attributions are
   * deterministic — this plugin's own registrations, and MCP tools, whose
   * `mcp__<server>__<name>` form the Harness itself generates. Everything else
   * is reported as `other` rather than guessed at.
   */
  source: ToolSource
  /** MCP server name; present only when {@link source} is `mcp`. */
  server?: string
}

/** The upstream source a listed capability could be attributed to. */
export type ToolSource =
  /** A capability this plugin registers. */
  | 'presets'
  /** A tool an MCP server exposes, named `mcp__<server>__<name>` by the Harness. */
  | 'mcp'
  /** Everything else: native Harness tools and third-party plugin tools, which the registry cannot tell apart. */
  | 'other'

/** Catalog of restrictable tools for one deployment. */
export type ToolCatalogValue = {
  /** Union of deployment preset/global and fixed Team capability names. */
  tools: readonly ToolChoice[]
}

/**
 * How one Team's execution state reads to the settings page.
 *
 * `idle` is a positive finding — every online Session that references the Team
 * was inspected and none is running a Team task. `unknown` means the Host could
 * not decide, so the page must never present it as idle.
 */
export type TeamExecutionState = 'idle' | 'busy' | 'unknown'

/** One Team's live execution state, aggregated over the online Sessions. */
export type TeamExecutionRow = {
  /** Team identity the row describes. */
  teamId: string
  /** Whether the Team is executing, known idle, or undecidable. */
  state: TeamExecutionState
  /** Online Sessions running a Team task on it. */
  busySessions: number
  /** Teammates running or provisioning across those Sessions. */
  executingMembers: number
  /**
   * Sessions whose applied definition or selection the next Team task has not
   * adopted yet. A member route or accent color saved meanwhile is read live,
   * so it is no reason to wait.
   */
  pendingSessions: number
  /**
   * Disclosures about how the applied Team runs, in a stable order.
   *
   * An empty list means no applied Session needed one. The only note today says
   * that a Team whose custom tool policy needed a native surface overrode the
   * Session's PTC batch-calling presentation, which the page must state instead
   * of claiming the preset's transport is intact.
   */
  notes: readonly string[]
}

/** Whole-set frame of the Team execution stream. */
export type TeamExecutionSnapshot = {
  /** One row per Team the Host reports, ordered by Team identity. */
  teams: readonly TeamExecutionRow[]
}

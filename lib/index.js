import { RUN_CODE_NAME, defineTool } from "@deepseek-ai/dsh-tools";
import { HarnessError, ReasoningEffortId } from "@deepseek-ai/dsh-llm";
import { PERSONA_PREFIX_SECTION } from "@deepseek-ai/dsh-system-prompt";
import { delegationDepthOf } from "@deepseek-ai/dsh-subagent";
import { createHash, randomUUID } from "node:crypto";
import { assembleContextFor, installModelSelection } from "@deepseek-ai/dsh-agent";
import z from "@deepseek-ai/schemastery";
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";

/**
* Pure Team preset helpers shared by the Host runtime and the browser page.
* @module dsh-agent-team-presets/presets
*/
/**
* Resolve a slot's explicit tool policy or its legacy list-only setting.
* @param agent - the configured captain or member.
* @returns the policy shown in Settings and enforced by the runtime.
*/
function toolMode(agent) {
	return agent.toolMode ?? (agent.tools.length === 0 ? "all" : "custom");
}
/** The member name grammar the Agent Teams service accepts. */
const MEMBER_TARGET = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
/**
* Derive a teammate target from one member's display name.
*
* Teammate names are permanent, lower-kebab-case, and never reused, so a
* display name that already satisfies the grammar is kept and any other name
* is transliterated to `member-<index>`. The display name still reaches the
* captain through the roster.
* @param member - the configured member.
* @param index - zero-based position in the Team's member list.
* @param used - targets already taken in this Team; the returned target is added.
* @returns the teammate target this member is summoned under.
*/
function memberTarget(member, index, used) {
	const candidate = member.name.trim().toLowerCase();
	const base = MEMBER_TARGET.test(candidate) && candidate !== "lead" && candidate.length <= 64 ? candidate : `member-${index + 1}`;
	let target = base;
	let suffix = 2;
	while (used.has(target)) {
		target = `${base}-${suffix}`;
		suffix += 1;
	}
	used.add(target);
	return target;
}
/**
* Resolve one member by its display name or its teammate target.
*
* The resolved target travels with the member, so a caller never re-derives it
* and cannot disagree with the roster about the name it summons.
* @param team - the Team preset to search.
* @param key - the model-authored member name.
* @returns the matching member with its target, or undefined when the name is unknown.
*/
function findMember(team, key) {
	const wanted = key.trim();
	const used = /* @__PURE__ */ new Set();
	for (const [index, member] of team.members.entries()) {
		const target = memberTarget(member, index, used);
		if (target === wanted.toLowerCase() || member.name.trim() === wanted) return {
			member,
			target
		};
	}
}
/**
* List every addressable teammate target of one Team.
* @param team - the Team preset.
* @returns one entry per member, in declared order.
*/
function memberTargets(team) {
	const used = /* @__PURE__ */ new Set();
	return team.members.map((member, index) => ({
		member,
		target: memberTarget(member, index, used)
	}));
}
/**
* Select the fields of one slot that a Team task owns.
*
* The effective tool policy is stored rather than the raw `toolMode`, so a
* legacy record and an explicit one that behave identically describe the same
* definition and never look like a change to a running task.
* @param slot - the configured captain or member.
* @returns the slot's definition fields, in a fixed order.
*/
function slotDefinition(slot) {
	return {
		name: slot.name,
		description: slot.description,
		toolMode: toolMode(slot),
		tools: [...slot.tools],
		systemPrompt: slot.systemPrompt
	};
}
/**
* Identify the definition one Team task owns.
*
* A running Team task keeps the definition it started with: the Team's purpose,
* the captain's persona, every member's role and standing prompt, the roster
* the captain may summon, and each slot's tool scope. Two groups of fields are
* deliberately outside it, because they are read from the stored preset when
* they are needed rather than captured with the definition:
*
* - a member's `provider`, `model`, and `reasoningEffort`, which describe where
*   a member runs rather than what the team does. Correcting a route is
*   recovery work, so it must reach the next member a running task summons
*   instead of waiting for that task to end.
* - each slot's `color`, which the roster draws from the stored preset live.
*
* @param team - the Team preset.
* @returns a stable JSON identity of the fields a task freezes.
*/
function definitionFingerprint(team) {
	return JSON.stringify({
		id: team.id,
		name: team.name,
		description: team.description,
		captain: slotDefinition(team.captain),
		members: team.members.map((member) => ({
			...slotDefinition(member),
			...member.id === void 0 ? {} : { id: member.id }
		}))
	});
}
/**
* Locate one Team preset by identity.
* @param teams - every configured Team preset.
* @param teamId - the identity to resolve.
* @returns the matching Team, or undefined.
*/
function findTeam(teams, teamId) {
	return teamId === void 0 ? void 0 : teams.find((team) => team.id === teamId);
}
/**
* Resolve the Team a Session selected.
* @param teams - every configured Team preset.
* @param selections - every Session selection record.
* @param sessionId - the Session identity to resolve.
* @returns the selected Team, or undefined when the Session selected none.
*/
function selectedTeam(teams, selections, sessionId) {
	return findTeam(teams, selections.find((record) => record.sessionId === sessionId)?.teamId);
}
/**
* Name one Team the way its own prompts address it.
* @param team - the Team preset.
* @returns the configured name, or the Team identity when it has no name.
*/
function teamLabel(team) {
	return team.name.trim() === "" ? team.id : team.name.trim();
}
/**
* Describe the captain to itself.
* @param captain - the configured captain.
* @returns the identity line, or an empty string when the captain states nothing.
*/
function captainIdentity(captain) {
	const name = captain.name.trim();
	const description = captain.description.trim();
	const subject = name === "" ? "You are its captain" : `You are its captain "${name}"`;
	return description === "" ? name === "" ? "" : `${subject}.` : `${subject}: ${description}`;
}
/**
* Build the briefing the captain reads for the Team it leads.
*
* The text states the Team's purpose, the captain's own role, and every
* summonable target with its configured description, so the captain delegates
* by the exact target the spawn tool accepts.
* @param team - the Team preset applied to this Session.
* @returns the prompt section text, or an empty string for a Team that says nothing about itself.
*/
function captainBriefing(team) {
	const description = team.description.trim();
	const identity = captainIdentity(team.captain);
	const rows = memberTargets(team).map(({ member, target }) => {
		const memberDescription = member.description.trim();
		const label = member.name.trim();
		return `- ${target}${label === "" || label === target ? "" : ` (${label})`}${memberDescription === "" ? "" : `: ${memberDescription}`}`;
	});
	if (description === "" && identity === "" && rows.length === 0) return "";
	return [
		description === "" ? `Team preset "${teamLabel(team)}" is active for this Session.` : `Team preset "${teamLabel(team)}" is active for this Session: ${description}`,
		identity,
		rows.length === 0 ? "" : `Summon a member with spawn_team_member(member, task). The targets below are fixed; use them verbatim.

${rows.join("\n")}`
	].filter((part) => part !== "").join("\n\n");
}
/**
* Build the briefing one summoned member reads.
*
* A member never sees the captain's roster, so its own prompt states the Team
* it joined, its own role, and then the configured system prompt that defines
* how it works.
* @param team - the Team preset that owns the member.
* @param member - the configured member.
* @param target - the teammate target the captain summons it under.
* @returns the persona text for the summoned member; it always names the Team it joined.
*/
function memberBriefing(team, member, target) {
	const label = member.name.trim();
	const named = label === "" || label === target ? `"${target}"` : `"${target}" (${label})`;
	const description = team.description.trim();
	const joined = description === "" ? `You are ${named} on the Agent Team "${teamLabel(team)}".` : `You are ${named} on the Agent Team "${teamLabel(team)}": ${description}`;
	const role = member.description.trim();
	return [
		joined,
		role === "" ? "" : `Your role: ${role}`,
		member.systemPrompt.trim()
	].filter((part) => part !== "").join("\n\n");
}
/**
* Build the team-context section one summoned member reads besides its persona.
*
* The member's own briefing states who it is; this states the Team it belongs
* to and the preset's division of labour, so it can tell which role another
* target stands for without being handed the captain's summons instructions or
* every sibling's standing prompt. The list is deliberately labelled as role
* templates: several instances of one role may exist, and the preset says
* nothing about who is running, so live addressing and status stay with
* `list_agents`.
* @param team - the Team preset that owns the member.
* @param target - the real instance target this member was summoned under.
* @returns the prompt section text for the member's team context.
*/
function memberTeamDivision(team, target) {
	const description = team.description.trim();
	const heading = description === "" ? `Team preset "${teamLabel(team)}" is active for this Session.` : `Team preset "${teamLabel(team)}" is active for this Session: ${description}`;
	const rows = memberTargets(team).map(({ member, target: rowTarget }) => {
		const rowDescription = member.description.trim();
		const label = member.name.trim();
		return `- ${rowTarget}${label === "" || label === rowTarget ? "" : ` (${label})`}${rowDescription === "" ? "" : `: ${rowDescription}`}`;
	});
	return [
		heading,
		rows.length === 0 ? "The preset declares no other roles." : `Preset division of labour (role templates, not a live roster):
${rows.join("\n")}`,
		`Your real instance target is "${target}". A role and an instance are not the same thing: one role may be summoned more than once, and the template list above does not report who is running now. Read the live roster and its statuses with list_agents; the Team Lead is addressed as "lead".`
	].join("\n\n");
}


/**
* Creation admission for preset-managed Team members.
*
* Creating a member is a new delegation generation, so the host's subagent
* settings apply to it exactly as they do to the native delegation tools:
*
* - `subagents.resolveMaxDepth()` is the configured absolute depth cap, and the
*   caller's own depth is read through the official `delegationDepthOf()`
*   helper so a session header, not a volatile option, decides it;
* - a fixed member route is validated against the live LLM registry before any
*   durable intent or roster row exists, so an unusable route is refused with
*   the exact reason instead of failing inside the member's first turn or
*   silently falling back to the Team Lead's route.
*
* Both checks fail closed: a missing service, an unreadable cap, or an
* unverifiable route refuses the creation rather than being read as "no limit".
* The host's own atomic continuation capacity stays the only concurrency gate;
* this module never counts running rows of its own.
* @module dsh-agent-team-presets/delegation
*/
/**
* Refuse a creation whose child depth the host's configured cap does not allow.
*
* The check is about the NEXT generation only: waking an existing member again
* is not another delegation level, so a lowered cap never invalidates the
* identity of a member that already exists.
* @param ctx - the plugin context carrying the subagent service.
* @param caller - the Agent summoning the member.
* @returns the refusal text, or undefined when the creation may proceed.
*/
function depthRefusal(ctx, caller) {
	const subagents = ctx.get("subagents");
	if (subagents === void 0) return "this deployment composes no subagent service, so a new Team member's delegation depth cannot be checked against the configured limit; creation is refused rather than assumed unlimited.";
	let cap;
	try {
		cap = subagents.resolveMaxDepth();
	} catch (error) {
		return `the configured subagent depth limit could not be read (${String(error)}); creation is refused.`;
	}
	if (cap === void 0) return;
	if (!Number.isInteger(cap) || cap < 0) return `the configured subagent depth limit (${String(cap)}) is not a non-negative integer; creation is refused.`;
	let parentDepth;
	try {
		parentDepth = delegationDepthOf(caller);
	} catch (error) {
		return `the calling Agent's delegation depth could not be read (${String(error)}); creation is refused.`;
	}
	if (!Number.isInteger(parentDepth) || parentDepth < 0) return `the calling Agent reports an invalid delegation depth (${String(parentDepth)}); creation is refused.`;
	if (cap === 0) return "subagent delegation is disabled in this deployment (maximum depth 0), so no Team member can be created. Raise the subagent depth limit in the host settings to summon members.";
	const childDepth = parentDepth + 1;
	if (childDepth > cap) return `creating a Team member here would put it at delegation depth ${childDepth}, beyond the configured subagent depth limit ${cap} (this Agent is at depth ${parentDepth}). No member was created.`;
}
/**
* Refuse a creation edge whose child the current depth cap no longer allows.
*
* This re-checks the admission on the awaited creation edge, where the child
* Agent already exists: a settings change that landed while the creation was in
* flight must not slip a member past the cap it was measured against. It is
* only consulted for a creation that had no child yet — waking an existing
* member again is not another generation.
* @param ctx - the plugin context carrying the subagent service.
* @param child - the child Agent being created.
* @returns the refusal text, or undefined when the child may be created.
*/
function createdDepthRefusal(ctx, child) {
	const subagents = ctx.get("subagents");
	if (subagents === void 0) return "this deployment composes no subagent service, so a new Team member's delegation depth cannot be verified at its creation edge; creation is refused rather than assumed unlimited.";
	let cap;
	try {
		cap = subagents.resolveMaxDepth();
	} catch (error) {
		return `the configured subagent depth limit could not be read (${String(error)}); creation is refused.`;
	}
	if (cap === void 0) return void 0;
	if (!Number.isInteger(cap) || cap < 0) return `the configured subagent depth limit (${String(cap)}) is not a non-negative integer; creation is refused.`;
	let childDepth;
	try {
		childDepth = delegationDepthOf(child);
	} catch (error) {
		return `the new member's delegation depth could not be read (${String(error)}); creation is refused.`;
	}
	if (!Number.isInteger(childDepth) || childDepth < 0) return `the new member reports an invalid delegation depth (${String(childDepth)}); creation is refused.`;
	if (cap === 0) return "subagent delegation is disabled in this deployment (maximum depth 0), so no Team member can be created. Raise the subagent depth limit in the host settings to summon members.";
	if (childDepth > cap) return `this Team member would run at delegation depth ${childDepth}, beyond the configured subagent depth limit ${cap}. It is refused before its first request; raise the subagent depth limit to summon it.`;
}
/**
* Refuse a member whose configured fixed route is not usable in this deployment.
*
* An empty route means the member runs on the Session's own route, which the
* session already proved usable, so there is nothing to verify. A configured
* route is validated with the same public call the Host uses before dispatch —
* `llm.resolveCallConfig()` — which rejects an unsupported explicit reasoning
* effort before any provider I/O and never clamps it. The advisory model
* catalog is deliberately not required to list the model: core routing accepts
* ids it does not advertise, but a route the deployment cannot resolve at all
* is refused before anything durable is written.
* @param ctx - the plugin context carrying the LLM registry.
* @param route - the member's configured route, or undefined when it inherits the Session route.
* @returns the refusal text, or undefined when the route may be used.
*/
async function routeRefusal(ctx, route) {
	if (route === void 0) return void 0;
	const llm = ctx.get("llm");
	if (llm === void 0) return `the member route "${route.provider}/${route.model}" cannot be verified because this deployment exposes no LLM registry; creation is refused rather than falling back to the Team Lead's route.`;
	let registered;
	try {
		registered = llm.listProviders().some((provider) => provider.id === route.provider);
	} catch (error) {
		return `the LLM provider list could not be read (${String(error)}), so the member route "${route.provider}/${route.model}" cannot be verified; creation is refused.`;
	}
	if (!registered) return `the configured member route "${route.provider}/${route.model}" names an LLM provider this deployment does not register. Correct the member's provider in the Team preset or add that provider to the deployment.`;
	const effort = route.reasoningEffort === void 0 ? "" : ` with reasoning effort "${route.reasoningEffort}"`;
	try {
		await llm.resolveCallConfig({
			provider: route.provider,
			model: route.model,
			...route.reasoningEffort === void 0 ? {} : { reasoningEffort: ReasoningEffortId(route.reasoningEffort) }
		});
	} catch (error) {
		return `the configured member route "${route.provider}/${route.model}"${effort} is not usable in this deployment (${String(error)}). Correct the member's route in the Team preset; creation is refused rather than falling back to the Team Lead's route or failing inside the member's first request.`;
	}
}


/**
* Durable identity of preset-managed Team members.
*
* The member snapshot in `./member-store.ts` is the frozen configuration, but
* it lives in a unit this plugin opens: when that unit cannot be opened, is
* damaged, or lost a record, the snapshot alone cannot tell a member this
* plugin created from a native teammate. A member therefore also carries an
* identity that the HOST persists on its own: the subagent execution backend it
* was created through.
*
* This plugin registers two stable aliases in the official subagent provider
* registry — one per configured spawn context — and summons every member
* through them. The official Team service writes the provider name into its
* roster row and into the child's own `subagent/descriptor`, so the child can
* later prove it is plugin-managed even when no snapshot can be read. The
* aliases are execution backends, never LLM routes: each one delegates the
* whole provider contract to the deployment's own provider, so fresh/fork
* history semantics, cancellation, and concurrency isolation are unchanged.
*
* Aliases therefore have to exist exactly while their upstream provider does,
* whatever order the two plugins activate in. The registry built here is
* self-maintaining: it scans once when it subscribes, follows
* `subagent/provider-added` and `subagent/provider-removed` afterwards, and
* re-validates every alias whenever its upstream may have changed. Nothing
* about the mount order of this plugin and the provider plugins is assumed, and
* no alias failure is remembered past the moment it stops being true.
*
* @module dsh-agent-team-presets/member-identity
*/
/** Alias a fresh member is created through; persisted by the Host as its provider. */
const MEMBER_FRESH_PROVIDER = "preset-member-fresh-v1";
/** Alias a forked member is created through; persisted by the Host as its provider. */
const MEMBER_FORK_PROVIDER = "preset-member-fork-v1";
/** The two spawn contexts, in the fixed order their aliases are maintained. */
const CONTEXTS = ["fresh", "fork"];
/** Every alias this plugin registers. The set is fixed and versioned. */
const ALIASES = new Set([MEMBER_FRESH_PROVIDER, MEMBER_FORK_PROVIDER]);
/**
* Whether one execution-backend name is this plugin's member marker.
* @param name - a subagent provider name, from a roster row or a child descriptor.
* @returns whether this plugin owns that name.
*/
function isPresetMemberProvider(name) {
	return name !== void 0 && ALIASES.has(name);
}
/**
* Read the identity marker one child carries in its own durable suffix.
*
* The first `subagent/descriptor` a session wrote is the one that established
* it. A descriptor whose mode is not `continuable` is not a Team member this
* plugin could have created, so its `provider` is never treated as a marker;
* only the establishing continuable descriptor is read, and never a later one.
* @param agent - the live child Agent.
* @returns the provider name of its establishing descriptor, or undefined.
*/
function memberProviderMarker(agent) {
	for (const event of agent.session.ownEvents()) {
		if (event.type !== "subagent/descriptor") continue;
		const data = event.data;
		if (data.mode !== "continuable") return void 0;
		return typeof data.provider === "string" ? data.provider : void 0;
	}
}
/**
* Resolve the alias one spawn context must be created through.
*
* Called at member-creation time, so the answer is read from the aliases that
* exist NOW rather than from the state one startup scan happened to observe: a
* provider that registered after this plugin activated is usable, and one that
* has since been removed is refused.
* @param registry - the aliases this activation maintains.
* @param context - the configured spawn context of the member about to be created.
* @returns the alias to spawn through, or the refusal for that context.
*/
function memberProviderFor(registry, context) {
	const error = context === "fresh" ? registry.freshError : registry.forkError;
	if (error !== void 0) return { error };
	return { name: context === "fresh" ? registry.fresh : registry.fork };
}
/**
* Build the delegating alias for one configured provider.
*
* The wrapper is a pass-through: it copies the upstream start-time facts and
* forwards both provider methods to the provider the deployment configured. It
* never replaces the upstream object, never adds a capability the backend does
* not declare, and never holds the child handle the continuation manager owns.
* @param alias - the registry name this plugin persists as its marker.
* @param upstream - the deployment's configured provider.
* @returns the provider registered under the alias.
*/
function aliasProvider(alias, upstream) {
	return {
		name: alias,
		capabilities: upstream.capabilities,
		inheritsParentContext: upstream.inheritsParentContext,
		...upstream.agentRouteDefaults === void 0 ? {} : { agentRouteDefaults: upstream.agentRouteDefaults },
		start: (request) => upstream.start(request),
		...upstream.prepareContinuable === void 0 ? {} : { prepareContinuable: (request) => upstream.prepareContinuable(request) }
	};
}
/**
* Register the member aliases, delegating to the configured providers, and keep
* them in step with the provider registry for as long as this activation lives.
*
* The two spawn contexts are independent: a deployment that composes only a
* fresh provider still serves fresh members, while a forked member is refused
* with the reason its own backend is unusable. A configured name that is itself
* an alias is always refused — the wrapper must never become its own backend —
* and so is a name whose provider cannot create continuable children, or whose
* alias registration fails. A configured name the deployment does not (or does
* not yet) register is refused only while it stays absent: the aliases are
* re-validated on every provider registry event, so a provider that activates
* later is picked up without restarting this plugin, and one that is replaced
* has its wrapper rebound to the new object.
*
* Registration failure is reported per context rather than skipped: a member
* created through the deployment's own provider would carry no marker and could
* not be told apart from a native teammate after a restart.
* @param ctx - the plugin context carrying the subagent service.
* @param configured - the deployment's fresh/fork provider names from the plugin config.
* @param onAvailability - optional observer of each context's availability change.
* @returns the maintained aliases, whose `dispose` releases every registration.
*/
function registerMemberProviders(ctx, configured, onAvailability = () => {}) {
	const states = {
		fresh: {
			alias: MEMBER_FRESH_PROVIDER,
			upstreamName: configured.fresh,
			upstream: void 0,
			release: void 0,
			failure: void 0,
			reported: false
		},
		fork: {
			alias: MEMBER_FORK_PROVIDER,
			upstreamName: configured.fork,
			upstream: void 0,
			release: void 0,
			failure: void 0,
			reported: false
		}
	};
	let disposed = false;
	let reconciling = false;
	/**
	* Look up an upstream provider without letting a broken registry take the
	* plugin down: the Settings page and the preset tools belong to such a
	* deployment; only member creation has no channel.
	* @param name - the configured upstream provider name.
	* @returns the provider, or the refusal kind and reason instead.
	*/
	const lookup = (name) => {
		const subagents = ctx.get("subagents");
		if (subagents === void 0) return {
			state: "missing",
			reason: "this deployment composes no subagent service, so a Team member cannot be created through this plugin's identity alias."
		};
		try {
			const provider = subagents.getProvider(name);
			return provider === void 0 ? {
				state: "missing",
				reason: `this deployment registers no subagent provider named "${name}".`
			} : { provider };
		} catch (error) {
			return {
				state: "registration",
				reason: `the subagent providers could not be read: ${String(error)}`
			};
		}
	};
	/**
	* Release one context's live alias, if it has one.
	*
	* The upstream is cleared BEFORE the registration is released, so the
	* `subagent/provider-removed` this release emits cannot be mistaken for the
	* deployment withdrawing the provider, and cannot re-enter this sweep.
	* @param state - the context whose alias is released.
	*/
	const detach = (state) => {
		const release = state.release;
		state.release = void 0;
		state.upstream = void 0;
		if (release !== void 0) release();
	};
	/**
	* Report one context's availability, once per actual change.
	* @param state - the context whose registration was updated.
	* @param context - the spawn context, for the availability report.
	*/
	const report = (state, context) => {
		const failure = state.failure;
		if (failure === void 0) {
			state.reported = false;
			return;
		}
		if (state.reported) return;
		state.reported = true;
		onAvailability(context, failure.state, failure.reason);
	};
	/**
	* Record why one context is unusable, releasing the alias it may still hold.
	*
	* A refusal with a different *kind* than the one already standing is a new
	* fact — a provider that was merely absent and now actively cannot back a
	* member, for instance — so it is reported even though the context was
	* already unusable.
	* @param state - the context to refuse.
	* @param reason - the refusal a member creation must report.
	* @param failureState - the category of the refusal.
	* @param context - the spawn context, for the availability report.
	*/
	const fail = (state, reason, failureState, context) => {
		detach(state);
		const previous = state.failure;
		if (previous?.state !== failureState || previous.reason !== reason) state.reported = false;
		state.failure = {
			state: failureState,
			reason
		};
		report(state, context);
	};
	/**
	* Validate one context and register, rebind, or release its alias to match.
	*
	* Registration happens only on a real change — no live alias, or a live alias
	* still delegating to the same upstream object — so the events this function
	* causes can never make it re-register what it just registered.
	* @param context - the spawn context to reconcile.
	*/
	const reconcile = (context) => {
		const state = states[context];
		if (state.upstreamName.trim() === "") {
			fail(state, `the ${context} subagent provider is not configured, so a ${context} member cannot be created without losing the identity that proves it is preset-managed.`, "unconfigured", context);
			return;
		}
		if (isPresetMemberProvider(state.upstreamName)) {
			fail(state, `the ${context} subagent provider "${state.upstreamName}" is this plugin's own member alias; point the plugin at the deployment provider it should delegate to.`, "alias", context);
			return;
		}
		const found = lookup(state.upstreamName);
		if ("state" in found) {
			fail(state, found.state === "missing" ? found.reason + ` A ${context} member cannot be created through this plugin's identity alias.` : found.reason, found.state, context);
			return;
		}
		const { provider } = found;
		if (provider.prepareContinuable === void 0) {
			fail(state, `subagent provider "${state.upstreamName}" cannot create continuable children, so it cannot back a ${context} Team member.`, "unsupported", context);
			return;
		}
		if (state.upstream === provider) {
			state.failure = void 0;
			report(state, context);
			return;
		}
		detach(state);
		try {
			const release = ctx.get("subagents")?.registerProvider(aliasProvider(state.alias, provider));
			if (release === void 0) {
				fail(state, `the ${context} member execution alias "${state.alias}" could not be registered: the subagent service was released while it was being registered.`, "registration", context);
				return;
			}
			state.upstream = provider;
			state.release = release;
		} catch (error) {
			fail(state, `the ${context} member execution alias "${state.alias}" could not be registered: ${String(error)}`, "registration", context);
			return;
		}
		state.failure = void 0;
		report(state, context);
	};
	/**
	* Re-validate both contexts. Never runs inside another sweep: the events a
	* registration or release emits re-enter here, and the outer sweep already
	* covers them.
	*/
	const sweep = () => {
		if (disposed || reconciling) return;
		reconciling = true;
		try {
			for (const context of CONTEXTS) reconcile(context);
		} finally {
			reconciling = false;
		}
	};
	/**
	* Follow the provider registry for as long as this activation lives.
	*
	* Only providers this plugin does not own are interesting: its own aliases
	* arrive here too, and following them would be a self-loop. The listeners are
	* registered before the initial scan so a registration that lands in between
	* is not missed.
	* @param name - the provider name the event names, for `provider-added` and `provider-removed` alike.
	*/
	const follow = (name) => {
		if (disposed || isPresetMemberProvider(name)) return;
		sweep();
	};
	const disposers = [];
	disposers.push(ctx.on("subagent/provider-added", (provider) => {
		follow(provider.name);
	}));
	disposers.push(ctx.on("subagent/provider-removed", (name) => {
		follow(name);
	}));
	sweep();
	return {
		get fresh() {
			return states.fresh.alias;
		},
		get fork() {
			return states.fork.alias;
		},
		get freshError() {
			return states.fresh.failure?.reason;
		},
		get forkError() {
			return states.fork.failure?.reason;
		},
		dispose: () => {
			if (disposed) return;
			disposed = true;
			for (const off of disposers.splice(0).reverse()) off();
			for (const context of CONTEXTS) {
				const state = states[context];
				detach(state);
				state.failure = void 0;
			}
		}
	};
}


const PRESET_TOOLS = [
	"spawn_team_member",
	"get_team_preset",
	"update_team_preset"
];
const TEAM_TOOLS = [
	"spawn_teammate",
	"send_message",
	"list_agents",
	"wait_agent",
	"interrupt_agent",
	"team_task_create",
	"team_task_get",
	"team_task_list",
	"team_task_update"
];
const OWN_TOOLS = new Set([...PRESET_TOOLS, ...TEAM_TOOLS]);
const MARKER = "\n\n[team-presets-tool-policy:v1]";
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
function isOwnLayerTool(name) {
	return OWN_TOOLS.has(name);
}
function policyOf(teamId, slot) {
	return {
		teamId,
		mode: toolMode(slot),
		allow: [...slot.tools]
	};
}
/** Probe only inherited names; fixed own-layer Team tools are enforced by guard. */
function inheritedFilter(agent, policy) {
	if (policy.mode === "all") return void 0;
	if (policy.allow.includes(RUN_CODE_NAME)) throw new Error("Allow end-capability tools, not the run_code transport.");
	const inherited = [];
	for (const name of policy.allow) {
		if (OWN_TOOLS.has(name)) continue;
		try {
			agent.ctx.tools.restrict({ allow: [name] })();
			inherited.push(name);
		} catch (error) {
			if (agent.ctx.tools.get(name, agent) === void 0) throw error;
		}
	}
	return { allow: inherited };
}
/** Own-layer tools and nested PTC capability dispatch both pass through this guard. */
function guardPolicy(agent, policy, role = {}) {
	const member = role.role === "member";
	const allowed = new Set(policy.allow);
	let native;
	if (policy.mode === "custom" && role.presentation !== "caller") try {
		native = agent.ctx.tools.presentAs("native");
	} catch {}
	const disposeGuard = agent.ctx.tools.guard((exec) => {
		if (exec.name === "spawn_teammate") return member ? "A Team member cannot create teammates; ask the Team Lead to summon one." : "This Team uses preset-managed creation; call spawn_team_member instead.";
		if (policy.mode === "custom" && [
			"subagent",
			"subagent_fork",
			"workflow"
		].includes(exec.name)) return member ? "A Team member cannot delegate through providers; report the limitation to the Team Lead." : "Custom Team policies cannot delegate through providers without a durable strict-policy contract; use preset-managed Team members.";
		if (exec.name === RUN_CODE_NAME && policy.mode === "custom") return "Custom Team policies deny general-purpose run_code; use native allowed tools.";
		if (policy.mode === "custom" && !allowed.has(exec.name)) return `Team preset "${policy.teamId}" tool policy denies "${exec.name}".`;
	});
	return () => {
		disposeGuard();
		native?.();
	};
}
/** Old plugin-generated briefing, not merely upstream Team membership. */
function hasLegacyPresetBriefing(agent) {
	for (const event of agent.session.ownEvents()) {
		if (event.type !== "subagent/descriptor") continue;
		const data = event.data;
		return typeof data.persona === "string" && /^You are "[^"\n]+"(?: \([^\n]*\))? on the Agent Team "/u.test(data.persona);
	}
	return false;
}
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
function descriptorPolicy(agent, legacyTeam = false) {
	for (const event of agent.session.ownEvents()) {
		if (event.type !== "subagent/descriptor") continue;
		const data = event.data;
		if (data.mode !== "continuable") return void 0;
		const persona = typeof data.persona === "string" ? data.persona : "";
		const at = persona.lastIndexOf(MARKER);
		if (at === -1) {
			if (persona.includes("[team-presets-tool-policy:")) throw new Error("Unsupported persisted Team tool policy version");
			if (!legacyTeam) return void 0;
			const filter = event.data.toolFilter;
			if (filter?.allow !== void 0) {
				if (!Array.isArray(filter.allow) || filter.allow.some((name) => typeof name !== "string")) throw new Error("Invalid legacy Team tool policy");
				return {
					teamId: "legacy-delegation",
					mode: "custom",
					allow: filter.allow
				};
			}
			if (filter !== void 0) return {
				teamId: "legacy-delegation",
				mode: "custom",
				allow: []
			};
			return;
		}
		const raw = JSON.parse(persona.slice(at + 31));
		if (typeof raw !== "object" || raw === null) throw new Error("Invalid persisted Team tool policy");
		const policy = raw;
		if (typeof policy.teamId !== "string" || typeof policy.mode !== "string" || !["all", "custom"].includes(policy.mode) || !Array.isArray(policy.allow) || policy.allow.some((name) => typeof name !== "string")) throw new Error("Invalid persisted Team tool policy");
		return {
			teamId: policy.teamId,
			mode: policy.mode,
			allow: policy.allow
		};
	}
}


/**
* Canonical descriptions for the tools this plugin registers.
*
* One source per tool: the model-facing definition and the settings hover tip
* show the same text, so the two can never drift into two different accounts of
* one capability.
*
* Only tools this plugin implements appear here. An upstream tool keeps the
* description its own author wrote and is never re-described here — inventing
* hover text for someone else's tool would put unverified claims in the tip, and
* the description is model-facing text first. These strings are deliberately
* English only: the upstream `ToolDefinition` carries a single description with
* no localization field, and the UI shows that same string verbatim.
* @module dsh-agent-team-presets/tool-descriptions
*/
/** The captain's preset-managed member creation tool. */
const SPAWN_TEAM_MEMBER_DESCRIPTION = "Create one teammate from the active Team preset, applying that member's own system prompt, model, reasoning effort, and tool scope.";
/** The captain's read access to the Session's Team preset. */
const GET_TEAM_PRESET_DESCRIPTION = "Read the Agent Team preset for this Session with the exact settings revision and every editable field. Call it before update_team_preset. When this Session selected no Team, the result says so and lists the configured Teams.";
/** The captain's revision-fenced write to the shared Team preset. */
const UPDATE_TEAM_PRESET_DESCRIPTION = "Persist changes to a shared Team purpose or role prompt after Host confirmation of the exact change. Requires a human-started turn; refuses while teammates execute or when approval is unavailable/never. Read get_team_preset first. Does not change names, routes, or tool policies.";


/**
* Apply one Team preset to one live Session.
*
* The captain's system prompt shadows the deployment persona for that Session,
* the captain's independent tool mode scopes the Session's visible global tools,
* and the Session gains `spawn_team_member`, which applies the selected member's
* own persona, route, reasoning effort, and tool mode. The Session keeps the
* model it already selected: a captain never changes the Session's route. A
* member's persona and tool mode belong to the definition the Team task started
* with; its route does not, so a corrected route reaches the next member the
* task summons.
* @module dsh-agent-team-presets/application
*/
/** Output schema of one `spawn_team_member` result. */
const SPAWN_VALUE_SCHEMA = {
	type: "object",
	additionalProperties: false,
	properties: {
		target: {
			type: "string",
			required: true
		},
		status: {
			type: "string",
			required: true,
			enum: ["active", "failed"]
		},
		configuredRoute: {
			type: "object",
			additionalProperties: false,
			properties: {
				provider: {
					type: "string",
					required: true
				},
				model: {
					type: "string",
					required: true
				},
				reasoningEffort: { type: "string" }
			}
		}
	}
};
/**
* Build the child route of one configured agent slot.
* @param preset - the configured captain or member.
* @returns the child Agent options, or undefined without a configured route.
*/
function routeOptions(preset) {
	if (preset.provider === "" || preset.model === "") return void 0;
	return {
		provider: preset.provider,
		model: preset.model,
		...preset.reasoningEffort === "" ? {} : { reasoningEffort: ReasoningEffortId(preset.reasoningEffort) }
	};
}
/**
* Register the captain's tool scope on one Session.
* Invalid tool names reject application instead of granting unrestricted access.
* @param agent - the live Session agent.
* @param captain - configured policy and allow-list; custom-empty denies every global tool.
* @returns the restriction disposer, or undefined for the default-all policy.
*/
function restrictCaptainTools(agent, captain) {
	if (toolMode(captain) === "all") return void 0;
	const filter = inheritedFilter(agent, policyOf("captain", captain));
	return filter === void 0 ? void 0 : agent.ctx.tools.restrict(filter);
}
/**
* Reject a Team this Session cannot apply, before any registration is touched.
*
* `tools.restrict` owns the authority on which global names an allow-list may
* carry, and the probe applies and lifts it so the real application still
* registers exactly one restriction. Every other registration a Team needs —
* the two prompt sections and the member tool — uses names and orders fixed by
* this plugin, so a captain allow-list naming an unknown tool is the failure an
* adoption can actually hit. Callers check before releasing a running
* application, so a refused preset never leaves a Session without one.
* @param agent - the live Session agent about to take the Team.
* @param team - the Team preset about to be applied.
* @throws when the captain's custom allow-list names a tool this Session cannot restrict.
*/
function assertTeamApplicable(agent, team) {
	const { captain } = team;
	if (toolMode(captain) === "all") return;
	const filter = inheritedFilter(agent, policyOf(team.id, captain));
	if (filter !== void 0) agent.ctx.tools.restrict(filter)();
}
/**
* Reject a Team whose allow-list names a capability this Session does not have.
*
* The settings catalog is the union of every standing Agent preset's tools, not
* what one Session can actually call: a `minimal` Session composes no file
* tools, so an allow-list naming one cannot be honoured. It is refused with the
* missing names instead of being widened to the default-all policy or silently
* trimmed, and the tool is never added just because the catalog lists it.
* @param agent - the live Session agent about to take the Team.
* @param team - the Team preset about to be applied.
* @returns the refusal text, or undefined when every named capability is reachable.
*/
function capabilityRefusal(agent, team) {
	const missing = /* @__PURE__ */ new Map();
	const slots = [["captain", team.captain], ...team.members.map((member, index) => [`member "${member.name.trim() === "" ? `member-${index + 1}` : member.name.trim()}"`, member])];
	for (const [label, slot] of slots) {
		if (toolMode(slot) !== "custom") continue;
		for (const name of slot.tools) {
			if (isOwnLayerTool(name)) continue;
			if (agent.ctx.tools.get(name, agent) !== void 0) continue;
			missing.set(label, [...missing.get(label) ?? [], name]);
		}
	}
	if (missing.size === 0) return void 0;
	const detail = [...missing].map(([label, names]) => `${label}: ${names.join(", ")}`).join("; ");
	return `Team "${team.id}" names capabilities this Session cannot reach (${detail}). The tools catalog lists the union of every Agent preset, not what this Session composes: select an Agent preset that provides those tools, or remove them from the allow-list.`;
}
/** How an official creation refusal is explained to the Team Lead. */
const CONCURRENT_CAPACITY = /active child limit/i;
/** The Team's lifetime member allowance, which a finished member still occupies. */
const LIFETIME_QUOTA = /team member limit/i;
/**
* Explain one failed creation in terms the captain can act on.
*
* The two limits are different: an activity slot frees itself when a member
* finishes, while a used-up Team allowance never comes back. The official text
* is always preserved verbatim inside the explanation, because it carries the
* exact numbers the Host decided with.
* @param error - the failure `spawnTeammate` reported.
* @returns the model-facing explanation.
*/
function classifySpawnFailure(error) {
	const message = error instanceof Error ? error.message : String(error);
	if (CONCURRENT_CAPACITY.test(message)) return `No subagent slot is free right now: this deployment's concurrent subagent limit is reached. Wait for a running member to finish, then summon again. (${message})`;
	if (LIFETIME_QUOTA.test(message)) return `This Team has used up its lifetime member allowance. A member that already finished still occupies its Team roster slot, so this Team cannot summon another instance; finish the task with the members it has. (${message})`;
	return message;
}
/**
* Pick the member whose route one spawn uses.
*
* The roster, role, standing prompt, and tool scope come from the definition
* the task started with, so a task keeps summoning the members it began with.
* The route is operational rather than behavioral: it is read from the stored
* definition for the same target, which is how a route corrected while the task
* runs reaches the next member the captain summons. A stored Team that is gone,
* or that no longer carries the target, leaves the frozen route in place.
* @param frozen - the member as the applied definition holds it.
* @param stored - the latest stored definition of the applied Team, when the Host still has it.
* @returns the member whose route this spawn uses.
*/
function routedMember(frozen, stored) {
	if (stored === void 0) return frozen;
	if (frozen.id !== void 0) {
		const identified = stored.members.filter((member) => member.id === frozen.id);
		return identified.length === 1 ? identified[0] : frozen;
	}
	const matches = stored.members.filter((member) => member.name.trim() === frozen.name.trim());
	return matches.length === 1 ? matches[0] : frozen;
}
/**
* Register the model-facing member tool on one Session.
*
* Official rc.2's Team request accepts only `name`, `description`, `prompt`,
* `context`, `provider`, and `signal`; the member's route, persona, and tool
* scope therefore travel through the durable member snapshot this tool records
* BEFORE `spawnTeammate` is called, and are installed by the serial
* `agent/created` listener. A refused snapshot refuses the spawn: a member that
* could not be recorded must not be created, because nothing would re-scope it.
* @param ctx - the plugin context providing `agentTeams`.
* @param agent - the live Session agent that owns the tool.
* @param team - the applied Team preset.
* @param providers - continuable-subagent providers to spawn through.
* @param stored - reads the latest stored definition of the applied Team.
* @param members - the durable member runtime owned by this plugin activation.
* @returns the tool registration disposer.
*/
function registerMemberTool(ctx, agent, team, providers, stored, members) {
	const targets = memberTargets(team);
	const summary = targets.map(({ target }) => target).join(", ");
	const reserved = /* @__PURE__ */ new Set();
	return agent.ctx.tools.register(defineTool({
		name: "spawn_team_member",
		description: `${SPAWN_TEAM_MEMBER_DESCRIPTION} Available members: ${summary.length === 0 ? "(none)" : summary}.`,
		parameters: {
			member: {
				type: "string",
				required: true,
				description: "Member target from the active Team preset roster."
			},
			task: {
				type: "string",
				required: true,
				description: "Complete initial task for the member, including every fact it needs."
			},
			description: {
				type: "string",
				description: "Short description of the delegated responsibility; defaults to the member preset description."
			},
			context: {
				type: "string",
				enum: ["fresh", "fork"],
				description: "fresh starts without your history; fork inherits your completed turns. Defaults to fresh."
			}
		},
		output: {
			schema: SPAWN_VALUE_SCHEMA,
			render: (_args, value) => [{
				type: "text",
				text: JSON.stringify(value)
			}]
		},
		async execute(args, exec) {
			const caller = exec.agent;
			if (caller === void 0) throw new Error("spawn_team_member requires a calling Agent");
			const resolved = findMember(team, args.member);
			if (resolved === void 0) throw new Error(`unknown Team member "${args.member}"; available members: ${targets.map((entry) => entry.target).join(", ") || "(none)"}`);
			const { member, target } = resolved;
			if (members === void 0) throw new Error("This Session was composed without the preset member runtime, so a summoned member could not be given its frozen configuration. Spawning a member is refused.");
			const depth = depthRefusal(ctx, caller);
			if (depth !== void 0) throw new Error(depth);
			const context = args.context ?? "fresh";
			const alias = memberProviderFor(providers, context);
			if ("error" in alias) throw new Error(alias.error);
			const used = new Set(ctx.agentTeams.listMembers(caller).map((row) => row.name));
			for (const name of reserved) used.add(name);
			let instance = target;
			let suffix = 2;
			while (used.has(instance)) {
				const tail = `-${suffix++}`;
				instance = `${target.slice(0, 64 - tail.length).replace(/-+$/u, "")}${tail}`;
			}
			reserved.add(instance);
			try {
				return await members.admit(async () => {
					const task = [{
						type: "text",
						text: args.task
					}];
					const route = routeOptions(routedMember(member, stored()));
					const unusableRoute = await routeRefusal(ctx, route);
					if (unusableRoute !== void 0) throw new Error(unusableRoute);
					const recheck = depthRefusal(ctx, caller);
					if (recheck !== void 0) throw new Error(recheck);
					const policy = policyOf(team.id, member);
					const prepared = await members.prepare({
						root: caller,
						target: instance,
						teamId: team.id,
						roleId: member.id,
						displayName: member.name.trim(),
						roleDescription: member.description.trim(),
						persona: memberBriefing(team, member, instance),
						teamSection: memberTeamDivision(team, instance),
						roster: targets.map((entry) => ({
							target: entry.target,
							display: entry.member.name.trim(),
							description: entry.member.description.trim()
						})),
						route,
						policy,
						spawnContext: context
					});
					if (prepared.kind === "refused") throw new Error(prepared.reason);
					try {
						const result = await ctx.agentTeams.spawnTeammate(caller, {
							name: instance,
							description: args.description ?? (member.description.trim() === "" ? member.name.trim() || target : member.description.trim()),
							prompt: task,
							context,
							provider: alias.name,
							signal: exec.signal
						});
						const failed = result.member.status === "failed";
						if (failed) await members.markFailed(caller.id, instance);
						return {
							target: result.member.name,
							status: failed ? "failed" : "active",
							...route === void 0 ? {} : { configuredRoute: { ...route } }
						};
					} catch (error) {
						await members.markFailed(caller.id, instance);
						const cause = members.failureOf(caller.id, instance);
						const reported = classifySpawnFailure(error);
						if (cause === void 0) throw new Error(reported, { cause: error });
						throw new Error(`${reported} (the member's own first request failed: ${cause})`, { cause: error });
					}
				});
			} finally {
				reserved.delete(instance);
			}
		}
	}));
}
/**
* Apply one Team preset to one live Session.
*
* A later call for the same Session replaces the previous application.
* @param ctx - the plugin context providing the Team and Session services.
* @param agent - the live Session agent taking the Team.
* @param team - the Team preset to apply.
* @param providers - continuable-subagent providers the member tool spawns through.
* @param stored - reads the latest stored definition of this Team, so a member
*   spawned later runs on its current route; defaults to the applied definition.
* @param members - the durable member runtime that freezes each summoned
*   member's configuration before creation; without one the member tool refuses
*   rather than creating a member nothing could re-scope.
* @returns the applied Team, whose `dispose` releases every registration.
*/
function applyTeamToAgent(ctx, agent, team, providers, stored = () => void 0, members, options = {}) {
	const disposers = [];
	const register = (disposer) => {
		if (disposer !== void 0) disposers.push(disposer);
	};
	try {
		const { captain } = team;
		if (captain.systemPrompt.trim() !== "") register(agent.ctx.systemPrompt.section({
			name: PERSONA_PREFIX_SECTION,
			order: agent.ctx.systemPrompt.getSectionOrder("DEPLOYMENT_PERSONA_PREFIX"),
			text: captain.systemPrompt
		}));
		else if (options.personaFallback !== void 0 && options.personaFallback.trim() !== "") register(agent.ctx.systemPrompt.section({
			name: PERSONA_PREFIX_SECTION,
			order: agent.ctx.systemPrompt.getSectionOrder("DEPLOYMENT_PERSONA_PREFIX"),
			text: options.personaFallback
		}));
		const briefing = captainBriefing(team);
		if (briefing !== "") register(agent.ctx.systemPrompt.section({
			name: "agent-team-presets:briefing",
			order: agent.ctx.systemPrompt.getSectionOrder("TEAM_POLICY"),
			text: briefing
		}));
		register(guardPolicy(agent, policyOf(team.id, captain), options.presentation === void 0 ? {} : { presentation: "caller" }));
		if (options.presentation !== void 0) register(options.presentation.install());
		register(restrictCaptainTools(agent, captain));
		register(registerMemberTool(ctx, agent, team, providers, stored, members));
	} catch (error) {
		for (const dispose of disposers.reverse()) dispose();
		throw error;
	}
	return {
		teamId: team.id,
		fingerprint: definitionFingerprint(team),
		...options.presentation?.disclosure === void 0 ? {} : { presentationNote: options.presentation.disclosure },
		dispose() {
			for (const dispose of disposers.splice(0).reverse()) dispose();
		}
	};
}


var _a$1;
function $constructor(name, initializer, params) {
	function init(inst, def) {
		if (!inst._zod) Object.defineProperty(inst, "_zod", {
			value: {
				def,
				constr: _,
				traits: /* @__PURE__ */ new Set()
			},
			enumerable: false
		});
		if (inst._zod.traits.has(name)) return;
		inst._zod.traits.add(name);
		initializer(inst, def);
		const proto = _.prototype;
		const keys = Object.keys(proto);
		for (let i = 0; i < keys.length; i++) {
			const k = keys[i];
			if (!(k in inst)) inst[k] = proto[k].bind(inst);
		}
	}
	const Parent = params?.Parent ?? Object;
	class Definition extends Parent {}
	Object.defineProperty(Definition, "name", { value: name });
	function _(def) {
		var _a;
		const inst = params?.Parent ? new Definition() : this;
		init(inst, def);
		(_a = inst._zod).deferred ?? (_a.deferred = []);
		for (const fn of inst._zod.deferred) fn();
		return inst;
	}
	Object.defineProperty(_, "init", { value: init });
	Object.defineProperty(_, Symbol.hasInstance, { value: (inst) => {
		if (params?.Parent && inst instanceof params.Parent) return true;
		return inst?._zod?.traits?.has(name);
	} });
	Object.defineProperty(_, "name", { value: name });
	return _;
}
var $ZodAsyncError = class extends Error {
	constructor() {
		super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
	}
};
var $ZodEncodeError = class extends Error {
	constructor(name) {
		super(`Encountered unidirectional transform during encode: ${name}`);
		this.name = "ZodEncodeError";
	}
};
(_a$1 = globalThis).__zod_globalConfig ?? (_a$1.__zod_globalConfig = {});
const globalConfig = globalThis.__zod_globalConfig;
function config(newConfig) {
	if (newConfig) Object.assign(globalConfig, newConfig);
	return globalConfig;
}


function getEnumValues(entries) {
	const numericValues = Object.values(entries).filter((v) => typeof v === "number");
	return Object.entries(entries).filter(([k, _]) => numericValues.indexOf(+k) === -1).map(([_, v]) => v);
}
function jsonStringifyReplacer(_, value) {
	if (typeof value === "bigint") return value.toString();
	return value;
}
function cached(getter) {
	return { get value() {
		{
			const value = getter();
			Object.defineProperty(this, "value", { value });
			return value;
		}
		throw new Error("cached value already set");
	} };
}
function nullish(input) {
	return input === null || input === void 0;
}
function cleanRegex(source) {
	const start = source.startsWith("^") ? 1 : 0;
	const end = source.endsWith("$") ? source.length - 1 : source.length;
	return source.slice(start, end);
}
function floatSafeRemainder(val, step) {
	const ratio = val / step;
	const roundedRatio = Math.round(ratio);
	const tolerance = Number.EPSILON * Math.max(Math.abs(ratio), 1);
	if (Math.abs(ratio - roundedRatio) < tolerance) return 0;
	return ratio - roundedRatio;
}
const EVALUATING = /* @__PURE__*/ Symbol("evaluating");
function defineLazy(object, key, getter) {
	let value = void 0;
	Object.defineProperty(object, key, {
		get() {
			if (value === EVALUATING) return;
			if (value === void 0) {
				value = EVALUATING;
				value = getter();
			}
			return value;
		},
		set(v) {
			Object.defineProperty(object, key, { value: v });
		},
		configurable: true
	});
}
function assignProp(target, prop, value) {
	Object.defineProperty(target, prop, {
		value,
		writable: true,
		enumerable: true,
		configurable: true
	});
}
function mergeDefs(...defs) {
	const mergedDescriptors = {};
	for (const def of defs) Object.assign(mergedDescriptors, Object.getOwnPropertyDescriptors(def));
	return Object.defineProperties({}, mergedDescriptors);
}
function esc(str) {
	return JSON.stringify(str);
}
function slugify(input) {
	return input.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}
const captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {};
function isObject(data) {
	return typeof data === "object" && data !== null && !Array.isArray(data);
}
const allowsEval = /* @__PURE__*/ cached(() => {
	if (globalConfig.jitless) return false;
	if (typeof navigator !== "undefined" && navigator?.userAgent?.includes("Cloudflare")) return false;
	try {
		new Function("");
		return true;
	} catch (_) {
		return false;
	}
});
function isPlainObject(o) {
	if (isObject(o) === false) return false;
	const ctor = o.constructor;
	if (ctor === void 0) return true;
	if (typeof ctor !== "function") return true;
	const prot = ctor.prototype;
	if (isObject(prot) === false) return false;
	if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) return false;
	return true;
}
function shallowClone(o) {
	if (isPlainObject(o)) return { ...o };
	if (Array.isArray(o)) return [...o];
	if (o instanceof Map) return new Map(o);
	if (o instanceof Set) return new Set(o);
	return o;
}
const propertyKeyTypes = /* @__PURE__*/ new Set([
	"string",
	"number",
	"symbol"
]);
function escapeRegex(str) {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function clone(inst, def, params) {
	const cl = new inst._zod.constr(def ?? inst._zod.def);
	if (!def || params?.parent) cl._zod.parent = inst;
	return cl;
}
function normalizeParams(_params) {
	const params = _params;
	if (!params) return {};
	if (typeof params === "string") return { error: () => params };
	if (params?.message !== void 0) {
		if (params?.error !== void 0) throw new Error("Cannot specify both `message` and `error` params");
		params.error = params.message;
	}
	delete params.message;
	if (typeof params.error === "string") return {
		...params,
		error: () => params.error
	};
	return params;
}
function optionalKeys(shape) {
	return Object.keys(shape).filter((k) => {
		return shape[k]._zod.optin === "optional" && shape[k]._zod.optout === "optional";
	});
}
const NUMBER_FORMAT_RANGES = {
	safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
	int32: [-2147483648, 2147483647],
	uint32: [0, 4294967295],
	float32: [-34028234663852886e22, 34028234663852886e22],
	float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
};
function pick(schema, mask) {
	const currDef = schema._zod.def;
	const checks = currDef.checks;
	if (checks && checks.length > 0) throw new Error(".pick() cannot be used on object schemas containing refinements");
	return clone(schema, mergeDefs(schema._zod.def, {
		get shape() {
			const newShape = {};
			for (const key in mask) {
				if (!(key in currDef.shape)) throw new Error(`Unrecognized key: "${key}"`);
				if (!mask[key]) continue;
				newShape[key] = currDef.shape[key];
			}
			assignProp(this, "shape", newShape);
			return newShape;
		},
		checks: []
	}));
}
function omit(schema, mask) {
	const currDef = schema._zod.def;
	const checks = currDef.checks;
	if (checks && checks.length > 0) throw new Error(".omit() cannot be used on object schemas containing refinements");
	return clone(schema, mergeDefs(schema._zod.def, {
		get shape() {
			const newShape = { ...schema._zod.def.shape };
			for (const key in mask) {
				if (!(key in currDef.shape)) throw new Error(`Unrecognized key: "${key}"`);
				if (!mask[key]) continue;
				delete newShape[key];
			}
			assignProp(this, "shape", newShape);
			return newShape;
		},
		checks: []
	}));
}
function extend(schema, shape) {
	if (!isPlainObject(shape)) throw new Error("Invalid input to extend: expected a plain object");
	const checks = schema._zod.def.checks;
	if (checks && checks.length > 0) {
		const existingShape = schema._zod.def.shape;
		for (const key in shape) if (Object.getOwnPropertyDescriptor(existingShape, key) !== void 0) throw new Error("Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.");
	}
	return clone(schema, mergeDefs(schema._zod.def, { get shape() {
		const _shape = {
			...schema._zod.def.shape,
			...shape
		};
		assignProp(this, "shape", _shape);
		return _shape;
	} }));
}
function safeExtend(schema, shape) {
	if (!isPlainObject(shape)) throw new Error("Invalid input to safeExtend: expected a plain object");
	return clone(schema, mergeDefs(schema._zod.def, { get shape() {
		const _shape = {
			...schema._zod.def.shape,
			...shape
		};
		assignProp(this, "shape", _shape);
		return _shape;
	} }));
}
function merge(a, b) {
	if (a._zod.def.checks?.length) throw new Error(".merge() cannot be used on object schemas containing refinements. Use .safeExtend() instead.");
	return clone(a, mergeDefs(a._zod.def, {
		get shape() {
			const _shape = {
				...a._zod.def.shape,
				...b._zod.def.shape
			};
			assignProp(this, "shape", _shape);
			return _shape;
		},
		get catchall() {
			return b._zod.def.catchall;
		},
		checks: b._zod.def.checks ?? []
	}));
}
function partial(Class, schema, mask) {
	const checks = schema._zod.def.checks;
	if (checks && checks.length > 0) throw new Error(".partial() cannot be used on object schemas containing refinements");
	return clone(schema, mergeDefs(schema._zod.def, {
		get shape() {
			const oldShape = schema._zod.def.shape;
			const shape = { ...oldShape };
			if (mask) for (const key in mask) {
				if (!(key in oldShape)) throw new Error(`Unrecognized key: "${key}"`);
				if (!mask[key]) continue;
				shape[key] = Class ? new Class({
					type: "optional",
					innerType: oldShape[key]
				}) : oldShape[key];
			}
			else for (const key in oldShape) shape[key] = Class ? new Class({
				type: "optional",
				innerType: oldShape[key]
			}) : oldShape[key];
			assignProp(this, "shape", shape);
			return shape;
		},
		checks: []
	}));
}
function required(Class, schema, mask) {
	return clone(schema, mergeDefs(schema._zod.def, { get shape() {
		const oldShape = schema._zod.def.shape;
		const shape = { ...oldShape };
		if (mask) for (const key in mask) {
			if (!(key in shape)) throw new Error(`Unrecognized key: "${key}"`);
			if (!mask[key]) continue;
			shape[key] = new Class({
				type: "nonoptional",
				innerType: oldShape[key]
			});
		}
		else for (const key in oldShape) shape[key] = new Class({
			type: "nonoptional",
			innerType: oldShape[key]
		});
		assignProp(this, "shape", shape);
		return shape;
	} }));
}
function aborted(x, startIndex = 0) {
	if (x.aborted === true) return true;
	for (let i = startIndex; i < x.issues.length; i++) if (x.issues[i]?.continue !== true) return true;
	return false;
}
function explicitlyAborted(x, startIndex = 0) {
	if (x.aborted === true) return true;
	for (let i = startIndex; i < x.issues.length; i++) if (x.issues[i]?.continue === false) return true;
	return false;
}
function prefixIssues(path, issues) {
	return issues.map((iss) => {
		var _a;
		(_a = iss).path ?? (_a.path = []);
		iss.path.unshift(path);
		return iss;
	});
}
function unwrapMessage(message) {
	return typeof message === "string" ? message : message?.message;
}
function finalizeIssue(iss, ctx, config) {
	const message = iss.message ? iss.message : unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ?? unwrapMessage(ctx?.error?.(iss)) ?? unwrapMessage(config.customError?.(iss)) ?? unwrapMessage(config.localeError?.(iss)) ?? "Invalid input";
	const { inst: _inst, continue: _continue, input: _input, ...rest } = iss;
	rest.path ?? (rest.path = []);
	rest.message = message;
	if (ctx?.reportInput) rest.input = _input;
	return rest;
}
function getLengthableOrigin(input) {
	if (Array.isArray(input)) return "array";
	if (typeof input === "string") return "string";
	return "unknown";
}
function issue(...args) {
	const [iss, input, inst] = args;
	if (typeof iss === "string") return {
		message: iss,
		code: "custom",
		input,
		inst
	};
	return { ...iss };
}


const initializer$1 = (inst, def) => {
	inst.name = "$ZodError";
	Object.defineProperty(inst, "_zod", {
		value: inst._zod,
		enumerable: false
	});
	Object.defineProperty(inst, "issues", {
		value: def,
		enumerable: false
	});
	inst.message = JSON.stringify(def, jsonStringifyReplacer, 2);
	Object.defineProperty(inst, "toString", {
		value: () => inst.message,
		enumerable: false
	});
};
const $ZodError = $constructor("$ZodError", initializer$1);
const $ZodRealError = $constructor("$ZodError", initializer$1, { Parent: Error });
function flattenError(error, mapper = (issue) => issue.message) {
	const fieldErrors = {};
	const formErrors = [];
	for (const sub of error.issues) if (sub.path.length > 0) {
		fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
		fieldErrors[sub.path[0]].push(mapper(sub));
	} else formErrors.push(mapper(sub));
	return {
		formErrors,
		fieldErrors
	};
}
function formatError(error, mapper = (issue) => issue.message) {
	const fieldErrors = { _errors: [] };
	const processError = (error, path = []) => {
		for (const issue of error.issues) if (issue.code === "invalid_union" && issue.errors.length) issue.errors.map((issues) => processError({ issues }, [...path, ...issue.path]));
		else if (issue.code === "invalid_key") processError({ issues: issue.issues }, [...path, ...issue.path]);
		else if (issue.code === "invalid_element") processError({ issues: issue.issues }, [...path, ...issue.path]);
		else {
			const fullpath = [...path, ...issue.path];
			if (fullpath.length === 0) fieldErrors._errors.push(mapper(issue));
			else {
				let curr = fieldErrors;
				let i = 0;
				while (i < fullpath.length) {
					const el = fullpath[i];
					if (!(i === fullpath.length - 1)) curr[el] = curr[el] || { _errors: [] };
					else {
						curr[el] = curr[el] || { _errors: [] };
						curr[el]._errors.push(mapper(issue));
					}
					curr = curr[el];
					i++;
				}
			}
		}
	};
	processError(error);
	return fieldErrors;
}


const _parse = (_Err) => (schema, value, _ctx, _params) => {
	const ctx = _ctx ? {
		..._ctx,
		async: false
	} : { async: false };
	const result = schema._zod.run({
		value,
		issues: []
	}, ctx);
	if (result instanceof Promise) throw new $ZodAsyncError();
	if (result.issues.length) {
		const e = new ((_params?.Err) ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
		captureStackTrace(e, _params?.callee);
		throw e;
	}
	return result.value;
};
const _parseAsync = (_Err) => async (schema, value, _ctx, params) => {
	const ctx = _ctx ? {
		..._ctx,
		async: true
	} : { async: true };
	let result = schema._zod.run({
		value,
		issues: []
	}, ctx);
	if (result instanceof Promise) result = await result;
	if (result.issues.length) {
		const e = new ((params?.Err) ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
		captureStackTrace(e, params?.callee);
		throw e;
	}
	return result.value;
};
const _safeParse = (_Err) => (schema, value, _ctx) => {
	const ctx = _ctx ? {
		..._ctx,
		async: false
	} : { async: false };
	const result = schema._zod.run({
		value,
		issues: []
	}, ctx);
	if (result instanceof Promise) throw new $ZodAsyncError();
	return result.issues.length ? {
		success: false,
		error: new (_Err ?? $ZodError)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
	} : {
		success: true,
		data: result.value
	};
};
const safeParse$1 = /* @__PURE__*/ _safeParse($ZodRealError);
const _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
	const ctx = _ctx ? {
		..._ctx,
		async: true
	} : { async: true };
	let result = schema._zod.run({
		value,
		issues: []
	}, ctx);
	if (result instanceof Promise) result = await result;
	return result.issues.length ? {
		success: false,
		error: new _Err(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
	} : {
		success: true,
		data: result.value
	};
};
const safeParseAsync$1 = /* @__PURE__*/ _safeParseAsync($ZodRealError);
const _encode = (_Err) => (schema, value, _ctx) => {
	const ctx = _ctx ? {
		..._ctx,
		direction: "backward"
	} : { direction: "backward" };
	return _parse(_Err)(schema, value, ctx);
};
const _decode = (_Err) => (schema, value, _ctx) => {
	return _parse(_Err)(schema, value, _ctx);
};
const _encodeAsync = (_Err) => async (schema, value, _ctx) => {
	const ctx = _ctx ? {
		..._ctx,
		direction: "backward"
	} : { direction: "backward" };
	return _parseAsync(_Err)(schema, value, ctx);
};
const _decodeAsync = (_Err) => async (schema, value, _ctx) => {
	return _parseAsync(_Err)(schema, value, _ctx);
};
const _safeEncode = (_Err) => (schema, value, _ctx) => {
	const ctx = _ctx ? {
		..._ctx,
		direction: "backward"
	} : { direction: "backward" };
	return _safeParse(_Err)(schema, value, ctx);
};
const _safeDecode = (_Err) => (schema, value, _ctx) => {
	return _safeParse(_Err)(schema, value, _ctx);
};
const _safeEncodeAsync = (_Err) => async (schema, value, _ctx) => {
	const ctx = _ctx ? {
		..._ctx,
		direction: "backward"
	} : { direction: "backward" };
	return _safeParseAsync(_Err)(schema, value, ctx);
};
const _safeDecodeAsync = (_Err) => async (schema, value, _ctx) => {
	return _safeParseAsync(_Err)(schema, value, _ctx);
};


/**
* @deprecated CUID v1 is deprecated by its authors due to information leakage
* (timestamps embedded in the id). Use {@link cuid2} instead.
* See https://github.com/paralleldrive/cuid.
*/
const cuid = /^[cC][0-9a-z]{6,}$/;
const cuid2 = /^[0-9a-z]+$/;
const ulid = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/;
const xid = /^[0-9a-vA-V]{20}$/;
const ksuid = /^[A-Za-z0-9]{27}$/;
const nanoid = /^[a-zA-Z0-9_-]{21}$/;
/** ISO 8601-1 duration regex. Does not support the 8601-2 extensions like negative durations or fractional/negative components. */
const duration$1 = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
/** A regex for any UUID-like identifier: 8-4-4-4-12 hex pattern */
const guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
/** Returns a regex for validating an RFC 9562/4122 UUID.
*
* @param version Optionally specify a version 1-8. If no version is specified, all versions are supported. */
const uuid = (version) => {
	if (!version) return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
	return new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
};
/** Practical email validation */
const email = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
const _emoji$1 = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
function emoji() {
	return new RegExp(_emoji$1, "u");
}
const ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
const ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
const cidrv4 = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
const cidrv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
const base64 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
const base64url = /^[A-Za-z0-9_-]*$/;
const httpProtocol = /^https?$/;
const e164 = /^\+[1-9]\d{6,14}$/;
const dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
const date$1 = /*@__PURE__*/ new RegExp(`^${dateSource}$`);
function timeSource(args) {
	const hhmm = `(?:[01]\\d|2[0-3]):[0-5]\\d`;
	return typeof args.precision === "number" ? args.precision === -1 ? `${hhmm}` : args.precision === 0 ? `${hhmm}:[0-5]\\d` : `${hhmm}:[0-5]\\d\\.\\d{${args.precision}}` : `${hhmm}(?::[0-5]\\d(?:\\.\\d+)?)?`;
}
function time$1(args) {
	return new RegExp(`^${timeSource(args)}$`);
}
function datetime$1(args) {
	const time = timeSource({ precision: args.precision });
	const opts = ["Z"];
	if (args.local) opts.push("");
	if (args.offset) opts.push(`([+-](?:[01]\\d|2[0-3]):[0-5]\\d)`);
	const timeRegex = `${time}(?:${opts.join("|")})`;
	return new RegExp(`^${dateSource}T(?:${timeRegex})$`);
}
const string$1 = (params) => {
	const regex = params ? `[\\s\\S]{${params?.minimum ?? 0},${params?.maximum ?? ""}}` : `[\\s\\S]*`;
	return new RegExp(`^${regex}$`);
};
const integer = /^-?\d+$/;
const number$1 = /^-?\d+(?:\.\d+)?$/;
const lowercase = /^[^A-Z]*$/;
const uppercase = /^[^a-z]*$/;


const $ZodCheck = /*@__PURE__*/ $constructor("$ZodCheck", (inst, def) => {
	var _a;
	inst._zod ?? (inst._zod = {});
	inst._zod.def = def;
	(_a = inst._zod).onattach ?? (_a.onattach = []);
});
const numericOriginMap = {
	number: "number",
	bigint: "bigint",
	object: "date"
};
const $ZodCheckLessThan = /*@__PURE__*/ $constructor("$ZodCheckLessThan", (inst, def) => {
	$ZodCheck.init(inst, def);
	const origin = numericOriginMap[typeof def.value];
	inst._zod.onattach.push((inst) => {
		const bag = inst._zod.bag;
		const curr = (def.inclusive ? bag.maximum : bag.exclusiveMaximum) ?? Number.POSITIVE_INFINITY;
		if (def.value < curr) if (def.inclusive) bag.maximum = def.value;
		else bag.exclusiveMaximum = def.value;
	});
	inst._zod.check = (payload) => {
		if (def.inclusive ? payload.value <= def.value : payload.value < def.value) return;
		payload.issues.push({
			origin,
			code: "too_big",
			maximum: typeof def.value === "object" ? def.value.getTime() : def.value,
			input: payload.value,
			inclusive: def.inclusive,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckGreaterThan = /*@__PURE__*/ $constructor("$ZodCheckGreaterThan", (inst, def) => {
	$ZodCheck.init(inst, def);
	const origin = numericOriginMap[typeof def.value];
	inst._zod.onattach.push((inst) => {
		const bag = inst._zod.bag;
		const curr = (def.inclusive ? bag.minimum : bag.exclusiveMinimum) ?? Number.NEGATIVE_INFINITY;
		if (def.value > curr) if (def.inclusive) bag.minimum = def.value;
		else bag.exclusiveMinimum = def.value;
	});
	inst._zod.check = (payload) => {
		if (def.inclusive ? payload.value >= def.value : payload.value > def.value) return;
		payload.issues.push({
			origin,
			code: "too_small",
			minimum: typeof def.value === "object" ? def.value.getTime() : def.value,
			input: payload.value,
			inclusive: def.inclusive,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckMultipleOf = /*@__PURE__*/ $constructor("$ZodCheckMultipleOf", (inst, def) => {
	$ZodCheck.init(inst, def);
	inst._zod.onattach.push((inst) => {
		var _a;
		(_a = inst._zod.bag).multipleOf ?? (_a.multipleOf = def.value);
	});
	inst._zod.check = (payload) => {
		if (typeof payload.value !== typeof def.value) throw new Error("Cannot mix number and bigint in multiple_of check.");
		if (typeof payload.value === "bigint" ? payload.value % def.value === BigInt(0) : floatSafeRemainder(payload.value, def.value) === 0) return;
		payload.issues.push({
			origin: typeof payload.value,
			code: "not_multiple_of",
			divisor: def.value,
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckNumberFormat = /*@__PURE__*/ $constructor("$ZodCheckNumberFormat", (inst, def) => {
	$ZodCheck.init(inst, def);
	def.format = def.format || "float64";
	const isInt = def.format?.includes("int");
	const origin = isInt ? "int" : "number";
	const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
	inst._zod.onattach.push((inst) => {
		const bag = inst._zod.bag;
		bag.format = def.format;
		bag.minimum = minimum;
		bag.maximum = maximum;
		if (isInt) bag.pattern = integer;
	});
	inst._zod.check = (payload) => {
		const input = payload.value;
		if (isInt) {
			if (!Number.isInteger(input)) {
				payload.issues.push({
					expected: origin,
					format: def.format,
					code: "invalid_type",
					continue: false,
					input,
					inst
				});
				return;
			}
			if (!Number.isSafeInteger(input)) {
				if (input > 0) payload.issues.push({
					input,
					code: "too_big",
					maximum: Number.MAX_SAFE_INTEGER,
					note: "Integers must be within the safe integer range.",
					inst,
					origin,
					inclusive: true,
					continue: !def.abort
				});
				else payload.issues.push({
					input,
					code: "too_small",
					minimum: Number.MIN_SAFE_INTEGER,
					note: "Integers must be within the safe integer range.",
					inst,
					origin,
					inclusive: true,
					continue: !def.abort
				});
				return;
			}
		}
		if (input < minimum) payload.issues.push({
			origin: "number",
			input,
			code: "too_small",
			minimum,
			inclusive: true,
			inst,
			continue: !def.abort
		});
		if (input > maximum) payload.issues.push({
			origin: "number",
			input,
			code: "too_big",
			maximum,
			inclusive: true,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckMaxLength = /*@__PURE__*/ $constructor("$ZodCheckMaxLength", (inst, def) => {
	var _a;
	$ZodCheck.init(inst, def);
	(_a = inst._zod.def).when ?? (_a.when = (payload) => {
		const val = payload.value;
		return !nullish(val) && val.length !== void 0;
	});
	inst._zod.onattach.push((inst) => {
		const curr = inst._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
		if (def.maximum < curr) inst._zod.bag.maximum = def.maximum;
	});
	inst._zod.check = (payload) => {
		const input = payload.value;
		if (input.length <= def.maximum) return;
		const origin = getLengthableOrigin(input);
		payload.issues.push({
			origin,
			code: "too_big",
			maximum: def.maximum,
			inclusive: true,
			input,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckMinLength = /*@__PURE__*/ $constructor("$ZodCheckMinLength", (inst, def) => {
	var _a;
	$ZodCheck.init(inst, def);
	(_a = inst._zod.def).when ?? (_a.when = (payload) => {
		const val = payload.value;
		return !nullish(val) && val.length !== void 0;
	});
	inst._zod.onattach.push((inst) => {
		const curr = inst._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
		if (def.minimum > curr) inst._zod.bag.minimum = def.minimum;
	});
	inst._zod.check = (payload) => {
		const input = payload.value;
		if (input.length >= def.minimum) return;
		const origin = getLengthableOrigin(input);
		payload.issues.push({
			origin,
			code: "too_small",
			minimum: def.minimum,
			inclusive: true,
			input,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckLengthEquals = /*@__PURE__*/ $constructor("$ZodCheckLengthEquals", (inst, def) => {
	var _a;
	$ZodCheck.init(inst, def);
	(_a = inst._zod.def).when ?? (_a.when = (payload) => {
		const val = payload.value;
		return !nullish(val) && val.length !== void 0;
	});
	inst._zod.onattach.push((inst) => {
		const bag = inst._zod.bag;
		bag.minimum = def.length;
		bag.maximum = def.length;
		bag.length = def.length;
	});
	inst._zod.check = (payload) => {
		const input = payload.value;
		const length = input.length;
		if (length === def.length) return;
		const origin = getLengthableOrigin(input);
		const tooBig = length > def.length;
		payload.issues.push({
			origin,
			...tooBig ? {
				code: "too_big",
				maximum: def.length
			} : {
				code: "too_small",
				minimum: def.length
			},
			inclusive: true,
			exact: true,
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckStringFormat = /*@__PURE__*/ $constructor("$ZodCheckStringFormat", (inst, def) => {
	var _a, _b;
	$ZodCheck.init(inst, def);
	inst._zod.onattach.push((inst) => {
		const bag = inst._zod.bag;
		bag.format = def.format;
		if (def.pattern) {
			bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
			bag.patterns.add(def.pattern);
		}
	});
	if (def.pattern) (_a = inst._zod).check ?? (_a.check = (payload) => {
		def.pattern.lastIndex = 0;
		if (def.pattern.test(payload.value)) return;
		payload.issues.push({
			origin: "string",
			code: "invalid_format",
			format: def.format,
			input: payload.value,
			...def.pattern ? { pattern: def.pattern.toString() } : {},
			inst,
			continue: !def.abort
		});
	});
	else (_b = inst._zod).check ?? (_b.check = () => {});
});
const $ZodCheckRegex = /*@__PURE__*/ $constructor("$ZodCheckRegex", (inst, def) => {
	$ZodCheckStringFormat.init(inst, def);
	inst._zod.check = (payload) => {
		def.pattern.lastIndex = 0;
		if (def.pattern.test(payload.value)) return;
		payload.issues.push({
			origin: "string",
			code: "invalid_format",
			format: "regex",
			input: payload.value,
			pattern: def.pattern.toString(),
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckLowerCase = /*@__PURE__*/ $constructor("$ZodCheckLowerCase", (inst, def) => {
	def.pattern ?? (def.pattern = lowercase);
	$ZodCheckStringFormat.init(inst, def);
});
const $ZodCheckUpperCase = /*@__PURE__*/ $constructor("$ZodCheckUpperCase", (inst, def) => {
	def.pattern ?? (def.pattern = uppercase);
	$ZodCheckStringFormat.init(inst, def);
});
const $ZodCheckIncludes = /*@__PURE__*/ $constructor("$ZodCheckIncludes", (inst, def) => {
	$ZodCheck.init(inst, def);
	const escapedRegex = escapeRegex(def.includes);
	const pattern = new RegExp(typeof def.position === "number" ? `^.{${def.position}}${escapedRegex}` : escapedRegex);
	def.pattern = pattern;
	inst._zod.onattach.push((inst) => {
		const bag = inst._zod.bag;
		bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
		bag.patterns.add(pattern);
	});
	inst._zod.check = (payload) => {
		if (payload.value.includes(def.includes, def.position)) return;
		payload.issues.push({
			origin: "string",
			code: "invalid_format",
			format: "includes",
			includes: def.includes,
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckStartsWith = /*@__PURE__*/ $constructor("$ZodCheckStartsWith", (inst, def) => {
	$ZodCheck.init(inst, def);
	const pattern = new RegExp(`^${escapeRegex(def.prefix)}.*`);
	def.pattern ?? (def.pattern = pattern);
	inst._zod.onattach.push((inst) => {
		const bag = inst._zod.bag;
		bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
		bag.patterns.add(pattern);
	});
	inst._zod.check = (payload) => {
		if (payload.value.startsWith(def.prefix)) return;
		payload.issues.push({
			origin: "string",
			code: "invalid_format",
			format: "starts_with",
			prefix: def.prefix,
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckEndsWith = /*@__PURE__*/ $constructor("$ZodCheckEndsWith", (inst, def) => {
	$ZodCheck.init(inst, def);
	const pattern = new RegExp(`.*${escapeRegex(def.suffix)}$`);
	def.pattern ?? (def.pattern = pattern);
	inst._zod.onattach.push((inst) => {
		const bag = inst._zod.bag;
		bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
		bag.patterns.add(pattern);
	});
	inst._zod.check = (payload) => {
		if (payload.value.endsWith(def.suffix)) return;
		payload.issues.push({
			origin: "string",
			code: "invalid_format",
			format: "ends_with",
			suffix: def.suffix,
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckOverwrite = /*@__PURE__*/ $constructor("$ZodCheckOverwrite", (inst, def) => {
	$ZodCheck.init(inst, def);
	inst._zod.check = (payload) => {
		payload.value = def.tx(payload.value);
	};
});


var Doc = class {
	constructor(args = []) {
		this.content = [];
		this.indent = 0;
		if (this) this.args = args;
	}
	indented(fn) {
		this.indent += 1;
		fn(this);
		this.indent -= 1;
	}
	write(arg) {
		if (typeof arg === "function") {
			arg(this, { execution: "sync" });
			arg(this, { execution: "async" });
			return;
		}
		const lines = arg.split("\n").filter((x) => x);
		const minIndent = Math.min(...lines.map((x) => x.length - x.trimStart().length));
		const dedented = lines.map((x) => x.slice(minIndent)).map((x) => " ".repeat(this.indent * 2) + x);
		for (const line of dedented) this.content.push(line);
	}
	compile() {
		const F = Function;
		const args = this?.args;
		const lines = [...(this?.content ?? [``]).map((x) => `  ${x}`)];
		return new F(...args, lines.join("\n"));
	}
};


const version = {
	major: 4,
	minor: 4,
	patch: 3
};


const $ZodType = /*@__PURE__*/ $constructor("$ZodType", (inst, def) => {
	var _a;
	inst ?? (inst = {});
	inst._zod.def = def;
	inst._zod.bag = inst._zod.bag || {};
	inst._zod.version = version;
	const checks = [...inst._zod.def.checks ?? []];
	if (inst._zod.traits.has("$ZodCheck")) checks.unshift(inst);
	for (const ch of checks) for (const fn of ch._zod.onattach) fn(inst);
	if (checks.length === 0) {
		(_a = inst._zod).deferred ?? (_a.deferred = []);
		inst._zod.deferred?.push(() => {
			inst._zod.run = inst._zod.parse;
		});
	} else {
		const runChecks = (payload, checks, ctx) => {
			let isAborted = aborted(payload);
			let asyncResult;
			for (const ch of checks) {
				if (ch._zod.def.when) {
					if (explicitlyAborted(payload)) continue;
					if (!ch._zod.def.when(payload)) continue;
				} else if (isAborted) continue;
				const currLen = payload.issues.length;
				const _ = ch._zod.check(payload);
				if (_ instanceof Promise && ctx?.async === false) throw new $ZodAsyncError();
				if (asyncResult || _ instanceof Promise) asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
					await _;
					if (payload.issues.length === currLen) return;
					if (!isAborted) isAborted = aborted(payload, currLen);
				});
				else {
					if (payload.issues.length === currLen) continue;
					if (!isAborted) isAborted = aborted(payload, currLen);
				}
			}
			if (asyncResult) return asyncResult.then(() => {
				return payload;
			});
			return payload;
		};
		const handleCanaryResult = (canary, payload, ctx) => {
			if (aborted(canary)) {
				canary.aborted = true;
				return canary;
			}
			const checkResult = runChecks(payload, checks, ctx);
			if (checkResult instanceof Promise) {
				if (ctx.async === false) throw new $ZodAsyncError();
				return checkResult.then((checkResult) => inst._zod.parse(checkResult, ctx));
			}
			return inst._zod.parse(checkResult, ctx);
		};
		inst._zod.run = (payload, ctx) => {
			if (ctx.skipChecks) return inst._zod.parse(payload, ctx);
			if (ctx.direction === "backward") {
				const canary = inst._zod.parse({
					value: payload.value,
					issues: []
				}, {
					...ctx,
					skipChecks: true
				});
				if (canary instanceof Promise) return canary.then((canary) => {
					return handleCanaryResult(canary, payload, ctx);
				});
				return handleCanaryResult(canary, payload, ctx);
			}
			const result = inst._zod.parse(payload, ctx);
			if (result instanceof Promise) {
				if (ctx.async === false) throw new $ZodAsyncError();
				return result.then((result) => runChecks(result, checks, ctx));
			}
			return runChecks(result, checks, ctx);
		};
	}
	defineLazy(inst, "~standard", () => ({
		validate: (value) => {
			try {
				const r = safeParse$1(inst, value);
				return r.success ? { value: r.data } : { issues: r.error?.issues };
			} catch (_) {
				return safeParseAsync$1(inst, value).then((r) => r.success ? { value: r.data } : { issues: r.error?.issues });
			}
		},
		vendor: "zod",
		version: 1
	}));
});
const $ZodString = /*@__PURE__*/ $constructor("$ZodString", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.pattern = [...inst?._zod.bag?.patterns ?? []].pop() ?? string$1(inst._zod.bag);
	inst._zod.parse = (payload, _) => {
		if (def.coerce) try {
			payload.value = String(payload.value);
		} catch (_) {}
		if (typeof payload.value === "string") return payload;
		payload.issues.push({
			expected: "string",
			code: "invalid_type",
			input: payload.value,
			inst
		});
		return payload;
	};
});
const $ZodStringFormat = /*@__PURE__*/ $constructor("$ZodStringFormat", (inst, def) => {
	$ZodCheckStringFormat.init(inst, def);
	$ZodString.init(inst, def);
});
const $ZodGUID = /*@__PURE__*/ $constructor("$ZodGUID", (inst, def) => {
	def.pattern ?? (def.pattern = guid);
	$ZodStringFormat.init(inst, def);
});
const $ZodUUID = /*@__PURE__*/ $constructor("$ZodUUID", (inst, def) => {
	if (def.version) {
		const v = {
			v1: 1,
			v2: 2,
			v3: 3,
			v4: 4,
			v5: 5,
			v6: 6,
			v7: 7,
			v8: 8
		}[def.version];
		if (v === void 0) throw new Error(`Invalid UUID version: "${def.version}"`);
		def.pattern ?? (def.pattern = uuid(v));
	} else def.pattern ?? (def.pattern = uuid());
	$ZodStringFormat.init(inst, def);
});
const $ZodEmail = /*@__PURE__*/ $constructor("$ZodEmail", (inst, def) => {
	def.pattern ?? (def.pattern = email);
	$ZodStringFormat.init(inst, def);
});
const $ZodURL = /*@__PURE__*/ $constructor("$ZodURL", (inst, def) => {
	$ZodStringFormat.init(inst, def);
	inst._zod.check = (payload) => {
		try {
			const trimmed = payload.value.trim();
			if (!def.normalize && def.protocol?.source === httpProtocol.source) {
				if (!/^https?:\/\//i.test(trimmed)) {
					payload.issues.push({
						code: "invalid_format",
						format: "url",
						note: "Invalid URL format",
						input: payload.value,
						inst,
						continue: !def.abort
					});
					return;
				}
			}
			const url = new URL(trimmed);
			if (def.hostname) {
				def.hostname.lastIndex = 0;
				if (!def.hostname.test(url.hostname)) payload.issues.push({
					code: "invalid_format",
					format: "url",
					note: "Invalid hostname",
					pattern: def.hostname.source,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			}
			if (def.protocol) {
				def.protocol.lastIndex = 0;
				if (!def.protocol.test(url.protocol.endsWith(":") ? url.protocol.slice(0, -1) : url.protocol)) payload.issues.push({
					code: "invalid_format",
					format: "url",
					note: "Invalid protocol",
					pattern: def.protocol.source,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			}
			if (def.normalize) payload.value = url.href;
			else payload.value = trimmed;
			return;
		} catch (_) {
			payload.issues.push({
				code: "invalid_format",
				format: "url",
				input: payload.value,
				inst,
				continue: !def.abort
			});
		}
	};
});
const $ZodEmoji = /*@__PURE__*/ $constructor("$ZodEmoji", (inst, def) => {
	def.pattern ?? (def.pattern = emoji());
	$ZodStringFormat.init(inst, def);
});
const $ZodNanoID = /*@__PURE__*/ $constructor("$ZodNanoID", (inst, def) => {
	def.pattern ?? (def.pattern = nanoid);
	$ZodStringFormat.init(inst, def);
});
/**
* @deprecated CUID v1 is deprecated by its authors due to information leakage
* (timestamps embedded in the id). Use {@link $ZodCUID2} instead.
* See https://github.com/paralleldrive/cuid.
*/
const $ZodCUID = /*@__PURE__*/ $constructor("$ZodCUID", (inst, def) => {
	def.pattern ?? (def.pattern = cuid);
	$ZodStringFormat.init(inst, def);
});
const $ZodCUID2 = /*@__PURE__*/ $constructor("$ZodCUID2", (inst, def) => {
	def.pattern ?? (def.pattern = cuid2);
	$ZodStringFormat.init(inst, def);
});
const $ZodULID = /*@__PURE__*/ $constructor("$ZodULID", (inst, def) => {
	def.pattern ?? (def.pattern = ulid);
	$ZodStringFormat.init(inst, def);
});
const $ZodXID = /*@__PURE__*/ $constructor("$ZodXID", (inst, def) => {
	def.pattern ?? (def.pattern = xid);
	$ZodStringFormat.init(inst, def);
});
const $ZodKSUID = /*@__PURE__*/ $constructor("$ZodKSUID", (inst, def) => {
	def.pattern ?? (def.pattern = ksuid);
	$ZodStringFormat.init(inst, def);
});
const $ZodISODateTime = /*@__PURE__*/ $constructor("$ZodISODateTime", (inst, def) => {
	def.pattern ?? (def.pattern = datetime$1(def));
	$ZodStringFormat.init(inst, def);
});
const $ZodISODate = /*@__PURE__*/ $constructor("$ZodISODate", (inst, def) => {
	def.pattern ?? (def.pattern = date$1);
	$ZodStringFormat.init(inst, def);
});
const $ZodISOTime = /*@__PURE__*/ $constructor("$ZodISOTime", (inst, def) => {
	def.pattern ?? (def.pattern = time$1(def));
	$ZodStringFormat.init(inst, def);
});
const $ZodISODuration = /*@__PURE__*/ $constructor("$ZodISODuration", (inst, def) => {
	def.pattern ?? (def.pattern = duration$1);
	$ZodStringFormat.init(inst, def);
});
const $ZodIPv4 = /*@__PURE__*/ $constructor("$ZodIPv4", (inst, def) => {
	def.pattern ?? (def.pattern = ipv4);
	$ZodStringFormat.init(inst, def);
	inst._zod.bag.format = `ipv4`;
});
const $ZodIPv6 = /*@__PURE__*/ $constructor("$ZodIPv6", (inst, def) => {
	def.pattern ?? (def.pattern = ipv6);
	$ZodStringFormat.init(inst, def);
	inst._zod.bag.format = `ipv6`;
	inst._zod.check = (payload) => {
		try {
			new URL(`http://[${payload.value}]`);
		} catch {
			payload.issues.push({
				code: "invalid_format",
				format: "ipv6",
				input: payload.value,
				inst,
				continue: !def.abort
			});
		}
	};
});
const $ZodCIDRv4 = /*@__PURE__*/ $constructor("$ZodCIDRv4", (inst, def) => {
	def.pattern ?? (def.pattern = cidrv4);
	$ZodStringFormat.init(inst, def);
});
const $ZodCIDRv6 = /*@__PURE__*/ $constructor("$ZodCIDRv6", (inst, def) => {
	def.pattern ?? (def.pattern = cidrv6);
	$ZodStringFormat.init(inst, def);
	inst._zod.check = (payload) => {
		const parts = payload.value.split("/");
		try {
			if (parts.length !== 2) throw new Error();
			const [address, prefix] = parts;
			if (!prefix) throw new Error();
			const prefixNum = Number(prefix);
			if (`${prefixNum}` !== prefix) throw new Error();
			if (prefixNum < 0 || prefixNum > 128) throw new Error();
			new URL(`http://[${address}]`);
		} catch {
			payload.issues.push({
				code: "invalid_format",
				format: "cidrv6",
				input: payload.value,
				inst,
				continue: !def.abort
			});
		}
	};
});
function isValidBase64(data) {
	if (data === "") return true;
	if (/\s/.test(data)) return false;
	if (data.length % 4 !== 0) return false;
	try {
		atob(data);
		return true;
	} catch {
		return false;
	}
}
const $ZodBase64 = /*@__PURE__*/ $constructor("$ZodBase64", (inst, def) => {
	def.pattern ?? (def.pattern = base64);
	$ZodStringFormat.init(inst, def);
	inst._zod.bag.contentEncoding = "base64";
	inst._zod.check = (payload) => {
		if (isValidBase64(payload.value)) return;
		payload.issues.push({
			code: "invalid_format",
			format: "base64",
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
function isValidBase64URL(data) {
	if (!base64url.test(data)) return false;
	const base64 = data.replace(/[-_]/g, (c) => c === "-" ? "+" : "/");
	return isValidBase64(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
}
const $ZodBase64URL = /*@__PURE__*/ $constructor("$ZodBase64URL", (inst, def) => {
	def.pattern ?? (def.pattern = base64url);
	$ZodStringFormat.init(inst, def);
	inst._zod.bag.contentEncoding = "base64url";
	inst._zod.check = (payload) => {
		if (isValidBase64URL(payload.value)) return;
		payload.issues.push({
			code: "invalid_format",
			format: "base64url",
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodE164 = /*@__PURE__*/ $constructor("$ZodE164", (inst, def) => {
	def.pattern ?? (def.pattern = e164);
	$ZodStringFormat.init(inst, def);
});
function isValidJWT(token, algorithm = null) {
	try {
		const tokensParts = token.split(".");
		if (tokensParts.length !== 3) return false;
		const [header] = tokensParts;
		if (!header) return false;
		const parsedHeader = JSON.parse(atob(header));
		if ("typ" in parsedHeader && parsedHeader?.typ !== "JWT") return false;
		if (!parsedHeader.alg) return false;
		if (algorithm && (!("alg" in parsedHeader) || parsedHeader.alg !== algorithm)) return false;
		return true;
	} catch {
		return false;
	}
}
const $ZodJWT = /*@__PURE__*/ $constructor("$ZodJWT", (inst, def) => {
	$ZodStringFormat.init(inst, def);
	inst._zod.check = (payload) => {
		if (isValidJWT(payload.value, def.alg)) return;
		payload.issues.push({
			code: "invalid_format",
			format: "jwt",
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodNumber = /*@__PURE__*/ $constructor("$ZodNumber", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.pattern = inst._zod.bag.pattern ?? number$1;
	inst._zod.parse = (payload, _ctx) => {
		if (def.coerce) try {
			payload.value = Number(payload.value);
		} catch (_) {}
		const input = payload.value;
		if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) return payload;
		const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? "Infinity" : void 0 : void 0;
		payload.issues.push({
			expected: "number",
			code: "invalid_type",
			input,
			inst,
			...received ? { received } : {}
		});
		return payload;
	};
});
const $ZodNumberFormat = /*@__PURE__*/ $constructor("$ZodNumberFormat", (inst, def) => {
	$ZodCheckNumberFormat.init(inst, def);
	$ZodNumber.init(inst, def);
});
const $ZodUnknown = /*@__PURE__*/ $constructor("$ZodUnknown", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload) => payload;
});
const $ZodNever = /*@__PURE__*/ $constructor("$ZodNever", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload, _ctx) => {
		payload.issues.push({
			expected: "never",
			code: "invalid_type",
			input: payload.value,
			inst
		});
		return payload;
	};
});
function handleArrayResult(result, final, index) {
	if (result.issues.length) final.issues.push(...prefixIssues(index, result.issues));
	final.value[index] = result.value;
}
const $ZodArray = /*@__PURE__*/ $constructor("$ZodArray", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload, ctx) => {
		const input = payload.value;
		if (!Array.isArray(input)) {
			payload.issues.push({
				expected: "array",
				code: "invalid_type",
				input,
				inst
			});
			return payload;
		}
		payload.value = Array(input.length);
		const proms = [];
		for (let i = 0; i < input.length; i++) {
			const item = input[i];
			const result = def.element._zod.run({
				value: item,
				issues: []
			}, ctx);
			if (result instanceof Promise) proms.push(result.then((result) => handleArrayResult(result, payload, i)));
			else handleArrayResult(result, payload, i);
		}
		if (proms.length) return Promise.all(proms).then(() => payload);
		return payload;
	};
});
function handlePropertyResult(result, final, key, input, isOptionalIn, isOptionalOut) {
	const isPresent = key in input;
	if (result.issues.length) {
		if (isOptionalIn && isOptionalOut && !isPresent) return;
		final.issues.push(...prefixIssues(key, result.issues));
	}
	if (!isPresent && !isOptionalIn) {
		if (!result.issues.length) final.issues.push({
			code: "invalid_type",
			expected: "nonoptional",
			input: void 0,
			path: [key]
		});
		return;
	}
	if (result.value === void 0) {
		if (isPresent) final.value[key] = void 0;
	} else final.value[key] = result.value;
}
function normalizeDef(def) {
	const keys = Object.keys(def.shape);
	for (const k of keys) if (!def.shape?.[k]?._zod?.traits?.has("$ZodType")) throw new Error(`Invalid element at key "${k}": expected a Zod schema`);
	const okeys = optionalKeys(def.shape);
	return {
		...def,
		keys,
		keySet: new Set(keys),
		numKeys: keys.length,
		optionalKeys: new Set(okeys)
	};
}
function handleCatchall(proms, input, payload, ctx, def, inst) {
	const unrecognized = [];
	const keySet = def.keySet;
	const _catchall = def.catchall._zod;
	const t = _catchall.def.type;
	const isOptionalIn = _catchall.optin === "optional";
	const isOptionalOut = _catchall.optout === "optional";
	for (const key in input) {
		if (key === "__proto__") continue;
		if (keySet.has(key)) continue;
		if (t === "never") {
			unrecognized.push(key);
			continue;
		}
		const r = _catchall.run({
			value: input[key],
			issues: []
		}, ctx);
		if (r instanceof Promise) proms.push(r.then((r) => handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut)));
		else handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut);
	}
	if (unrecognized.length) payload.issues.push({
		code: "unrecognized_keys",
		keys: unrecognized,
		input,
		inst
	});
	if (!proms.length) return payload;
	return Promise.all(proms).then(() => {
		return payload;
	});
}
const $ZodObject = /*@__PURE__*/ $constructor("$ZodObject", (inst, def) => {
	$ZodType.init(inst, def);
	if (!Object.getOwnPropertyDescriptor(def, "shape")?.get) {
		const sh = def.shape;
		Object.defineProperty(def, "shape", { get: () => {
			const newSh = { ...sh };
			Object.defineProperty(def, "shape", { value: newSh });
			return newSh;
		} });
	}
	const _normalized = cached(() => normalizeDef(def));
	defineLazy(inst._zod, "propValues", () => {
		const shape = def.shape;
		const propValues = {};
		for (const key in shape) {
			const field = shape[key]._zod;
			if (field.values) {
				propValues[key] ?? (propValues[key] = /* @__PURE__ */ new Set());
				for (const v of field.values) propValues[key].add(v);
			}
		}
		return propValues;
	});
	const isObject$1 = isObject;
	const catchall = def.catchall;
	let value;
	inst._zod.parse = (payload, ctx) => {
		value ?? (value = _normalized.value);
		const input = payload.value;
		if (!isObject$1(input)) {
			payload.issues.push({
				expected: "object",
				code: "invalid_type",
				input,
				inst
			});
			return payload;
		}
		payload.value = {};
		const proms = [];
		const shape = value.shape;
		for (const key of value.keys) {
			const el = shape[key];
			const isOptionalIn = el._zod.optin === "optional";
			const isOptionalOut = el._zod.optout === "optional";
			const r = el._zod.run({
				value: input[key],
				issues: []
			}, ctx);
			if (r instanceof Promise) proms.push(r.then((r) => handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut)));
			else handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut);
		}
		if (!catchall) return proms.length ? Promise.all(proms).then(() => payload) : payload;
		return handleCatchall(proms, input, payload, ctx, _normalized.value, inst);
	};
});
const $ZodObjectJIT = /*@__PURE__*/ $constructor("$ZodObjectJIT", (inst, def) => {
	$ZodObject.init(inst, def);
	const superParse = inst._zod.parse;
	const _normalized = cached(() => normalizeDef(def));
	const generateFastpass = (shape) => {
		const doc = new Doc([
			"shape",
			"payload",
			"ctx"
		]);
		const normalized = _normalized.value;
		const parseStr = (key) => {
			const k = esc(key);
			return `shape[${k}]._zod.run({ value: input[${k}], issues: [] }, ctx)`;
		};
		doc.write(`const input = payload.value;`);
		const ids = Object.create(null);
		let counter = 0;
		for (const key of normalized.keys) ids[key] = `key_${counter++}`;
		doc.write(`const newResult = {};`);
		for (const key of normalized.keys) {
			const id = ids[key];
			const k = esc(key);
			const schema = shape[key];
			const isOptionalIn = schema?._zod?.optin === "optional";
			const isOptionalOut = schema?._zod?.optout === "optional";
			doc.write(`const ${id} = ${parseStr(key)};`);
			if (isOptionalIn && isOptionalOut) doc.write(`
        if (${id}.issues.length) {
          if (${k} in input) {
            payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
              ...iss,
              path: iss.path ? [${k}, ...iss.path] : [${k}]
            })));
          }
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
			else if (!isOptionalIn) doc.write(`
        const ${id}_present = ${k} in input;
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        if (!${id}_present && !${id}.issues.length) {
          payload.issues.push({
            code: "invalid_type",
            expected: "nonoptional",
            input: undefined,
            path: [${k}]
          });
        }

        if (${id}_present) {
          if (${id}.value === undefined) {
            newResult[${k}] = undefined;
          } else {
            newResult[${k}] = ${id}.value;
          }
        }

      `);
			else doc.write(`
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
		}
		doc.write(`payload.value = newResult;`);
		doc.write(`return payload;`);
		const fn = doc.compile();
		return (payload, ctx) => fn(shape, payload, ctx);
	};
	let fastpass;
	const isObject$2 = isObject;
	const jit = !globalConfig.jitless;
	const fastEnabled = jit && allowsEval.value;
	const catchall = def.catchall;
	let value;
	inst._zod.parse = (payload, ctx) => {
		value ?? (value = _normalized.value);
		const input = payload.value;
		if (!isObject$2(input)) {
			payload.issues.push({
				expected: "object",
				code: "invalid_type",
				input,
				inst
			});
			return payload;
		}
		if (jit && fastEnabled && ctx?.async === false && ctx.jitless !== true) {
			if (!fastpass) fastpass = generateFastpass(def.shape);
			payload = fastpass(payload, ctx);
			if (!catchall) return payload;
			return handleCatchall([], input, payload, ctx, value, inst);
		}
		return superParse(payload, ctx);
	};
});
function handleUnionResults(results, final, inst, ctx) {
	for (const result of results) if (result.issues.length === 0) {
		final.value = result.value;
		return final;
	}
	const nonaborted = results.filter((r) => !aborted(r));
	if (nonaborted.length === 1) {
		final.value = nonaborted[0].value;
		return nonaborted[0];
	}
	final.issues.push({
		code: "invalid_union",
		input: final.value,
		inst,
		errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
	});
	return final;
}
const $ZodUnion = /*@__PURE__*/ $constructor("$ZodUnion", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazy(inst._zod, "optin", () => def.options.some((o) => o._zod.optin === "optional") ? "optional" : void 0);
	defineLazy(inst._zod, "optout", () => def.options.some((o) => o._zod.optout === "optional") ? "optional" : void 0);
	defineLazy(inst._zod, "values", () => {
		if (def.options.every((o) => o._zod.values)) return new Set(def.options.flatMap((option) => Array.from(option._zod.values)));
	});
	defineLazy(inst._zod, "pattern", () => {
		if (def.options.every((o) => o._zod.pattern)) {
			const patterns = def.options.map((o) => o._zod.pattern);
			return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
		}
	});
	const first = def.options.length === 1 ? def.options[0]._zod.run : null;
	inst._zod.parse = (payload, ctx) => {
		if (first) return first(payload, ctx);
		let async = false;
		const results = [];
		for (const option of def.options) {
			const result = option._zod.run({
				value: payload.value,
				issues: []
			}, ctx);
			if (result instanceof Promise) {
				results.push(result);
				async = true;
			} else {
				if (result.issues.length === 0) return result;
				results.push(result);
			}
		}
		if (!async) return handleUnionResults(results, payload, inst, ctx);
		return Promise.all(results).then((results) => {
			return handleUnionResults(results, payload, inst, ctx);
		});
	};
});
const $ZodIntersection = /*@__PURE__*/ $constructor("$ZodIntersection", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload, ctx) => {
		const input = payload.value;
		const left = def.left._zod.run({
			value: input,
			issues: []
		}, ctx);
		const right = def.right._zod.run({
			value: input,
			issues: []
		}, ctx);
		if (left instanceof Promise || right instanceof Promise) return Promise.all([left, right]).then(([left, right]) => {
			return handleIntersectionResults(payload, left, right);
		});
		return handleIntersectionResults(payload, left, right);
	};
});
function mergeValues(a, b) {
	if (a === b) return {
		valid: true,
		data: a
	};
	if (a instanceof Date && b instanceof Date && +a === +b) return {
		valid: true,
		data: a
	};
	if (isPlainObject(a) && isPlainObject(b)) {
		const bKeys = Object.keys(b);
		const sharedKeys = Object.keys(a).filter((key) => bKeys.indexOf(key) !== -1);
		const newObj = {
			...a,
			...b
		};
		for (const key of sharedKeys) {
			const sharedValue = mergeValues(a[key], b[key]);
			if (!sharedValue.valid) return {
				valid: false,
				mergeErrorPath: [key, ...sharedValue.mergeErrorPath]
			};
			newObj[key] = sharedValue.data;
		}
		return {
			valid: true,
			data: newObj
		};
	}
	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) return {
			valid: false,
			mergeErrorPath: []
		};
		const newArray = [];
		for (let index = 0; index < a.length; index++) {
			const itemA = a[index];
			const itemB = b[index];
			const sharedValue = mergeValues(itemA, itemB);
			if (!sharedValue.valid) return {
				valid: false,
				mergeErrorPath: [index, ...sharedValue.mergeErrorPath]
			};
			newArray.push(sharedValue.data);
		}
		return {
			valid: true,
			data: newArray
		};
	}
	return {
		valid: false,
		mergeErrorPath: []
	};
}
function handleIntersectionResults(result, left, right) {
	const unrecKeys = /* @__PURE__ */ new Map();
	let unrecIssue;
	for (const iss of left.issues) if (iss.code === "unrecognized_keys") {
		unrecIssue ?? (unrecIssue = iss);
		for (const k of iss.keys) {
			if (!unrecKeys.has(k)) unrecKeys.set(k, {});
			unrecKeys.get(k).l = true;
		}
	} else result.issues.push(iss);
	for (const iss of right.issues) if (iss.code === "unrecognized_keys") for (const k of iss.keys) {
		if (!unrecKeys.has(k)) unrecKeys.set(k, {});
		unrecKeys.get(k).r = true;
	}
	else result.issues.push(iss);
	const bothKeys = [...unrecKeys].filter(([, f]) => f.l && f.r).map(([k]) => k);
	if (bothKeys.length && unrecIssue) result.issues.push({
		...unrecIssue,
		keys: bothKeys
	});
	if (aborted(result)) return result;
	const merged = mergeValues(left.value, right.value);
	if (!merged.valid) throw new Error(`Unmergable intersection. Error path: ${JSON.stringify(merged.mergeErrorPath)}`);
	result.value = merged.data;
	return result;
}
const $ZodEnum = /*@__PURE__*/ $constructor("$ZodEnum", (inst, def) => {
	$ZodType.init(inst, def);
	const values = getEnumValues(def.entries);
	const valuesSet = new Set(values);
	inst._zod.values = valuesSet;
	inst._zod.pattern = new RegExp(`^(${values.filter((k) => propertyKeyTypes.has(typeof k)).map((o) => typeof o === "string" ? escapeRegex(o) : o.toString()).join("|")})$`);
	inst._zod.parse = (payload, _ctx) => {
		const input = payload.value;
		if (valuesSet.has(input)) return payload;
		payload.issues.push({
			code: "invalid_value",
			values,
			input,
			inst
		});
		return payload;
	};
});
const $ZodLiteral = /*@__PURE__*/ $constructor("$ZodLiteral", (inst, def) => {
	$ZodType.init(inst, def);
	if (def.values.length === 0) throw new Error("Cannot create literal schema with no valid values");
	const values = new Set(def.values);
	inst._zod.values = values;
	inst._zod.pattern = new RegExp(`^(${def.values.map((o) => typeof o === "string" ? escapeRegex(o) : o ? escapeRegex(o.toString()) : String(o)).join("|")})$`);
	inst._zod.parse = (payload, _ctx) => {
		const input = payload.value;
		if (values.has(input)) return payload;
		payload.issues.push({
			code: "invalid_value",
			values: def.values,
			input,
			inst
		});
		return payload;
	};
});
const $ZodTransform = /*@__PURE__*/ $constructor("$ZodTransform", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.optin = "optional";
	inst._zod.parse = (payload, ctx) => {
		if (ctx.direction === "backward") throw new $ZodEncodeError(inst.constructor.name);
		const _out = def.transform(payload.value, payload);
		if (ctx.async) return (_out instanceof Promise ? _out : Promise.resolve(_out)).then((output) => {
			payload.value = output;
			payload.fallback = true;
			return payload;
		});
		if (_out instanceof Promise) throw new $ZodAsyncError();
		payload.value = _out;
		payload.fallback = true;
		return payload;
	};
});
function handleOptionalResult(result, input) {
	if (input === void 0 && (result.issues.length || result.fallback)) return {
		issues: [],
		value: void 0
	};
	return result;
}
const $ZodOptional = /*@__PURE__*/ $constructor("$ZodOptional", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.optin = "optional";
	inst._zod.optout = "optional";
	defineLazy(inst._zod, "values", () => {
		return def.innerType._zod.values ? new Set([...def.innerType._zod.values, void 0]) : void 0;
	});
	defineLazy(inst._zod, "pattern", () => {
		const pattern = def.innerType._zod.pattern;
		return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : void 0;
	});
	inst._zod.parse = (payload, ctx) => {
		if (def.innerType._zod.optin === "optional") {
			const input = payload.value;
			const result = def.innerType._zod.run(payload, ctx);
			if (result instanceof Promise) return result.then((r) => handleOptionalResult(r, input));
			return handleOptionalResult(result, input);
		}
		if (payload.value === void 0) return payload;
		return def.innerType._zod.run(payload, ctx);
	};
});
const $ZodExactOptional = /*@__PURE__*/ $constructor("$ZodExactOptional", (inst, def) => {
	$ZodOptional.init(inst, def);
	defineLazy(inst._zod, "values", () => def.innerType._zod.values);
	defineLazy(inst._zod, "pattern", () => def.innerType._zod.pattern);
	inst._zod.parse = (payload, ctx) => {
		return def.innerType._zod.run(payload, ctx);
	};
});
const $ZodNullable = /*@__PURE__*/ $constructor("$ZodNullable", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
	defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
	defineLazy(inst._zod, "pattern", () => {
		const pattern = def.innerType._zod.pattern;
		return pattern ? new RegExp(`^(${cleanRegex(pattern.source)}|null)$`) : void 0;
	});
	defineLazy(inst._zod, "values", () => {
		return def.innerType._zod.values ? new Set([...def.innerType._zod.values, null]) : void 0;
	});
	inst._zod.parse = (payload, ctx) => {
		if (payload.value === null) return payload;
		return def.innerType._zod.run(payload, ctx);
	};
});
const $ZodDefault = /*@__PURE__*/ $constructor("$ZodDefault", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.optin = "optional";
	defineLazy(inst._zod, "values", () => def.innerType._zod.values);
	inst._zod.parse = (payload, ctx) => {
		if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
		if (payload.value === void 0) {
			payload.value = def.defaultValue;
			/**
			* $ZodDefault returns the default value immediately in forward direction.
			* It doesn't pass the default value into the validator ("prefault"). There's no reason to pass the default value through validation. The validity of the default is enforced by TypeScript statically. Otherwise, it's the responsibility of the user to ensure the default is valid. In the case of pipes with divergent in/out types, you can specify the default on the `in` schema of your ZodPipe to set a "prefault" for the pipe.   */
			return payload;
		}
		const result = def.innerType._zod.run(payload, ctx);
		if (result instanceof Promise) return result.then((result) => handleDefaultResult(result, def));
		return handleDefaultResult(result, def);
	};
});
function handleDefaultResult(payload, def) {
	if (payload.value === void 0) payload.value = def.defaultValue;
	return payload;
}
const $ZodPrefault = /*@__PURE__*/ $constructor("$ZodPrefault", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.optin = "optional";
	defineLazy(inst._zod, "values", () => def.innerType._zod.values);
	inst._zod.parse = (payload, ctx) => {
		if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
		if (payload.value === void 0) payload.value = def.defaultValue;
		return def.innerType._zod.run(payload, ctx);
	};
});
const $ZodNonOptional = /*@__PURE__*/ $constructor("$ZodNonOptional", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazy(inst._zod, "values", () => {
		const v = def.innerType._zod.values;
		return v ? new Set([...v].filter((x) => x !== void 0)) : void 0;
	});
	inst._zod.parse = (payload, ctx) => {
		const result = def.innerType._zod.run(payload, ctx);
		if (result instanceof Promise) return result.then((result) => handleNonOptionalResult(result, inst));
		return handleNonOptionalResult(result, inst);
	};
});
function handleNonOptionalResult(payload, inst) {
	if (!payload.issues.length && payload.value === void 0) payload.issues.push({
		code: "invalid_type",
		expected: "nonoptional",
		input: payload.value,
		inst
	});
	return payload;
}
const $ZodCatch = /*@__PURE__*/ $constructor("$ZodCatch", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.optin = "optional";
	defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
	defineLazy(inst._zod, "values", () => def.innerType._zod.values);
	inst._zod.parse = (payload, ctx) => {
		if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
		const result = def.innerType._zod.run(payload, ctx);
		if (result instanceof Promise) return result.then((result) => {
			payload.value = result.value;
			if (result.issues.length) {
				payload.value = def.catchValue({
					...payload,
					error: { issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config())) },
					input: payload.value
				});
				payload.issues = [];
				payload.fallback = true;
			}
			return payload;
		});
		payload.value = result.value;
		if (result.issues.length) {
			payload.value = def.catchValue({
				...payload,
				error: { issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config())) },
				input: payload.value
			});
			payload.issues = [];
			payload.fallback = true;
		}
		return payload;
	};
});
const $ZodPipe = /*@__PURE__*/ $constructor("$ZodPipe", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazy(inst._zod, "values", () => def.in._zod.values);
	defineLazy(inst._zod, "optin", () => def.in._zod.optin);
	defineLazy(inst._zod, "optout", () => def.out._zod.optout);
	defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
	inst._zod.parse = (payload, ctx) => {
		if (ctx.direction === "backward") {
			const right = def.out._zod.run(payload, ctx);
			if (right instanceof Promise) return right.then((right) => handlePipeResult(right, def.in, ctx));
			return handlePipeResult(right, def.in, ctx);
		}
		const left = def.in._zod.run(payload, ctx);
		if (left instanceof Promise) return left.then((left) => handlePipeResult(left, def.out, ctx));
		return handlePipeResult(left, def.out, ctx);
	};
});
function handlePipeResult(left, next, ctx) {
	if (left.issues.length) {
		left.aborted = true;
		return left;
	}
	return next._zod.run({
		value: left.value,
		issues: left.issues,
		fallback: left.fallback
	}, ctx);
}
const $ZodReadonly = /*@__PURE__*/ $constructor("$ZodReadonly", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazy(inst._zod, "propValues", () => def.innerType._zod.propValues);
	defineLazy(inst._zod, "values", () => def.innerType._zod.values);
	defineLazy(inst._zod, "optin", () => def.innerType?._zod?.optin);
	defineLazy(inst._zod, "optout", () => def.innerType?._zod?.optout);
	inst._zod.parse = (payload, ctx) => {
		if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
		const result = def.innerType._zod.run(payload, ctx);
		if (result instanceof Promise) return result.then(handleReadonlyResult);
		return handleReadonlyResult(result);
	};
});
function handleReadonlyResult(payload) {
	payload.value = Object.freeze(payload.value);
	return payload;
}
const $ZodCustom = /*@__PURE__*/ $constructor("$ZodCustom", (inst, def) => {
	$ZodCheck.init(inst, def);
	$ZodType.init(inst, def);
	inst._zod.parse = (payload, _) => {
		return payload;
	};
	inst._zod.check = (payload) => {
		const input = payload.value;
		const r = def.fn(input);
		if (r instanceof Promise) return r.then((r) => handleRefineResult(r, payload, input, inst));
		handleRefineResult(r, payload, input, inst);
	};
});
function handleRefineResult(result, payload, input, inst) {
	if (!result) {
		const _iss = {
			code: "custom",
			input,
			inst,
			path: [...inst._zod.def.path ?? []],
			continue: !inst._zod.def.abort
		};
		if (inst._zod.def.params) _iss.params = inst._zod.def.params;
		payload.issues.push(issue(_iss));
	}
}


var _a;
var $ZodRegistry = class {
	constructor() {
		this._map = /* @__PURE__ */ new WeakMap();
		this._idmap = /* @__PURE__ */ new Map();
	}
	add(schema, ..._meta) {
		const meta = _meta[0];
		this._map.set(schema, meta);
		if (meta && typeof meta === "object" && "id" in meta) this._idmap.set(meta.id, schema);
		return this;
	}
	clear() {
		this._map = /* @__PURE__ */ new WeakMap();
		this._idmap = /* @__PURE__ */ new Map();
		return this;
	}
	remove(schema) {
		const meta = this._map.get(schema);
		if (meta && typeof meta === "object" && "id" in meta) this._idmap.delete(meta.id);
		this._map.delete(schema);
		return this;
	}
	get(schema) {
		const p = schema._zod.parent;
		if (p) {
			const pm = { ...this.get(p) ?? {} };
			delete pm.id;
			const f = {
				...pm,
				...this._map.get(schema)
			};
			return Object.keys(f).length ? f : void 0;
		}
		return this._map.get(schema);
	}
	has(schema) {
		return this._map.has(schema);
	}
};
function registry() {
	return new $ZodRegistry();
}
(_a = globalThis).__zod_globalRegistry ?? (_a.__zod_globalRegistry = registry());
const globalRegistry = globalThis.__zod_globalRegistry;


// @__NO_SIDE_EFFECTS__
function _string(Class, params) {
	return new Class({
		type: "string",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _email(Class, params) {
	return new Class({
		type: "string",
		format: "email",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _guid(Class, params) {
	return new Class({
		type: "string",
		format: "guid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _uuid(Class, params) {
	return new Class({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _uuidv4(Class, params) {
	return new Class({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: false,
		version: "v4",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _uuidv6(Class, params) {
	return new Class({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: false,
		version: "v6",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _uuidv7(Class, params) {
	return new Class({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: false,
		version: "v7",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _url(Class, params) {
	return new Class({
		type: "string",
		format: "url",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _emoji(Class, params) {
	return new Class({
		type: "string",
		format: "emoji",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _nanoid(Class, params) {
	return new Class({
		type: "string",
		format: "nanoid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
/**
* @deprecated CUID v1 is deprecated by its authors due to information leakage
* (timestamps embedded in the id). Use {@link _cuid2} instead.
* See https://github.com/paralleldrive/cuid.
*/
// @__NO_SIDE_EFFECTS__
function _cuid(Class, params) {
	return new Class({
		type: "string",
		format: "cuid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _cuid2(Class, params) {
	return new Class({
		type: "string",
		format: "cuid2",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _ulid(Class, params) {
	return new Class({
		type: "string",
		format: "ulid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _xid(Class, params) {
	return new Class({
		type: "string",
		format: "xid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _ksuid(Class, params) {
	return new Class({
		type: "string",
		format: "ksuid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _ipv4(Class, params) {
	return new Class({
		type: "string",
		format: "ipv4",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _ipv6(Class, params) {
	return new Class({
		type: "string",
		format: "ipv6",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _cidrv4(Class, params) {
	return new Class({
		type: "string",
		format: "cidrv4",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _cidrv6(Class, params) {
	return new Class({
		type: "string",
		format: "cidrv6",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _base64(Class, params) {
	return new Class({
		type: "string",
		format: "base64",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _base64url(Class, params) {
	return new Class({
		type: "string",
		format: "base64url",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _e164(Class, params) {
	return new Class({
		type: "string",
		format: "e164",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _jwt(Class, params) {
	return new Class({
		type: "string",
		format: "jwt",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _isoDateTime(Class, params) {
	return new Class({
		type: "string",
		format: "datetime",
		check: "string_format",
		offset: false,
		local: false,
		precision: null,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _isoDate(Class, params) {
	return new Class({
		type: "string",
		format: "date",
		check: "string_format",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _isoTime(Class, params) {
	return new Class({
		type: "string",
		format: "time",
		check: "string_format",
		precision: null,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _isoDuration(Class, params) {
	return new Class({
		type: "string",
		format: "duration",
		check: "string_format",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _number(Class, params) {
	return new Class({
		type: "number",
		checks: [],
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _int(Class, params) {
	return new Class({
		type: "number",
		check: "number_format",
		abort: false,
		format: "safeint",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _unknown(Class) {
	return new Class({ type: "unknown" });
}
// @__NO_SIDE_EFFECTS__
function _never(Class, params) {
	return new Class({
		type: "never",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _lt(value, params) {
	return new $ZodCheckLessThan({
		check: "less_than",
		...normalizeParams(params),
		value,
		inclusive: false
	});
}
// @__NO_SIDE_EFFECTS__
function _lte(value, params) {
	return new $ZodCheckLessThan({
		check: "less_than",
		...normalizeParams(params),
		value,
		inclusive: true
	});
}
// @__NO_SIDE_EFFECTS__
function _gt(value, params) {
	return new $ZodCheckGreaterThan({
		check: "greater_than",
		...normalizeParams(params),
		value,
		inclusive: false
	});
}
// @__NO_SIDE_EFFECTS__
function _gte(value, params) {
	return new $ZodCheckGreaterThan({
		check: "greater_than",
		...normalizeParams(params),
		value,
		inclusive: true
	});
}
// @__NO_SIDE_EFFECTS__
function _multipleOf(value, params) {
	return new $ZodCheckMultipleOf({
		check: "multiple_of",
		...normalizeParams(params),
		value
	});
}
// @__NO_SIDE_EFFECTS__
function _maxLength(maximum, params) {
	return new $ZodCheckMaxLength({
		check: "max_length",
		...normalizeParams(params),
		maximum
	});
}
// @__NO_SIDE_EFFECTS__
function _minLength(minimum, params) {
	return new $ZodCheckMinLength({
		check: "min_length",
		...normalizeParams(params),
		minimum
	});
}
// @__NO_SIDE_EFFECTS__
function _length(length, params) {
	return new $ZodCheckLengthEquals({
		check: "length_equals",
		...normalizeParams(params),
		length
	});
}
// @__NO_SIDE_EFFECTS__
function _regex(pattern, params) {
	return new $ZodCheckRegex({
		check: "string_format",
		format: "regex",
		...normalizeParams(params),
		pattern
	});
}
// @__NO_SIDE_EFFECTS__
function _lowercase(params) {
	return new $ZodCheckLowerCase({
		check: "string_format",
		format: "lowercase",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _uppercase(params) {
	return new $ZodCheckUpperCase({
		check: "string_format",
		format: "uppercase",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _includes(includes, params) {
	return new $ZodCheckIncludes({
		check: "string_format",
		format: "includes",
		...normalizeParams(params),
		includes
	});
}
// @__NO_SIDE_EFFECTS__
function _startsWith(prefix, params) {
	return new $ZodCheckStartsWith({
		check: "string_format",
		format: "starts_with",
		...normalizeParams(params),
		prefix
	});
}
// @__NO_SIDE_EFFECTS__
function _endsWith(suffix, params) {
	return new $ZodCheckEndsWith({
		check: "string_format",
		format: "ends_with",
		...normalizeParams(params),
		suffix
	});
}
// @__NO_SIDE_EFFECTS__
function _overwrite(tx) {
	return new $ZodCheckOverwrite({
		check: "overwrite",
		tx
	});
}
// @__NO_SIDE_EFFECTS__
function _normalize(form) {
	return /* @__PURE__ */ _overwrite((input) => input.normalize(form));
}
// @__NO_SIDE_EFFECTS__
function _trim() {
	return /* @__PURE__ */ _overwrite((input) => input.trim());
}
// @__NO_SIDE_EFFECTS__
function _toLowerCase() {
	return /* @__PURE__ */ _overwrite((input) => input.toLowerCase());
}
// @__NO_SIDE_EFFECTS__
function _toUpperCase() {
	return /* @__PURE__ */ _overwrite((input) => input.toUpperCase());
}
// @__NO_SIDE_EFFECTS__
function _slugify() {
	return /* @__PURE__ */ _overwrite((input) => slugify(input));
}
// @__NO_SIDE_EFFECTS__
function _array(Class, element, params) {
	return new Class({
		type: "array",
		element,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _refine(Class, fn, _params) {
	return new Class({
		type: "custom",
		check: "custom",
		fn,
		...normalizeParams(_params)
	});
}
// @__NO_SIDE_EFFECTS__
function _superRefine(fn, params) {
	const ch = /* @__PURE__ */ _check((payload) => {
		payload.addIssue = (issue$2) => {
			if (typeof issue$2 === "string") payload.issues.push(issue(issue$2, payload.value, ch._zod.def));
			else {
				const _issue = issue$2;
				if (_issue.fatal) _issue.continue = false;
				_issue.code ?? (_issue.code = "custom");
				_issue.input ?? (_issue.input = payload.value);
				_issue.inst ?? (_issue.inst = ch);
				_issue.continue ?? (_issue.continue = !ch._zod.def.abort);
				payload.issues.push(issue(_issue));
			}
		};
		return fn(payload.value, payload);
	}, params);
	return ch;
}
// @__NO_SIDE_EFFECTS__
function _check(fn, params) {
	const ch = new $ZodCheck({
		check: "custom",
		...normalizeParams(params)
	});
	ch._zod.check = fn;
	return ch;
}


function initializeContext(params) {
	let target = params?.target ?? "draft-2020-12";
	if (target === "draft-4") target = "draft-04";
	if (target === "draft-7") target = "draft-07";
	return {
		processors: params.processors ?? {},
		metadataRegistry: params?.metadata ?? globalRegistry,
		target,
		unrepresentable: params?.unrepresentable ?? "throw",
		override: params?.override ?? (() => {}),
		io: params?.io ?? "output",
		counter: 0,
		seen: /* @__PURE__ */ new Map(),
		cycles: params?.cycles ?? "ref",
		reused: params?.reused ?? "inline",
		external: params?.external ?? void 0
	};
}
function process(schema, ctx, _params = {
	path: [],
	schemaPath: []
}) {
	var _a;
	const def = schema._zod.def;
	const seen = ctx.seen.get(schema);
	if (seen) {
		seen.count++;
		if (_params.schemaPath.includes(schema)) seen.cycle = _params.path;
		return seen.schema;
	}
	const result = {
		schema: {},
		count: 1,
		cycle: void 0,
		path: _params.path
	};
	ctx.seen.set(schema, result);
	const overrideSchema = schema._zod.toJSONSchema?.();
	if (overrideSchema) result.schema = overrideSchema;
	else {
		const params = {
			..._params,
			schemaPath: [..._params.schemaPath, schema],
			path: _params.path
		};
		if (schema._zod.processJSONSchema) schema._zod.processJSONSchema(ctx, result.schema, params);
		else {
			const _json = result.schema;
			const processor = ctx.processors[def.type];
			if (!processor) throw new Error(`[toJSONSchema]: Non-representable type encountered: ${def.type}`);
			processor(schema, ctx, _json, params);
		}
		const parent = schema._zod.parent;
		if (parent) {
			if (!result.ref) result.ref = parent;
			process(parent, ctx, params);
			ctx.seen.get(parent).isParent = true;
		}
	}
	const meta = ctx.metadataRegistry.get(schema);
	if (meta) Object.assign(result.schema, meta);
	if (ctx.io === "input" && isTransforming(schema)) {
		delete result.schema.examples;
		delete result.schema.default;
	}
	if (ctx.io === "input" && "_prefault" in result.schema) (_a = result.schema).default ?? (_a.default = result.schema._prefault);
	delete result.schema._prefault;
	return ctx.seen.get(schema).schema;
}
function extractDefs(ctx, schema) {
	const root = ctx.seen.get(schema);
	if (!root) throw new Error("Unprocessed schema. This is a bug in Zod.");
	const idToSchema = /* @__PURE__ */ new Map();
	for (const entry of ctx.seen.entries()) {
		const id = ctx.metadataRegistry.get(entry[0])?.id;
		if (id) {
			const existing = idToSchema.get(id);
			if (existing && existing !== entry[0]) throw new Error(`Duplicate schema id "${id}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);
			idToSchema.set(id, entry[0]);
		}
	}
	const makeURI = (entry) => {
		const defsSegment = ctx.target === "draft-2020-12" ? "$defs" : "definitions";
		if (ctx.external) {
			const externalId = ctx.external.registry.get(entry[0])?.id;
			const uriGenerator = ctx.external.uri ?? ((id) => id);
			if (externalId) return { ref: uriGenerator(externalId) };
			const id = entry[1].defId ?? entry[1].schema.id ?? `schema${ctx.counter++}`;
			entry[1].defId = id;
			return {
				defId: id,
				ref: `${uriGenerator("__shared")}#/${defsSegment}/${id}`
			};
		}
		if (entry[1] === root) return { ref: "#" };
		const defUriPrefix = `#/${defsSegment}/`;
		const defId = entry[1].schema.id ?? `__schema${ctx.counter++}`;
		return {
			defId,
			ref: defUriPrefix + defId
		};
	};
	const extractToDef = (entry) => {
		if (entry[1].schema.$ref) return;
		const seen = entry[1];
		const { ref, defId } = makeURI(entry);
		seen.def = { ...seen.schema };
		if (defId) seen.defId = defId;
		const schema = seen.schema;
		for (const key in schema) delete schema[key];
		schema.$ref = ref;
	};
	if (ctx.cycles === "throw") for (const entry of ctx.seen.entries()) {
		const seen = entry[1];
		if (seen.cycle) throw new Error(`Cycle detected: #/${seen.cycle?.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
	}
	for (const entry of ctx.seen.entries()) {
		const seen = entry[1];
		if (schema === entry[0]) {
			extractToDef(entry);
			continue;
		}
		if (ctx.external) {
			const ext = ctx.external.registry.get(entry[0])?.id;
			if (schema !== entry[0] && ext) {
				extractToDef(entry);
				continue;
			}
		}
		if (ctx.metadataRegistry.get(entry[0])?.id) {
			extractToDef(entry);
			continue;
		}
		if (seen.cycle) {
			extractToDef(entry);
			continue;
		}
		if (seen.count > 1) {
			if (ctx.reused === "ref") {
				extractToDef(entry);
				continue;
			}
		}
	}
}
function finalize(ctx, schema) {
	const root = ctx.seen.get(schema);
	if (!root) throw new Error("Unprocessed schema. This is a bug in Zod.");
	const flattenRef = (zodSchema) => {
		const seen = ctx.seen.get(zodSchema);
		if (seen.ref === null) return;
		const schema = seen.def ?? seen.schema;
		const _cached = { ...schema };
		const ref = seen.ref;
		seen.ref = null;
		if (ref) {
			flattenRef(ref);
			const refSeen = ctx.seen.get(ref);
			const refSchema = refSeen.schema;
			if (refSchema.$ref && (ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0")) {
				schema.allOf = schema.allOf ?? [];
				schema.allOf.push(refSchema);
			} else Object.assign(schema, refSchema);
			Object.assign(schema, _cached);
			if (zodSchema._zod.parent === ref) for (const key in schema) {
				if (key === "$ref" || key === "allOf") continue;
				if (!(key in _cached)) delete schema[key];
			}
			if (refSchema.$ref && refSeen.def) for (const key in schema) {
				if (key === "$ref" || key === "allOf") continue;
				if (key in refSeen.def && JSON.stringify(schema[key]) === JSON.stringify(refSeen.def[key])) delete schema[key];
			}
		}
		const parent = zodSchema._zod.parent;
		if (parent && parent !== ref) {
			flattenRef(parent);
			const parentSeen = ctx.seen.get(parent);
			if (parentSeen?.schema.$ref) {
				schema.$ref = parentSeen.schema.$ref;
				if (parentSeen.def) for (const key in schema) {
					if (key === "$ref" || key === "allOf") continue;
					if (key in parentSeen.def && JSON.stringify(schema[key]) === JSON.stringify(parentSeen.def[key])) delete schema[key];
				}
			}
		}
		ctx.override({
			zodSchema,
			jsonSchema: schema,
			path: seen.path ?? []
		});
	};
	for (const entry of [...ctx.seen.entries()].reverse()) flattenRef(entry[0]);
	const result = {};
	if (ctx.target === "draft-2020-12") result.$schema = "https://json-schema.org/draft/2020-12/schema";
	else if (ctx.target === "draft-07") result.$schema = "http://json-schema.org/draft-07/schema#";
	else if (ctx.target === "draft-04") result.$schema = "http://json-schema.org/draft-04/schema#";
	else if (ctx.target === "openapi-3.0") {}
	if (ctx.external?.uri) {
		const id = ctx.external.registry.get(schema)?.id;
		if (!id) throw new Error("Schema is missing an `id` property");
		result.$id = ctx.external.uri(id);
	}
	Object.assign(result, root.def ?? root.schema);
	const rootMetaId = ctx.metadataRegistry.get(schema)?.id;
	if (rootMetaId !== void 0 && result.id === rootMetaId) delete result.id;
	const defs = ctx.external?.defs ?? {};
	for (const entry of ctx.seen.entries()) {
		const seen = entry[1];
		if (seen.def && seen.defId) {
			if (seen.def.id === seen.defId) delete seen.def.id;
			defs[seen.defId] = seen.def;
		}
	}
	if (ctx.external) {} else if (Object.keys(defs).length > 0) if (ctx.target === "draft-2020-12") result.$defs = defs;
	else result.definitions = defs;
	try {
		const finalized = JSON.parse(JSON.stringify(result));
		Object.defineProperty(finalized, "~standard", {
			value: {
				...schema["~standard"],
				jsonSchema: {
					input: createStandardJSONSchemaMethod(schema, "input", ctx.processors),
					output: createStandardJSONSchemaMethod(schema, "output", ctx.processors)
				}
			},
			enumerable: false,
			writable: false
		});
		return finalized;
	} catch (_err) {
		throw new Error("Error converting schema to JSON.");
	}
}
function isTransforming(_schema, _ctx) {
	const ctx = _ctx ?? { seen: /* @__PURE__ */ new Set() };
	if (ctx.seen.has(_schema)) return false;
	ctx.seen.add(_schema);
	const def = _schema._zod.def;
	if (def.type === "transform") return true;
	if (def.type === "array") return isTransforming(def.element, ctx);
	if (def.type === "set") return isTransforming(def.valueType, ctx);
	if (def.type === "lazy") return isTransforming(def.getter(), ctx);
	if (def.type === "promise" || def.type === "optional" || def.type === "nonoptional" || def.type === "nullable" || def.type === "readonly" || def.type === "default" || def.type === "prefault") return isTransforming(def.innerType, ctx);
	if (def.type === "intersection") return isTransforming(def.left, ctx) || isTransforming(def.right, ctx);
	if (def.type === "record" || def.type === "map") return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
	if (def.type === "pipe") {
		if (_schema._zod.traits.has("$ZodCodec")) return true;
		return isTransforming(def.in, ctx) || isTransforming(def.out, ctx);
	}
	if (def.type === "object") {
		for (const key in def.shape) if (isTransforming(def.shape[key], ctx)) return true;
		return false;
	}
	if (def.type === "union") {
		for (const option of def.options) if (isTransforming(option, ctx)) return true;
		return false;
	}
	if (def.type === "tuple") {
		for (const item of def.items) if (isTransforming(item, ctx)) return true;
		if (def.rest && isTransforming(def.rest, ctx)) return true;
		return false;
	}
	return false;
}
/**
* Creates a toJSONSchema method for a schema instance.
* This encapsulates the logic of initializing context, processing, extracting defs, and finalizing.
*/
const createToJSONSchemaMethod = (schema, processors = {}) => (params) => {
	const ctx = initializeContext({
		...params,
		processors
	});
	process(schema, ctx);
	extractDefs(ctx, schema);
	return finalize(ctx, schema);
};
const createStandardJSONSchemaMethod = (schema, io, processors = {}) => (params) => {
	const { libraryOptions, target } = params ?? {};
	const ctx = initializeContext({
		...libraryOptions ?? {},
		target,
		io,
		processors
	});
	process(schema, ctx);
	extractDefs(ctx, schema);
	return finalize(ctx, schema);
};


const formatMap = {
	guid: "uuid",
	url: "uri",
	datetime: "date-time",
	json_string: "json-string",
	regex: ""
};
const stringProcessor = (schema, ctx, _json, _params) => {
	const json = _json;
	json.type = "string";
	const { minimum, maximum, format, patterns, contentEncoding } = schema._zod.bag;
	if (typeof minimum === "number") json.minLength = minimum;
	if (typeof maximum === "number") json.maxLength = maximum;
	if (format) {
		json.format = formatMap[format] ?? format;
		if (json.format === "") delete json.format;
		if (format === "time") delete json.format;
	}
	if (contentEncoding) json.contentEncoding = contentEncoding;
	if (patterns && patterns.size > 0) {
		const regexes = [...patterns];
		if (regexes.length === 1) json.pattern = regexes[0].source;
		else if (regexes.length > 1) json.allOf = [...regexes.map((regex) => ({
			...ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0" ? { type: "string" } : {},
			pattern: regex.source
		}))];
	}
};
const numberProcessor = (schema, ctx, _json, _params) => {
	const json = _json;
	const { minimum, maximum, format, multipleOf, exclusiveMaximum, exclusiveMinimum } = schema._zod.bag;
	if (typeof format === "string" && format.includes("int")) json.type = "integer";
	else json.type = "number";
	const exMin = typeof exclusiveMinimum === "number" && exclusiveMinimum >= (minimum ?? Number.NEGATIVE_INFINITY);
	const exMax = typeof exclusiveMaximum === "number" && exclusiveMaximum <= (maximum ?? Number.POSITIVE_INFINITY);
	const legacy = ctx.target === "draft-04" || ctx.target === "openapi-3.0";
	if (exMin) if (legacy) {
		json.minimum = exclusiveMinimum;
		json.exclusiveMinimum = true;
	} else json.exclusiveMinimum = exclusiveMinimum;
	else if (typeof minimum === "number") json.minimum = minimum;
	if (exMax) if (legacy) {
		json.maximum = exclusiveMaximum;
		json.exclusiveMaximum = true;
	} else json.exclusiveMaximum = exclusiveMaximum;
	else if (typeof maximum === "number") json.maximum = maximum;
	if (typeof multipleOf === "number") json.multipleOf = multipleOf;
};
const neverProcessor = (_schema, _ctx, json, _params) => {
	json.not = {};
};
const enumProcessor = (schema, _ctx, json, _params) => {
	const def = schema._zod.def;
	const values = getEnumValues(def.entries);
	if (values.every((v) => typeof v === "number")) json.type = "number";
	if (values.every((v) => typeof v === "string")) json.type = "string";
	json.enum = values;
};
const literalProcessor = (schema, ctx, json, _params) => {
	const def = schema._zod.def;
	const vals = [];
	for (const val of def.values) if (val === void 0) {
		if (ctx.unrepresentable === "throw") throw new Error("Literal `undefined` cannot be represented in JSON Schema");
	} else if (typeof val === "bigint") if (ctx.unrepresentable === "throw") throw new Error("BigInt literals cannot be represented in JSON Schema");
	else vals.push(Number(val));
	else vals.push(val);
	if (vals.length === 0) {} else if (vals.length === 1) {
		const val = vals[0];
		json.type = val === null ? "null" : typeof val;
		if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") json.enum = [val];
		else json.const = val;
	} else {
		if (vals.every((v) => typeof v === "number")) json.type = "number";
		if (vals.every((v) => typeof v === "string")) json.type = "string";
		if (vals.every((v) => typeof v === "boolean")) json.type = "boolean";
		if (vals.every((v) => v === null)) json.type = "null";
		json.enum = vals;
	}
};
const customProcessor = (_schema, ctx, _json, _params) => {
	if (ctx.unrepresentable === "throw") throw new Error("Custom types cannot be represented in JSON Schema");
};
const transformProcessor = (_schema, ctx, _json, _params) => {
	if (ctx.unrepresentable === "throw") throw new Error("Transforms cannot be represented in JSON Schema");
};
const arrayProcessor = (schema, ctx, _json, params) => {
	const json = _json;
	const def = schema._zod.def;
	const { minimum, maximum } = schema._zod.bag;
	if (typeof minimum === "number") json.minItems = minimum;
	if (typeof maximum === "number") json.maxItems = maximum;
	json.type = "array";
	json.items = process(def.element, ctx, {
		...params,
		path: [...params.path, "items"]
	});
};
const objectProcessor = (schema, ctx, _json, params) => {
	const json = _json;
	const def = schema._zod.def;
	json.type = "object";
	json.properties = {};
	const shape = def.shape;
	for (const key in shape) json.properties[key] = process(shape[key], ctx, {
		...params,
		path: [
			...params.path,
			"properties",
			key
		]
	});
	const allKeys = new Set(Object.keys(shape));
	const requiredKeys = new Set([...allKeys].filter((key) => {
		const v = def.shape[key]._zod;
		if (ctx.io === "input") return v.optin === void 0;
		else return v.optout === void 0;
	}));
	if (requiredKeys.size > 0) json.required = Array.from(requiredKeys);
	if (def.catchall?._zod.def.type === "never") json.additionalProperties = false;
	else if (!def.catchall) {
		if (ctx.io === "output") json.additionalProperties = false;
	} else if (def.catchall) json.additionalProperties = process(def.catchall, ctx, {
		...params,
		path: [...params.path, "additionalProperties"]
	});
};
const unionProcessor = (schema, ctx, json, params) => {
	const def = schema._zod.def;
	const isExclusive = def.inclusive === false;
	const options = def.options.map((x, i) => process(x, ctx, {
		...params,
		path: [
			...params.path,
			isExclusive ? "oneOf" : "anyOf",
			i
		]
	}));
	if (isExclusive) json.oneOf = options;
	else json.anyOf = options;
};
const intersectionProcessor = (schema, ctx, json, params) => {
	const def = schema._zod.def;
	const a = process(def.left, ctx, {
		...params,
		path: [
			...params.path,
			"allOf",
			0
		]
	});
	const b = process(def.right, ctx, {
		...params,
		path: [
			...params.path,
			"allOf",
			1
		]
	});
	const isSimpleIntersection = (val) => "allOf" in val && Object.keys(val).length === 1;
	json.allOf = [...isSimpleIntersection(a) ? a.allOf : [a], ...isSimpleIntersection(b) ? b.allOf : [b]];
};
const nullableProcessor = (schema, ctx, json, params) => {
	const def = schema._zod.def;
	const inner = process(def.innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	if (ctx.target === "openapi-3.0") {
		seen.ref = def.innerType;
		json.nullable = true;
	} else json.anyOf = [inner, { type: "null" }];
};
const nonoptionalProcessor = (schema, ctx, _json, params) => {
	const def = schema._zod.def;
	process(def.innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = def.innerType;
};
const defaultProcessor = (schema, ctx, json, params) => {
	const def = schema._zod.def;
	process(def.innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = def.innerType;
	json.default = JSON.parse(JSON.stringify(def.defaultValue));
};
const prefaultProcessor = (schema, ctx, json, params) => {
	const def = schema._zod.def;
	process(def.innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = def.innerType;
	if (ctx.io === "input") json._prefault = JSON.parse(JSON.stringify(def.defaultValue));
};
const catchProcessor = (schema, ctx, json, params) => {
	const def = schema._zod.def;
	process(def.innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = def.innerType;
	let catchValue;
	try {
		catchValue = def.catchValue(void 0);
	} catch {
		throw new Error("Dynamic catch values are not supported in JSON Schema");
	}
	json.default = catchValue;
};
const pipeProcessor = (schema, ctx, _json, params) => {
	const def = schema._zod.def;
	const inIsTransform = def.in._zod.traits.has("$ZodTransform");
	const innerType = ctx.io === "input" ? inIsTransform ? def.out : def.in : def.out;
	process(innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = innerType;
};
const readonlyProcessor = (schema, ctx, json, params) => {
	const def = schema._zod.def;
	process(def.innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = def.innerType;
	json.readOnly = true;
};
const optionalProcessor = (schema, ctx, _json, params) => {
	const def = schema._zod.def;
	process(def.innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = def.innerType;
};


const ZodISODateTime = /*@__PURE__*/ $constructor("ZodISODateTime", (inst, def) => {
	$ZodISODateTime.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function datetime(params) {
	return /* @__PURE__ */ _isoDateTime(ZodISODateTime, params);
}
const ZodISODate = /*@__PURE__*/ $constructor("ZodISODate", (inst, def) => {
	$ZodISODate.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function date(params) {
	return /* @__PURE__ */ _isoDate(ZodISODate, params);
}
const ZodISOTime = /*@__PURE__*/ $constructor("ZodISOTime", (inst, def) => {
	$ZodISOTime.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function time(params) {
	return /* @__PURE__ */ _isoTime(ZodISOTime, params);
}
const ZodISODuration = /*@__PURE__*/ $constructor("ZodISODuration", (inst, def) => {
	$ZodISODuration.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function duration(params) {
	return /* @__PURE__ */ _isoDuration(ZodISODuration, params);
}


const initializer = (inst, issues) => {
	$ZodError.init(inst, issues);
	inst.name = "ZodError";
	Object.defineProperties(inst, {
		format: { value: (mapper) => formatError(inst, mapper) },
		flatten: { value: (mapper) => flattenError(inst, mapper) },
		addIssue: { value: (issue) => {
			inst.issues.push(issue);
			inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
		} },
		addIssues: { value: (issues) => {
			inst.issues.push(...issues);
			inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
		} },
		isEmpty: { get() {
			return inst.issues.length === 0;
		} }
	});
};
const ZodRealError = /*@__PURE__*/ $constructor("ZodError", initializer, { Parent: Error });


const parse = /* @__PURE__ */ _parse(ZodRealError);
const parseAsync = /* @__PURE__ */ _parseAsync(ZodRealError);
const safeParse = /* @__PURE__ */ _safeParse(ZodRealError);
const safeParseAsync = /* @__PURE__ */ _safeParseAsync(ZodRealError);
const encode = /* @__PURE__ */ _encode(ZodRealError);
const decode = /* @__PURE__ */ _decode(ZodRealError);
const encodeAsync = /* @__PURE__ */ _encodeAsync(ZodRealError);
const decodeAsync = /* @__PURE__ */ _decodeAsync(ZodRealError);
const safeEncode = /* @__PURE__ */ _safeEncode(ZodRealError);
const safeDecode = /* @__PURE__ */ _safeDecode(ZodRealError);
const safeEncodeAsync = /* @__PURE__ */ _safeEncodeAsync(ZodRealError);
const safeDecodeAsync = /* @__PURE__ */ _safeDecodeAsync(ZodRealError);


const _installedGroups = /* @__PURE__ */ new WeakMap();
function _installLazyMethods(inst, group, methods) {
	const proto = Object.getPrototypeOf(inst);
	let installed = _installedGroups.get(proto);
	if (!installed) {
		installed = /* @__PURE__ */ new Set();
		_installedGroups.set(proto, installed);
	}
	if (installed.has(group)) return;
	installed.add(group);
	for (const key in methods) {
		const fn = methods[key];
		Object.defineProperty(proto, key, {
			configurable: true,
			enumerable: false,
			get() {
				const bound = fn.bind(this);
				Object.defineProperty(this, key, {
					configurable: true,
					writable: true,
					enumerable: true,
					value: bound
				});
				return bound;
			},
			set(v) {
				Object.defineProperty(this, key, {
					configurable: true,
					writable: true,
					enumerable: true,
					value: v
				});
			}
		});
	}
}
const ZodType = /*@__PURE__*/ $constructor("ZodType", (inst, def) => {
	$ZodType.init(inst, def);
	Object.assign(inst["~standard"], { jsonSchema: {
		input: createStandardJSONSchemaMethod(inst, "input"),
		output: createStandardJSONSchemaMethod(inst, "output")
	} });
	inst.toJSONSchema = createToJSONSchemaMethod(inst, {});
	inst.def = def;
	inst.type = def.type;
	Object.defineProperty(inst, "_def", { value: def });
	inst.parse = (data, params) => parse(inst, data, params, { callee: inst.parse });
	inst.safeParse = (data, params) => safeParse(inst, data, params);
	inst.parseAsync = async (data, params) => parseAsync(inst, data, params, { callee: inst.parseAsync });
	inst.safeParseAsync = async (data, params) => safeParseAsync(inst, data, params);
	inst.spa = inst.safeParseAsync;
	inst.encode = (data, params) => encode(inst, data, params);
	inst.decode = (data, params) => decode(inst, data, params);
	inst.encodeAsync = async (data, params) => encodeAsync(inst, data, params);
	inst.decodeAsync = async (data, params) => decodeAsync(inst, data, params);
	inst.safeEncode = (data, params) => safeEncode(inst, data, params);
	inst.safeDecode = (data, params) => safeDecode(inst, data, params);
	inst.safeEncodeAsync = async (data, params) => safeEncodeAsync(inst, data, params);
	inst.safeDecodeAsync = async (data, params) => safeDecodeAsync(inst, data, params);
	_installLazyMethods(inst, "ZodType", {
		check(...chks) {
			const def = this.def;
			return this.clone(mergeDefs(def, { checks: [...def.checks ?? [], ...chks.map((ch) => typeof ch === "function" ? { _zod: {
				check: ch,
				def: { check: "custom" },
				onattach: []
			} } : ch)] }), { parent: true });
		},
		with(...chks) {
			return this.check(...chks);
		},
		clone(def, params) {
			return clone(this, def, params);
		},
		brand() {
			return this;
		},
		register(reg, meta) {
			reg.add(this, meta);
			return this;
		},
		refine(check, params) {
			return this.check(refine(check, params));
		},
		superRefine(refinement, params) {
			return this.check(superRefine(refinement, params));
		},
		overwrite(fn) {
			return this.check(/* @__PURE__ */ _overwrite(fn));
		},
		optional() {
			return optional(this);
		},
		exactOptional() {
			return exactOptional(this);
		},
		nullable() {
			return nullable(this);
		},
		nullish() {
			return optional(nullable(this));
		},
		nonoptional(params) {
			return nonoptional(this, params);
		},
		array() {
			return array(this);
		},
		or(arg) {
			return union([this, arg]);
		},
		and(arg) {
			return intersection(this, arg);
		},
		transform(tx) {
			return pipe(this, transform(tx));
		},
		default(d) {
			return _default(this, d);
		},
		prefault(d) {
			return prefault(this, d);
		},
		catch(params) {
			return _catch(this, params);
		},
		pipe(target) {
			return pipe(this, target);
		},
		readonly() {
			return readonly(this);
		},
		describe(description) {
			const cl = this.clone();
			globalRegistry.add(cl, { description });
			return cl;
		},
		meta(...args) {
			if (args.length === 0) return globalRegistry.get(this);
			const cl = this.clone();
			globalRegistry.add(cl, args[0]);
			return cl;
		},
		isOptional() {
			return this.safeParse(void 0).success;
		},
		isNullable() {
			return this.safeParse(null).success;
		},
		apply(fn) {
			return fn(this);
		}
	});
	Object.defineProperty(inst, "description", {
		get() {
			return globalRegistry.get(inst)?.description;
		},
		configurable: true
	});
	return inst;
});
/** @internal */
const _ZodString = /*@__PURE__*/ $constructor("_ZodString", (inst, def) => {
	$ZodString.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => stringProcessor(inst, ctx, json, params);
	const bag = inst._zod.bag;
	inst.format = bag.format ?? null;
	inst.minLength = bag.minimum ?? null;
	inst.maxLength = bag.maximum ?? null;
	_installLazyMethods(inst, "_ZodString", {
		regex(...args) {
			return this.check(/* @__PURE__ */ _regex(...args));
		},
		includes(...args) {
			return this.check(/* @__PURE__ */ _includes(...args));
		},
		startsWith(...args) {
			return this.check(/* @__PURE__ */ _startsWith(...args));
		},
		endsWith(...args) {
			return this.check(/* @__PURE__ */ _endsWith(...args));
		},
		min(...args) {
			return this.check(/* @__PURE__ */ _minLength(...args));
		},
		max(...args) {
			return this.check(/* @__PURE__ */ _maxLength(...args));
		},
		length(...args) {
			return this.check(/* @__PURE__ */ _length(...args));
		},
		nonempty(...args) {
			return this.check(/* @__PURE__ */ _minLength(1, ...args));
		},
		lowercase(params) {
			return this.check(/* @__PURE__ */ _lowercase(params));
		},
		uppercase(params) {
			return this.check(/* @__PURE__ */ _uppercase(params));
		},
		trim() {
			return this.check(/* @__PURE__ */ _trim());
		},
		normalize(...args) {
			return this.check(/* @__PURE__ */ _normalize(...args));
		},
		toLowerCase() {
			return this.check(/* @__PURE__ */ _toLowerCase());
		},
		toUpperCase() {
			return this.check(/* @__PURE__ */ _toUpperCase());
		},
		slugify() {
			return this.check(/* @__PURE__ */ _slugify());
		}
	});
});
const ZodString = /*@__PURE__*/ $constructor("ZodString", (inst, def) => {
	$ZodString.init(inst, def);
	_ZodString.init(inst, def);
	inst.email = (params) => inst.check(/* @__PURE__ */ _email(ZodEmail, params));
	inst.url = (params) => inst.check(/* @__PURE__ */ _url(ZodURL, params));
	inst.jwt = (params) => inst.check(/* @__PURE__ */ _jwt(ZodJWT, params));
	inst.emoji = (params) => inst.check(/* @__PURE__ */ _emoji(ZodEmoji, params));
	inst.guid = (params) => inst.check(/* @__PURE__ */ _guid(ZodGUID, params));
	inst.uuid = (params) => inst.check(/* @__PURE__ */ _uuid(ZodUUID, params));
	inst.uuidv4 = (params) => inst.check(/* @__PURE__ */ _uuidv4(ZodUUID, params));
	inst.uuidv6 = (params) => inst.check(/* @__PURE__ */ _uuidv6(ZodUUID, params));
	inst.uuidv7 = (params) => inst.check(/* @__PURE__ */ _uuidv7(ZodUUID, params));
	inst.nanoid = (params) => inst.check(/* @__PURE__ */ _nanoid(ZodNanoID, params));
	inst.guid = (params) => inst.check(/* @__PURE__ */ _guid(ZodGUID, params));
	inst.cuid = (params) => inst.check(/* @__PURE__ */ _cuid(ZodCUID, params));
	inst.cuid2 = (params) => inst.check(/* @__PURE__ */ _cuid2(ZodCUID2, params));
	inst.ulid = (params) => inst.check(/* @__PURE__ */ _ulid(ZodULID, params));
	inst.base64 = (params) => inst.check(/* @__PURE__ */ _base64(ZodBase64, params));
	inst.base64url = (params) => inst.check(/* @__PURE__ */ _base64url(ZodBase64URL, params));
	inst.xid = (params) => inst.check(/* @__PURE__ */ _xid(ZodXID, params));
	inst.ksuid = (params) => inst.check(/* @__PURE__ */ _ksuid(ZodKSUID, params));
	inst.ipv4 = (params) => inst.check(/* @__PURE__ */ _ipv4(ZodIPv4, params));
	inst.ipv6 = (params) => inst.check(/* @__PURE__ */ _ipv6(ZodIPv6, params));
	inst.cidrv4 = (params) => inst.check(/* @__PURE__ */ _cidrv4(ZodCIDRv4, params));
	inst.cidrv6 = (params) => inst.check(/* @__PURE__ */ _cidrv6(ZodCIDRv6, params));
	inst.e164 = (params) => inst.check(/* @__PURE__ */ _e164(ZodE164, params));
	inst.datetime = (params) => inst.check(datetime(params));
	inst.date = (params) => inst.check(date(params));
	inst.time = (params) => inst.check(time(params));
	inst.duration = (params) => inst.check(duration(params));
});
function string(params) {
	return /* @__PURE__ */ _string(ZodString, params);
}
const ZodStringFormat = /*@__PURE__*/ $constructor("ZodStringFormat", (inst, def) => {
	$ZodStringFormat.init(inst, def);
	_ZodString.init(inst, def);
});
const ZodEmail = /*@__PURE__*/ $constructor("ZodEmail", (inst, def) => {
	$ZodEmail.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodGUID = /*@__PURE__*/ $constructor("ZodGUID", (inst, def) => {
	$ZodGUID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodUUID = /*@__PURE__*/ $constructor("ZodUUID", (inst, def) => {
	$ZodUUID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodURL = /*@__PURE__*/ $constructor("ZodURL", (inst, def) => {
	$ZodURL.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodEmoji = /*@__PURE__*/ $constructor("ZodEmoji", (inst, def) => {
	$ZodEmoji.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodNanoID = /*@__PURE__*/ $constructor("ZodNanoID", (inst, def) => {
	$ZodNanoID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
/**
* @deprecated CUID v1 is deprecated by its authors due to information leakage
* (timestamps embedded in the id). Use {@link ZodCUID2} instead.
* See https://github.com/paralleldrive/cuid.
*/
const ZodCUID = /*@__PURE__*/ $constructor("ZodCUID", (inst, def) => {
	$ZodCUID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodCUID2 = /*@__PURE__*/ $constructor("ZodCUID2", (inst, def) => {
	$ZodCUID2.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodULID = /*@__PURE__*/ $constructor("ZodULID", (inst, def) => {
	$ZodULID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodXID = /*@__PURE__*/ $constructor("ZodXID", (inst, def) => {
	$ZodXID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodKSUID = /*@__PURE__*/ $constructor("ZodKSUID", (inst, def) => {
	$ZodKSUID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodIPv4 = /*@__PURE__*/ $constructor("ZodIPv4", (inst, def) => {
	$ZodIPv4.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodIPv6 = /*@__PURE__*/ $constructor("ZodIPv6", (inst, def) => {
	$ZodIPv6.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodCIDRv4 = /*@__PURE__*/ $constructor("ZodCIDRv4", (inst, def) => {
	$ZodCIDRv4.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodCIDRv6 = /*@__PURE__*/ $constructor("ZodCIDRv6", (inst, def) => {
	$ZodCIDRv6.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodBase64 = /*@__PURE__*/ $constructor("ZodBase64", (inst, def) => {
	$ZodBase64.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodBase64URL = /*@__PURE__*/ $constructor("ZodBase64URL", (inst, def) => {
	$ZodBase64URL.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodE164 = /*@__PURE__*/ $constructor("ZodE164", (inst, def) => {
	$ZodE164.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodJWT = /*@__PURE__*/ $constructor("ZodJWT", (inst, def) => {
	$ZodJWT.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodNumber = /*@__PURE__*/ $constructor("ZodNumber", (inst, def) => {
	$ZodNumber.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => numberProcessor(inst, ctx, json, params);
	_installLazyMethods(inst, "ZodNumber", {
		gt(value, params) {
			return this.check(/* @__PURE__ */ _gt(value, params));
		},
		gte(value, params) {
			return this.check(/* @__PURE__ */ _gte(value, params));
		},
		min(value, params) {
			return this.check(/* @__PURE__ */ _gte(value, params));
		},
		lt(value, params) {
			return this.check(/* @__PURE__ */ _lt(value, params));
		},
		lte(value, params) {
			return this.check(/* @__PURE__ */ _lte(value, params));
		},
		max(value, params) {
			return this.check(/* @__PURE__ */ _lte(value, params));
		},
		int(params) {
			return this.check(int(params));
		},
		safe(params) {
			return this.check(int(params));
		},
		positive(params) {
			return this.check(/* @__PURE__ */ _gt(0, params));
		},
		nonnegative(params) {
			return this.check(/* @__PURE__ */ _gte(0, params));
		},
		negative(params) {
			return this.check(/* @__PURE__ */ _lt(0, params));
		},
		nonpositive(params) {
			return this.check(/* @__PURE__ */ _lte(0, params));
		},
		multipleOf(value, params) {
			return this.check(/* @__PURE__ */ _multipleOf(value, params));
		},
		step(value, params) {
			return this.check(/* @__PURE__ */ _multipleOf(value, params));
		},
		finite() {
			return this;
		}
	});
	const bag = inst._zod.bag;
	inst.minValue = Math.max(bag.minimum ?? Number.NEGATIVE_INFINITY, bag.exclusiveMinimum ?? Number.NEGATIVE_INFINITY) ?? null;
	inst.maxValue = Math.min(bag.maximum ?? Number.POSITIVE_INFINITY, bag.exclusiveMaximum ?? Number.POSITIVE_INFINITY) ?? null;
	inst.isInt = (bag.format ?? "").includes("int") || Number.isSafeInteger(bag.multipleOf ?? .5);
	inst.isFinite = true;
	inst.format = bag.format ?? null;
});
function number(params) {
	return /* @__PURE__ */ _number(ZodNumber, params);
}
const ZodNumberFormat = /*@__PURE__*/ $constructor("ZodNumberFormat", (inst, def) => {
	$ZodNumberFormat.init(inst, def);
	ZodNumber.init(inst, def);
});
function int(params) {
	return /* @__PURE__ */ _int(ZodNumberFormat, params);
}
const ZodUnknown = /*@__PURE__*/ $constructor("ZodUnknown", (inst, def) => {
	$ZodUnknown.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => void 0;
});
function unknown() {
	return /* @__PURE__ */ _unknown(ZodUnknown);
}
const ZodNever = /*@__PURE__*/ $constructor("ZodNever", (inst, def) => {
	$ZodNever.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => neverProcessor(inst, ctx, json, params);
});
function never(params) {
	return /* @__PURE__ */ _never(ZodNever, params);
}
const ZodArray = /*@__PURE__*/ $constructor("ZodArray", (inst, def) => {
	$ZodArray.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => arrayProcessor(inst, ctx, json, params);
	inst.element = def.element;
	_installLazyMethods(inst, "ZodArray", {
		min(n, params) {
			return this.check(/* @__PURE__ */ _minLength(n, params));
		},
		nonempty(params) {
			return this.check(/* @__PURE__ */ _minLength(1, params));
		},
		max(n, params) {
			return this.check(/* @__PURE__ */ _maxLength(n, params));
		},
		length(n, params) {
			return this.check(/* @__PURE__ */ _length(n, params));
		},
		unwrap() {
			return this.element;
		}
	});
});
function array(element, params) {
	return /* @__PURE__ */ _array(ZodArray, element, params);
}
const ZodObject = /*@__PURE__*/ $constructor("ZodObject", (inst, def) => {
	$ZodObjectJIT.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => objectProcessor(inst, ctx, json, params);
	defineLazy(inst, "shape", () => {
		return def.shape;
	});
	_installLazyMethods(inst, "ZodObject", {
		keyof() {
			return _enum(Object.keys(this._zod.def.shape));
		},
		catchall(catchall) {
			return this.clone({
				...this._zod.def,
				catchall
			});
		},
		passthrough() {
			return this.clone({
				...this._zod.def,
				catchall: unknown()
			});
		},
		loose() {
			return this.clone({
				...this._zod.def,
				catchall: unknown()
			});
		},
		strict() {
			return this.clone({
				...this._zod.def,
				catchall: never()
			});
		},
		strip() {
			return this.clone({
				...this._zod.def,
				catchall: void 0
			});
		},
		extend(incoming) {
			return extend(this, incoming);
		},
		safeExtend(incoming) {
			return safeExtend(this, incoming);
		},
		merge(other) {
			return merge(this, other);
		},
		pick(mask) {
			return pick(this, mask);
		},
		omit(mask) {
			return omit(this, mask);
		},
		partial(...args) {
			return partial(ZodOptional, this, args[0]);
		},
		required(...args) {
			return required(ZodNonOptional, this, args[0]);
		}
	});
});
function strictObject(shape, params) {
	return new ZodObject({
		type: "object",
		shape,
		catchall: never(),
		...normalizeParams(params)
	});
}
const ZodUnion = /*@__PURE__*/ $constructor("ZodUnion", (inst, def) => {
	$ZodUnion.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => unionProcessor(inst, ctx, json, params);
	inst.options = def.options;
});
function union(options, params) {
	return new ZodUnion({
		type: "union",
		options,
		...normalizeParams(params)
	});
}
const ZodIntersection = /*@__PURE__*/ $constructor("ZodIntersection", (inst, def) => {
	$ZodIntersection.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => intersectionProcessor(inst, ctx, json, params);
});
function intersection(left, right) {
	return new ZodIntersection({
		type: "intersection",
		left,
		right
	});
}
const ZodEnum = /*@__PURE__*/ $constructor("ZodEnum", (inst, def) => {
	$ZodEnum.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => enumProcessor(inst, ctx, json, params);
	inst.enum = def.entries;
	inst.options = Object.values(def.entries);
	const keys = new Set(Object.keys(def.entries));
	inst.extract = (values, params) => {
		const newEntries = {};
		for (const value of values) if (keys.has(value)) newEntries[value] = def.entries[value];
		else throw new Error(`Key ${value} not found in enum`);
		return new ZodEnum({
			...def,
			checks: [],
			...normalizeParams(params),
			entries: newEntries
		});
	};
	inst.exclude = (values, params) => {
		const newEntries = { ...def.entries };
		for (const value of values) if (keys.has(value)) delete newEntries[value];
		else throw new Error(`Key ${value} not found in enum`);
		return new ZodEnum({
			...def,
			checks: [],
			...normalizeParams(params),
			entries: newEntries
		});
	};
});
function _enum(values, params) {
	return new ZodEnum({
		type: "enum",
		entries: Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values,
		...normalizeParams(params)
	});
}
const ZodLiteral = /*@__PURE__*/ $constructor("ZodLiteral", (inst, def) => {
	$ZodLiteral.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => literalProcessor(inst, ctx, json, params);
	inst.values = new Set(def.values);
	Object.defineProperty(inst, "value", { get() {
		if (def.values.length > 1) throw new Error("This schema contains multiple valid literal values. Use `.values` instead.");
		return def.values[0];
	} });
});
function literal(value, params) {
	return new ZodLiteral({
		type: "literal",
		values: Array.isArray(value) ? value : [value],
		...normalizeParams(params)
	});
}
const ZodTransform = /*@__PURE__*/ $constructor("ZodTransform", (inst, def) => {
	$ZodTransform.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => transformProcessor(inst, ctx, json, params);
	inst._zod.parse = (payload, _ctx) => {
		if (_ctx.direction === "backward") throw new $ZodEncodeError(inst.constructor.name);
		payload.addIssue = (issue$1) => {
			if (typeof issue$1 === "string") payload.issues.push(issue(issue$1, payload.value, def));
			else {
				const _issue = issue$1;
				if (_issue.fatal) _issue.continue = false;
				_issue.code ?? (_issue.code = "custom");
				_issue.input ?? (_issue.input = payload.value);
				_issue.inst ?? (_issue.inst = inst);
				payload.issues.push(issue(_issue));
			}
		};
		const output = def.transform(payload.value, payload);
		if (output instanceof Promise) return output.then((output) => {
			payload.value = output;
			payload.fallback = true;
			return payload;
		});
		payload.value = output;
		payload.fallback = true;
		return payload;
	};
});
function transform(fn) {
	return new ZodTransform({
		type: "transform",
		transform: fn
	});
}
const ZodOptional = /*@__PURE__*/ $constructor("ZodOptional", (inst, def) => {
	$ZodOptional.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
});
function optional(innerType) {
	return new ZodOptional({
		type: "optional",
		innerType
	});
}
const ZodExactOptional = /*@__PURE__*/ $constructor("ZodExactOptional", (inst, def) => {
	$ZodExactOptional.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
});
function exactOptional(innerType) {
	return new ZodExactOptional({
		type: "optional",
		innerType
	});
}
const ZodNullable = /*@__PURE__*/ $constructor("ZodNullable", (inst, def) => {
	$ZodNullable.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => nullableProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
});
function nullable(innerType) {
	return new ZodNullable({
		type: "nullable",
		innerType
	});
}
const ZodDefault = /*@__PURE__*/ $constructor("ZodDefault", (inst, def) => {
	$ZodDefault.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => defaultProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
	inst.removeDefault = inst.unwrap;
});
function _default(innerType, defaultValue) {
	return new ZodDefault({
		type: "default",
		innerType,
		get defaultValue() {
			return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
		}
	});
}
const ZodPrefault = /*@__PURE__*/ $constructor("ZodPrefault", (inst, def) => {
	$ZodPrefault.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => prefaultProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
});
function prefault(innerType, defaultValue) {
	return new ZodPrefault({
		type: "prefault",
		innerType,
		get defaultValue() {
			return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
		}
	});
}
const ZodNonOptional = /*@__PURE__*/ $constructor("ZodNonOptional", (inst, def) => {
	$ZodNonOptional.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => nonoptionalProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
});
function nonoptional(innerType, params) {
	return new ZodNonOptional({
		type: "nonoptional",
		innerType,
		...normalizeParams(params)
	});
}
const ZodCatch = /*@__PURE__*/ $constructor("ZodCatch", (inst, def) => {
	$ZodCatch.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => catchProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
	inst.removeCatch = inst.unwrap;
});
function _catch(innerType, catchValue) {
	return new ZodCatch({
		type: "catch",
		innerType,
		catchValue: typeof catchValue === "function" ? catchValue : () => catchValue
	});
}
const ZodPipe = /*@__PURE__*/ $constructor("ZodPipe", (inst, def) => {
	$ZodPipe.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => pipeProcessor(inst, ctx, json, params);
	inst.in = def.in;
	inst.out = def.out;
});
function pipe(in_, out) {
	return new ZodPipe({
		type: "pipe",
		in: in_,
		out
	});
}
const ZodReadonly = /*@__PURE__*/ $constructor("ZodReadonly", (inst, def) => {
	$ZodReadonly.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => readonlyProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
});
function readonly(innerType) {
	return new ZodReadonly({
		type: "readonly",
		innerType
	});
}
const ZodCustom = /*@__PURE__*/ $constructor("ZodCustom", (inst, def) => {
	$ZodCustom.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => customProcessor(inst, ctx, json, params);
});
function refine(fn, _params = {}) {
	return /* @__PURE__ */ _refine(ZodCustom, fn, _params);
}
function superRefine(fn, params) {
	return /* @__PURE__ */ _superRefine(fn, params);
}


/**
* Durable per-member configuration snapshots for preset-managed Team members.
*
* Official rc.2 gives a plugin no durable channel of its own: `Session.append`
* cannot write the `ignorable` marker the persistence read path requires for an
* out-of-repo event type, and the shipped vocabulary deliberately rejects
* event-name registration (`@deepseek-ai/dsh-session/known-event-types`). The
* composed `dsh-base` bundle therefore leaves `ctx.storage.domain` as the only
* official, schema-validated, atomically-durable place to record what a member
* was created with.
*
* One record is the whole snapshot AND the ownership marker, written durably
* BEFORE the member can be created, so there is no window in which a member is
* identifiable as plugin-managed without its snapshot. The unit uses the
* default `single` layout so a stored format version this build does not accept
* refuses the open instead of being discarded, and a record that fails its
* schema refuses the open instead of being skipped: the plugin then disables
* member injection rather than letting a member run on the Team Lead's route
* with unrestricted tools.
*
* The domain form is reached through the `storageDomain` SERVICE only. This
* module deliberately holds no runtime import of `@deepseek-ai/dsh-storage-domain`:
* `defineDomain` and `domainTable` are pure identity/validation helpers for
* constants this module already fixes, while a load-time import would make the
* whole plugin — Settings page included — unresolvable in a deployment that
* composes no storage, instead of disabling just member injection.
* @module dsh-agent-team-presets/member-store
*/
/** Backend unit name; also the `storages/` document name. */
const MEMBER_DOMAIN_NAME = "agent_team_presets_members";
const memberRouteSchema = strictObject({
	provider: string().min(1),
	model: string().min(1),
	reasoningEffort: string().min(1).optional()
});
const memberPolicySchema = strictObject({
	mode: _enum(["all", "custom"]),
	allow: array(string())
});
const memberRosterEntrySchema = strictObject({
	target: string().min(1),
	display: string(),
	description: string()
});
/**
* Domain declaration of the member unit.
*
* A literal rather than a `defineDomain(...)` call: the form is reached through
* a service, so the helper would have to be imported dynamically and its
* load-time checks (unit name, version, and table-name grammar) restate rules
* these three constants already satisfy and the backend re-validates when the
* unit opens.
*/
const memberDomainSpec = {
	name: MEMBER_DOMAIN_NAME,
	version: 1,
	tables: { members: { valueSchema: strictObject({
		/** Layout version of this record; a bump refuses older records. */
		schemaVersion: literal(1),
		/** Identity of one creation attempt, so a retry is distinguishable. */
		intentId: string().min(1),
		/** Team Lead Session this member belongs to. */
		rootSessionId: string().min(1),
		/** Exact teammate target the member was created under. */
		memberName: string().min(1),
		/** Team preset identity the snapshot was captured from. */
		teamId: string().min(1),
		/** Stable member identity inside the preset, when the preset carries one. */
		roleId: string().min(1).optional(),
		/** Configured display name, for diagnostics and operator inspection. */
		displayName: string(),
		/** Configured role description, for diagnostics and operator inspection. */
		roleDescription: string(),
		/** Frozen own persona text: the member briefing registered as its persona. */
		persona: string(),
		/** Frozen team context and preset division-of-labour text. */
		teamSection: string(),
		/** The preset roster the division-of-labour text was rendered from. */
		roster: array(memberRosterEntrySchema),
		/** Frozen route; absent means the member runs on the Session's own route. */
		route: memberRouteSchema.optional(),
		/** Frozen strict tool policy of this member's own slot. */
		policy: memberPolicySchema,
		/** Subagent execution backend the member was created through. */
		spawnContext: _enum(["fresh", "fork"]),
		/** Creation progress: `intent` before the child exists, `bound` once it does. */
		lifecycle: _enum([
			"intent",
			"bound",
			"failed"
		]),
		/** Durable child Session identity, present once the child was created. */
		childSessionId: string().min(1).optional(),
		/** Last mutation time, for operator inspection only. */
		updatedAt: number().int().min(0)
	}) } }
};
/**
* Derive the durable key of one member instance.
*
* Teammate names are never reused inside a Team and every Team is rooted at one
* Lead Session, so `(rootSessionId, memberName)` is unique for the lifetime of
* the member. The key is a digest because store record keys must be safe path
* segments; the record itself keeps both plain fields, so a lookup always
* re-verifies the identity it resolved.
* @param rootSessionId - the Team Lead Session identity.
* @param memberName - the exact teammate target.
* @returns a stable record key.
*/
function memberRecordKey(rootSessionId, memberName) {
	return createHash("sha256").update(rootSessionId, "utf8").update("\0").update(memberName, "utf8").digest("hex");
}
/**
* How long a fresh activation waits for the previous one to release the unit.
*
* The wait is bounded on purpose: a handoff that cannot complete must disable
* member injection (fail closed) instead of hanging the Host or letting two
* activations own one unit and treat its records as unmanaged.
*/
const HANDOFF_TIMEOUT_MS = 5e3;
/**
* Process-wide release barrier for the durable member unit.
*
* An HMR remount can open the same unit before the previous activation's close
* has finished, and the storage facility refuses a second open of a live unit.
* The barrier is what makes the handoff ordered: a new open waits for the
* release that is already in progress, and a release that never completes is
* reported rather than awaited forever. It carries no member data — only the
* close promise itself.
*/
let released = Promise.resolve();
/**
* Wait for any release already in progress, bounded by {@link HANDOFF_TIMEOUT_MS}.
* @returns resolution once no release is pending.
* @throws when the previous activation has not released the unit in time.
*/
async function awaitRelease() {
	const pending = released;
	let timer;
	try {
		await Promise.race([pending, new Promise((_resolve, reject) => {
			timer = setTimeout(() => {
				reject(/* @__PURE__ */ new Error(`the previous plugin activation did not release the member store within ${HANDOFF_TIMEOUT_MS}ms`));
			}, HANDOFF_TIMEOUT_MS);
		})]);
	} finally {
		if (timer !== void 0) clearTimeout(timer);
	}
}
/**
* Open the member snapshot unit on the deployment's storage hub.
*
* Rejects when the domain form is absent, the routed backend cannot serve it,
* the stored format version is not this build's, a stored record fails its
* schema, or a previous activation has not released the unit yet. Every one of
* those means the plugin cannot prove what a member was created with, so the
* caller must refuse member creation rather than guess.
* @param ctx - the plugin context carrying `storageDomain`.
* @returns the opened store.
* @throws when the domain form is not composed or the unit cannot be opened.
*/
async function openMemberStore(ctx) {
	await awaitRelease();
	const facility = ctx.get("storageDomain");
	if (facility === void 0) throw new Error("this deployment does not compose @deepseek-ai/dsh-storage-domain, so preset-managed Team members have no durable configuration snapshot");
	const domain = await facility.open(memberDomainSpec);
	const table = domain.table("members");
	return {
		get: (rootSessionId, memberName) => table.get(memberRecordKey(rootSessionId, memberName)),
		values: () => [...table.entries()].map(([, record]) => record),
		put: async (record) => {
			await table.put(memberRecordKey(record.rootSessionId, record.memberName), record);
		},
		close: () => {
			const closing = domain.close();
			released = closing.catch(() => {});
			return closing;
		}
	};
}


/**
* Tool-presentation preparation for one Team application.
*
* An official Agent preset declares its tool presentation for its own scope:
* `standard` and `cordis` stay native, `ptc` declares `presentAs('ptc')`. A
* strict custom Team policy has to reach the tools it allows, and the shipped
* Node PTC transport can import `fs`/`child_process` outside the tool SDK, so a
* custom Team is only ever applied with a native presentation of its own.
*
* That decision is made here through public APIs only: the effective wire is
* read with `systemPrompt.assemble()`, and a native declaration is attempted
* rather than assumed. The three outcomes are kept apart, because they need
* different answers — an already-native surface needs nothing, an ancestor PTC
* surface is shadowed by our own Agent-scoped declaration, and a presentation
* an exact-Agent scope already declared cannot be replaced and must refuse the
* application instead of silently running a surface the policy cannot govern.
*
* @module dsh-agent-team-presets/presentation
*/
/**
* Read the effective prompt and tool surface of one Agent.
*
* This is the final wire the model receives: restricted, shadowed, and with an
* active complete section already reduced to the sole section. It is the only
* authority used here — no private presentation state is inspected.
* @param agent - the live Agent whose next request is being shaped.
* @returns the snapshot, or undefined when assembly itself failed.
*/
async function readWire(agent) {
	try {
		const assembly = await agent.ctx.systemPrompt.assemble(assembleContextFor(agent));
		return {
			sections: assembly.sections.map((section) => ({
				name: section.name,
				text: section.text
			})),
			tools: assembly.tools.map((tool) => tool.name)
		};
	} catch {
		return;
	}
}
/**
* Disclosure the settings page renders when a custom Team policy replaced a PTC
* presentation.
*
* A locale key, not prose: the Host never guesses the reader's language, and the
* browser bundle carries the copy in both locales.
*/
const PTC_OVERRIDDEN_DISCLOSURE = "presentation.ptcOverridden";
/**
* Decide how a custom policy's native presentation can be established.
*
* The read of the wire happens before any declaration is attempted, and the
* probe declaration is released immediately, so the caller's real registration
* is the only one in effect and is never blocked by this probe.
* @param agent - the Agent the Team is being applied to.
* @returns the typed preparation result.
*/
async function prepareNativePresentation(agent) {
	const before = await readWire(agent);
	if (before === void 0) return {
		kind: "unknown",
		reason: "This Session's effective tool presentation could not be read, so a strict custom tool policy cannot be applied to it; the Team was not applied."
	};
	if (!before.tools.includes(RUN_CODE_NAME)) return { kind: "already-native" };
	let probe;
	try {
		probe = agent.ctx.tools.presentAs("native");
	} catch (error) {
		return {
			kind: "conflict",
			reason: `This Session's exact Agent scope already declares a tool presentation that includes the PTC transport, and one composition may declare only one presentation per scope. A strict custom tool policy cannot govern that transport, so the Team was not applied here: choose a Team with the "all" tool mode, or select an Agent preset that calls tools natively. (${String(error)})`
		};
	}
	probe();
	return {
		kind: "installable",
		disclosure: PTC_OVERRIDDEN_DISCLOSURE
	};
}
/**
* Declare the native presentation at the Agent's own scope.
*
* Separate from {@link prepareNativePresentation} so the caller installs it
* inside its own rollback region: a throw here rolls back the whole
* application instead of leaving a partially applied policy.
* @param agent - the Agent the Team is being applied to.
* @returns the disposer releasing the declaration.
* @throws when the scope already declares another presentation.
*/
function installNativePresentation(agent) {
	return agent.ctx.tools.presentAs("native");
}
/**
* Classify the persona baseline of one wire snapshot.
*
* The official prompt service restores an active complete section as the SOLE
* section, so a single-section snapshot is exactly the signature of a complete
* deployment persona (the official `minimal` preset). Anything else — several
* sections, or one section under a name this plugin does not own — means there
* is no complete persona to preserve.
* @param sections - the effective sections of a pre-application snapshot.
* @returns the classified baseline.
*/
function personaBaseline(sections) {
	if (sections.length !== 1) return { kind: "none" };
	const only = sections[0];
	return only.name === PERSONA_PREFIX_SECTION ? {
		kind: "persona",
		text: only.text
	} : {
		kind: "foreign",
		name: only.name
	};
}


/**
* Member runtime coordination for preset-managed Team members.
*
* Official rc.2's Team request does not carry `agentOptions`, `persona`, or
* `toolFilter` to the subagent service, so a member arrives already created
* with the Team Lead's route and the deployment's full tool surface. The one
* public extension point that runs before the member's first request is the
* serial, awaited `agent/created` event, so this module:
*
* 1. records the member's complete frozen configuration durably before the
*    Team service is asked to create it, keyed by `(rootSessionId, name)` —
*    the identity the roster already persists;
* 2. on the creation edge, resolves that record through the official
*    `tryMembership` identity and installs the member-scoped route, persona,
*    team context, and strict tool policy before creation resolves;
* 3. re-installs for every later residency (a finished member is cold-resumed
*    from its durable descriptor and re-emits `agent/created`);
* 4. refuses rather than guesses: without a readable snapshot it neither
*    creates a member nor reports one as managed, and a member that IS
*    identified with a damaged snapshot vetoes its own creation.
*
* Nothing here patches the Host: every registration is an ordinary
* Agent-scoped contribution owned by `agent.ctx`, and the Team service keeps
* the roster, addressing, mailbox, and task board.
* @module dsh-agent-team-presets/member-runtime
*/
/** Prompt section one managed member's team context is registered under. */
const MEMBER_TEAM_SECTION = "agent-team-presets:member-team";
/** Diagnostics prefix for member-runtime failures. */
const LOG$1 = "agent-team-presets";
/**
* Refuse member creation when no durable snapshot channel exists.
*
* The text is model-facing: it reaches the captain as the member tool's error,
* so it states which capability is missing instead of pretending the member
* was created.
*/
const NO_STORE_REASON = "The durable member configuration store is unavailable in this deployment, so a Team member cannot be given its frozen route, persona, and tool policy. Spawning a member is refused rather than letting it run on this Session's route with unrestricted tools.";
/** Why a creation that arrives while the activation is shutting down is refused. */
const NO_ADMISSION_REASON = "This plugin activation is shutting down, so no new Team member can be created. The Team can summon members again after it is reloaded.";
/** Identity key of one member instance inside the failure-note table. */
function failureKey(rootSessionId, memberName) {
	return `${rootSessionId}\u0000${memberName}`;
}
/**
* Owns the durable member snapshots and every scoped registration a managed
* member runs under.
*
* One instance belongs to one plugin activation. The store opens
* asynchronously; until it is confirmed open every member creation is refused,
* because a member created without a durable snapshot could never be
* re-scoped after a restart.
*/
var MemberRuntime = class {
	ctx;
	state;
	ready;
	installations = /* @__PURE__ */ new Map();
	/**
	* Newest failure one member's own turn produced, keyed by Team identity.
	*
	* A member whose configured route is unusable fails inside its first turn, so
	* the Host reports only its own provisioning error ("initial prompt was not
	* durably accepted"). Capturing the member's real cause lets the creation
	* error name it instead of sending the captain hunting for a routing fault.
	*/
	failures = /* @__PURE__ */ new Map();
	/** Whole member-creation transactions admitted by this activation. */
	inFlight = /* @__PURE__ */ new Set();
	closed = false;
	/**
	* @param ctx - the plugin context that will carry the scoped registrations.
	*/
	constructor(ctx) {
		this.ctx = ctx;
		this.ready = this.open();
	}
	/** Open the durable unit and record why member injection stays disabled when it cannot. */
	async open() {
		try {
			const store = await openMemberStore(this.ctx);
			if (this.closed) {
				await store.close();
				return;
			}
			this.state = {
				kind: "ready",
				store
			};
		} catch (error) {
			if (this.closed) return;
			this.state = {
				kind: "unavailable",
				reason: `${NO_STORE_REASON} (${String(error)})`
			};
			this.ctx.logger.warn(`${LOG$1}: %s: %s`, NO_STORE_REASON, String(error));
		}
	}
	/**
	* Wait until the durable unit has been opened or definitively refused.
	* @returns whether the store is usable, and why not when it is not.
	*/
	async whenReady() {
		await this.ready;
		/* v8 ignore next -- only a close racing activation can leave no state. */
		return this.state ?? {
			kind: "unavailable",
			reason: NO_STORE_REASON
		};
	}
	/**
	* Record one member's frozen configuration durably, before it can be created.
	* @param intent - the frozen configuration captured for this instance.
	* @returns the durable record, or the reason member creation must be refused.
	*/
	async prepare(intent) {
		if (this.closed) return {
			kind: "refused",
			reason: NO_ADMISSION_REASON
		};
		const state = await this.whenReady();
		if (this.closed) return {
			kind: "refused",
			reason: NO_ADMISSION_REASON
		};
		if (state.kind !== "ready") return {
			kind: "refused",
			reason: state.reason
		};
		const existing = state.store.get(intent.root.id, intent.target);
		this.failures.delete(failureKey(intent.root.id, intent.target));
		if (existing !== void 0 && existing.lifecycle === "bound") return {
			kind: "refused",
			reason: `Teammate "${intent.target}" already identifies a preset-managed member of this Team (child "${existing.childSessionId ?? "unknown"}"); teammate names are never reused, so this creation is refused.`
		};
		const record = {
			schemaVersion: 1,
			intentId: randomUUID(),
			rootSessionId: intent.root.id,
			memberName: intent.target,
			teamId: intent.teamId,
			...intent.roleId === void 0 || intent.roleId === "" ? {} : { roleId: intent.roleId },
			displayName: intent.displayName,
			roleDescription: intent.roleDescription,
			persona: intent.persona,
			teamSection: intent.teamSection,
			roster: intent.roster.map((entry) => ({ ...entry })),
			...intent.route === void 0 ? {} : { route: { ...intent.route } },
			policy: {
				mode: intent.policy.mode,
				allow: [...intent.policy.allow]
			},
			spawnContext: intent.spawnContext,
			lifecycle: "intent",
			updatedAt: Date.now()
		};
		try {
			await state.store.put(record);
		} catch (error) {
			return {
				kind: "refused",
				reason: `the member configuration snapshot could not be persisted: ${String(error)}`
			};
		}
		return {
			kind: "ready",
			record
		};
	}
	/**
	* Claim one Agent on its creation edge and install every scoped registration.
	*
	* `managed` is the durable identity this plugin's own execution aliases give
	* the child: the caller reads it from the child's establishing descriptor, and
	* it is what makes an unreadable or missing snapshot a refusal instead of
	* "not ours". An Agent with neither marker nor snapshot is left entirely
	* alone: native Teams, ordinary subagents, and provider-owned workers stay
	* upstream-owned, which is also the documented fate of a member an earlier
	* plugin version created before the marker existed.
	* @param agent - the Agent entering the registry.
	* @param membership - its resolved Team identity.
	* @param managed - whether the child's own establishing descriptor carries this plugin's member backend.
	* @returns whether the member was installed, is not plugin-managed, or is managed but unusable.
	* @throws when a managed member's scopes cannot be installed completely.
	*/
	claim(agent, membership, managed) {
		const installed = this.installations.get(agent);
		if (installed !== void 0) return {
			kind: "installed",
			record: installed.record
		};
		const state = this.state;
		if (state === void 0 || state.kind !== "ready") return managed ? {
			kind: "invalid",
			reason: `${NO_STORE_REASON} The Host records teammate "${membership.name}" as created through this plugin's member backend, so it is refused instead of resuming without its frozen configuration.`
		} : { kind: "unmanaged" };
		const record = state.store.get(membership.root.id, membership.name);
		if (record === void 0) return managed ? {
			kind: "invalid",
			reason: `The Host records teammate "${membership.name}" as created through this plugin's member backend, but no frozen configuration snapshot for it can be read. Refusing to run it on default configuration.`
		} : { kind: "unmanaged" };
		if (record.rootSessionId !== membership.root.id || record.memberName !== membership.name) return {
			kind: "invalid",
			reason: `the stored configuration snapshot for teammate "${membership.name}" does not belong to Session "${membership.root.id}"; refusing to create it rather than running it on default configuration.`
		};
		if (record.lifecycle === "failed") return {
			kind: "invalid",
			reason: `the stored configuration snapshot for teammate "${membership.name}" records a creation that produced no child; refusing to run a different child under that identity.`
		};
		if (record.childSessionId !== void 0 && record.childSessionId !== agent.id) return {
			kind: "invalid",
			reason: `the stored configuration snapshot for teammate "${membership.name}" is bound to child Session "${record.childSessionId}", not to this Agent "${agent.id}"; refusing to rebind a member to another child.`
		};
		const observeFailure = agent.ctx.on("agent/error", ({ error }) => {
			this.failures.set(failureKey(membership.root.id, membership.name), String(error));
		});
		let dispose;
		try {
			dispose = installMemberScopes(agent, record);
		} catch (error) {
			observeFailure();
			throw error;
		}
		this.installations.set(agent, {
			record,
			dispose: () => {
				observeFailure();
				dispose();
			}
		});
		return {
			kind: "installed",
			record
		};
	}
	/**
	* Read the newest failure one member's own turn reported.
	* @param rootSessionId - the Team Lead Session identity.
	* @param memberName - the exact teammate target.
	* @returns the captured failure text, or undefined when the member reported none.
	*/
	failureOf(rootSessionId, memberName) {
		return this.failures.get(failureKey(rootSessionId, memberName));
	}
	/**
	* Bind one created child Session to its durable snapshot.
	*
	* The snapshot was already durable before creation, so this write is
	* bookkeeping: a failure is reported and the member keeps running under the
	* configuration the snapshot already fixed.
	* @param agent - the created child Agent.
	* @param membership - its resolved Team identity.
	*/
	async bind(agent, membership) {
		const state = this.state;
		if (state === void 0 || state.kind !== "ready") return;
		const current = state.store.get(membership.root.id, membership.name);
		if (current === void 0 || current.childSessionId === agent.id) return;
		try {
			await state.store.put({
				...current,
				lifecycle: "bound",
				childSessionId: agent.id,
				updatedAt: Date.now()
			});
		} catch (error) {
			this.ctx.logger.warn(`${LOG$1}: could not bind child "%s" to its member snapshot; the snapshot recorded before creation still governs it: %s`, agent.id, String(error));
		}
	}
	/**
	* Mark one creation attempt as having produced no child.
	* @param rootSessionId - the Team Lead Session identity.
	* @param memberName - the exact teammate target.
	*/
	async markFailed(rootSessionId, memberName) {
		const state = this.state;
		if (state === void 0 || state.kind !== "ready") return;
		const current = state.store.get(rootSessionId, memberName);
		if (current === void 0 || current.lifecycle !== "intent") return;
		try {
			await state.store.put({
				...current,
				lifecycle: "failed",
				updatedAt: Date.now()
			});
		} catch (error) {
			this.ctx.logger.warn(`${LOG$1}: could not record the failed creation of teammate "%s": %s`, memberName, String(error));
		}
	}
	/**
	* Read the snapshot one Agent was installed from.
	* @param agent - a live Agent.
	* @returns its frozen record, or undefined when this Agent is not managed here.
	*/
	recordFor(agent) {
		return this.installations.get(agent)?.record;
	}
	/**
	* Release one Agent's scoped registrations.
	* @param agent - the Agent leaving the registry.
	* @returns whether this Agent had managed registrations to release.
	*/
	release(agent) {
		const installation = this.installations.get(agent);
		if (installation === void 0) return false;
		this.installations.delete(agent);
		installation.dispose();
		return true;
	}
	/** Release every registration this activation installed. */
	releaseAll() {
		for (const agent of [...this.installations.keys()]) this.release(agent);
	}
	/** Number of live residencies currently carrying managed registrations. */
	get installedCount() {
		return this.installations.size;
	}
	/**
	* Release every registration and close the durable unit.
	* @returns resolution after the unit is released.
	*/
	/**
	* Run one whole member-creation transaction under this activation's admission.
	*
	* Closing admission is what stops a late tool call from starting a new member
	* that nothing would own: the transaction is tracked from its first
	* synchronous step until it settles, so an unloading activation can wait for
	* it instead of racing it.
	* @param operation - the whole creation transaction.
	* @returns the operation's result.
	* @throws when this activation no longer admits new members.
	*/
	async admit(operation) {
		if (this.closed) throw new Error(NO_ADMISSION_REASON);
		const running = Promise.resolve().then(operation);
		this.inFlight.add(running);
		try {
			return await running;
		} finally {
			this.inFlight.delete(running);
		}
	}
	/** Whether a new member-creation transaction may still start. */
	get admissionOpen() {
		return !this.closed;
	}
	/**
	* Stop admitting creations and wait for every admitted transaction to settle.
	*
	* This is the first teardown step, before any live residency is touched: the
	* live scopes stay registered on `agent.ctx` until their own Agent is
	* disposed, so no member is ever left running without the policy it was
	* created under.
	* @returns resolution once no creation is still in flight.
	*/
	async closeAdmission() {
		this.closed = true;
		while (this.inFlight.size > 0) await Promise.allSettled([...this.inFlight]);
	}
	/**
	* Close creation admission and release the durable unit.
	*
	* Live residencies are deliberately NOT released here: their registrations
	* belong to `agent.ctx`, which outlives a plugin activation, and a member that
	* keeps running after an unload must keep the strict policy it was created
	* with. Callers that really are tearing the Agents down release them through
	* {@link releaseAll} or through the Agent's own disposal.
	* @returns resolution after the unit is released.
	*/
	async close() {
		await this.closeAdmission();
		this.failures.clear();
		const state = this.state;
		this.state = void 0;
		if (state?.kind === "ready") await state.store.close();
	}
};
/**
* Install one managed member's complete scoped configuration atomically.
*
* The persona section deliberately reuses the deployment persona slot: a
* member's own standing prompt REPLACES the deployment persona for that member
* alone, exactly as an Agent preset does, instead of being appended beside a
* conflicting one. The team-context section is plugin-namespaced and carries
* the frozen division of labour. The strict guard is installed beside the
* visibility restriction, because an allow-list that only hides tools is not a
* permission boundary: nested PTC dispatch and own-layer tools still reach the
* executor.
* @param agent - the member Agent being initialized.
* @param record - its frozen snapshot.
* @returns the disposer releasing every registration it installed.
* @throws when any registration fails, after rolling the partial install back.
*/
function installMemberScopes(agent, record) {
	const disposers = [];
	try {
		if (record.route !== void 0) disposers.push(installModelSelection(agent.ctx, {
			current: {
				provider: record.route.provider,
				model: record.route.model,
				...record.route.reasoningEffort === void 0 ? {} : { reasoningEffort: ReasoningEffortId(record.route.reasoningEffort) }
			},
			assembled: void 0
		}));
		if (record.persona.trim() !== "") disposers.push(agent.ctx.systemPrompt.section({
			name: PERSONA_PREFIX_SECTION,
			order: agent.ctx.systemPrompt.getSectionOrder("DEPLOYMENT_PERSONA_PREFIX"),
			text: record.persona
		}));
		if (record.teamSection.trim() !== "") disposers.push(agent.ctx.systemPrompt.section({
			name: MEMBER_TEAM_SECTION,
			order: agent.ctx.systemPrompt.getSectionOrder("TEAM_POLICY"),
			text: record.teamSection
		}));
		const policy = {
			teamId: record.teamId,
			mode: record.policy.mode,
			allow: [...record.policy.allow]
		};
		if (policy.mode === "custom") disposers.push(installNativePresentation(agent));
		disposers.push(guardPolicy(agent, policy, {
			role: "member",
			presentation: "caller"
		}));
		const filter = inheritedFilter(agent, policy);
		if (filter !== void 0) disposers.push(agent.ctx.tools.restrict(filter));
	} catch (error) {
		for (const dispose of disposers.reverse()) dispose();
		throw error;
	}
	return () => {
		for (const dispose of disposers.splice(0).reverse()) dispose();
	};
}


/**
* Fixed JSON transfer format for one Team preset.
*
* A shared document carries the parts of a Team that keep working after the
* document moves to another deployment: the Team's own name and purpose, and
* each agent's name, description, standing system prompt, and accent color.
* Model routes and tool permissions stay local, because a route names a
* provider this deployment may not run and an allow-list names tools it may not
* expose. A document that carries them is refused rather than silently reduced,
* so a reader never believes it imported something it did not.
*
* The format is deliberately not the stored record: the Host document keeps
* `toolMode`, `tools`, `provider`, `model`, and `reasoningEffort` beside the
* shared fields, and an import writes only the fields a document carries.
* @module dsh-agent-team-presets/preset-transfer
*/
/** Format marker every shareable Team document carries. */
const TEAM_PRESET_FORMAT = "dsh-agent-team-preset";
/**
* Build one captain from a shared slot.
* @param slot - the shared captain.
* @returns a captain carrying the shared fields and the local defaults.
*/
function captainFromTransfer(slot) {
	return {
		name: slot.name,
		color: slot.color,
		description: slot.description,
		toolMode: "all",
		tools: [],
		systemPrompt: slot.systemPrompt
	};
}
/** Every shipped preset, lightest first, in the order a fresh deployment lists them. */
const BUILTIN_TEAMS = [
	{
		id: "builtin-lightweight",
		document: {
			format: TEAM_PRESET_FORMAT,
			version: 1,
			team: {
				name: "轻量研发团队",
				description: "适合小型功能与模块迭代。队长划分任务，架构顾问按需处理技术决策，研发执行者承担编码、调试、测试与修复。",
				captain: {
					name: "team-lead",
					description: "确定目标、任务写入边界和验收证据，按需调度与最终风险裁决。",
					systemPrompt: "你是工程团队队长，负责范围、调度、依赖、风险和最终验收。具体实现交执行者，专业决策咨询对应顾问。\n1. 仅在用户明确要求团队协作时召集成员；先确认目标平台、项目规则、权限与实际可用工具、验收标准。不得假定服务、浏览器或设备可用，不索取明文秘密。\n2. 任务板按切片记录交付物、验收、依赖、负责人及文件写入范围；仅并行互不冲突的工作。接口契约未确定不得盲目实现；已有任务不重复派发，以消息和状态事件推进，避免空转查询。\n3. 按任务召集 executor 完成实现和验证；涉及新模块、跨层契约或关键技术阻塞时，再咨询 fullstack-advisor。顾问不参与常规调试循环，队长依据测试证据验收。\n4. 交接优先使用变更路径、简要差异、测试命令和结果、证据位置、待决风险；详情按需读取，不要求复制完整日志。共享浏览器实行单操作者交接；视觉结论需实际查看落盘截图，缺少证据则标记未验证。\n5. 高风险问题修复后复验；同一问题两轮未解决须重新分析根因。必要验收缺证据不得放行；仍有运行中成员或未闭环任务时不得宣布完成。\n6. 最终汇总交付内容、验证结果、未验证项及风险。Git 暂存与提交遵守项目规则和用户授权；push、发布、改写历史分别取得授权。成员默认不继续委派，例外需明确授权并确认工具支持及隔离范围。",
					color: "#4c8dff"
				},
				members: [{
					name: "fullstack-advisor",
					description: "按需提供跨层技术方案与可执行验收契约，不负责具体编码。",
					systemPrompt: "你是全栈架构顾问，负责技术方案与实施契约，不修改生产代码、测试或生成脚本。\n1. 围绕具体问题查阅项目规则、相关实现与必要文档，沿用既有技术栈，不扩大重构范围。\n2. 按需确定模块边界、数据流、接口字段与错误语义，并提示涉及的权限、安全、迁移兼容及性能风险；列出假设和待决事项。\n3. 输出给执行者的简洁契约：关键决定、关联文件或接口、验收条件、阻塞及风险。仅在关键技术取舍、方案变更或明确阻塞时重新介入。\n4. 只写获指派的契约文档；静态分析不能冒充运行验证。默认不继续委派，也不接管常规编码、调试和测试。",
					color: "#e0a43c"
				}, {
					name: "executor",
					description: "负责具体编码、调试、测试、修复与验证交接。",
					systemPrompt: "你是研发执行者，负责获派范围的编码、调试、测试、修复和必要生成脚本。\n1. 先核对任务、项目规则、相关实现、接口契约、文件归属与验收要求；业务歧义交队长澄清，不自行补造规则。\n2. 按最小可验证切片实施，覆盖必要校验、错误处理和回归测试；遵循现有技术栈，不改无关文件或覆盖他人产物。默认不继续委派。\n3. 运行适用的 lint、测试、构建和必要的真实链路，记录命令、结果、失败原因与验证范围；mock 通过不能替代关键真实路径。重要修复补负例，测试失败不得报通过。\n4. 每个检查点交接变更路径、简要差异、测试证据、风险与待决事项；长日志只传位置。按审查意见定点修复，同一问题两轮失败则报告根因并交队长协调。\n5. 生成物按项目流程产生，不手改；提交前核对暂存范围并遵守授权，push 与发布另需授权。浏览器或设备操作先确认能力及交接；视觉相关任务保留页面、视口、状态和落盘截图，未实际验证不宣称通过。",
					color: "#4c8dff"
				}]
			}
		}
	},
	{
		id: "builtin-standard",
		document: {
			format: TEAM_PRESET_FORMAT,
			version: 1,
			team: {
				name: "标准研发团队",
				description: "适合中型功能、重要重构与持续项目迭代。队长统筹、架构顾问按需咨询、执行者持续研发，独立审查员检查变更与验证证据。",
				captain: {
					name: "team-lead",
					description: "确定目标、任务写入边界和验收证据，按需调度与最终风险裁决。",
					systemPrompt: "你是工程团队队长，负责范围、调度、依赖、风险和最终验收。具体实现交执行者，专业决策咨询对应顾问。\n1. 仅在用户明确要求团队协作时召集成员；先确认目标平台、项目规则、权限与实际可用工具、验收标准。不得假定服务、浏览器或设备可用，不索取明文秘密。\n2. 任务板按切片记录交付物、验收、依赖、负责人及文件写入范围；仅并行互不冲突的工作。接口契约未确定不得盲目实现；已有任务不重复派发，以消息和状态事件推进，避免空转查询。\n3. executor 承担实现与测试；关键设计问题咨询 fullstack-advisor；reviewer 对有代码变更的交付开展独立审查，高风险切片提前介入，修复后聚焦复审，避免重复全量审查。\n4. 交接优先使用变更路径、简要差异、测试命令和结果、证据位置、待决风险；详情按需读取，不要求复制完整日志。共享浏览器实行单操作者交接；视觉结论需实际查看落盘截图，缺少证据则标记未验证。\n5. 高风险问题修复后复验；同一问题两轮未解决须重新分析根因。必要验收缺证据不得放行；仍有运行中成员或未闭环任务时不得宣布完成。\n6. 最终汇总交付内容、验证结果、未验证项及风险。Git 暂存与提交遵守项目规则和用户授权；push、发布、改写历史分别取得授权。成员默认不继续委派，例外需明确授权并确认工具支持及隔离范围。",
					color: "#4c8dff"
				},
				members: [
					{
						name: "fullstack-advisor",
						description: "按需提供跨层技术方案与可执行验收契约，不负责具体编码。",
						systemPrompt: "你是全栈架构顾问，负责技术方案与实施契约，不修改生产代码、测试或生成脚本。\n1. 围绕具体问题查阅项目规则、相关实现与必要文档，沿用既有技术栈，不扩大重构范围。\n2. 按需确定模块边界、数据流、接口字段与错误语义，并提示涉及的权限、安全、迁移兼容及性能风险；列出假设和待决事项。\n3. 输出给执行者的简洁契约：关键决定、关联文件或接口、验收条件、阻塞及风险。仅在关键技术取舍、方案变更或明确阻塞时重新介入。\n4. 只写获指派的契约文档；静态分析不能冒充运行验证。默认不继续委派，也不接管常规编码、调试和测试。",
						color: "#e0a43c"
					},
					{
						name: "reviewer",
						description: "独立审查实际变更、关键风险与测试有效性。",
						systemPrompt: "你是独立代码审查员，不修改共享生产实现，不以成员自评取代证据。\n1. 围绕实际变更、关键调用链与约定的验收契约审查功能、安全权限、并发、兼容迁移和重要界面状态；不无目的扫描全仓。\n2. 确认测试到达目标路径、关键断言能捕获缺陷；mock、全绿和静态检查均不自动等于真实验证。独立复跑前确认权限与隔离范围，不污染共享文件。\n3. 将发现区分为已证实缺陷、待验证风险与建议；按 P0/P1/P2/P3 报告位置、触发条件、影响、证据和最小修复建议。复审聚焦修复差异与相关回归。\n4. 视觉判断需亲自读取实际截图；设计争议交队长协调。结论为通过、需修改或证据不足；必要项未验证不得放行，风险接受交队长裁决。默认不继续委派。",
						color: "#8d6bff"
					},
					{
						name: "executor",
						description: "负责具体编码、调试、测试、修复与验证交接。",
						systemPrompt: "你是研发执行者，负责获派范围的编码、调试、测试、修复和必要生成脚本。\n1. 先核对任务、项目规则、相关实现、接口契约、文件归属与验收要求；业务歧义交队长澄清，不自行补造规则。\n2. 按最小可验证切片实施，覆盖必要校验、错误处理和回归测试；遵循现有技术栈，不改无关文件或覆盖他人产物。默认不继续委派。\n3. 运行适用的 lint、测试、构建和必要的真实链路，记录命令、结果、失败原因与验证范围；mock 通过不能替代关键真实路径。重要修复补负例，测试失败不得报通过。\n4. 每个检查点交接变更路径、简要差异、测试证据、风险与待决事项；长日志只传位置。按审查意见定点修复，同一问题两轮失败则报告根因并交队长协调。\n5. 生成物按项目流程产生，不手改；提交前核对暂存范围并遵守授权，push 与发布另需授权。浏览器或设备操作先确认能力及交接；视觉相关任务保留页面、视口、状态和落盘截图，未实际验证不宣称通过。",
						color: "#4c8dff"
					}
				]
			}
		}
	},
	{
		id: "builtin-fullstack",
		document: {
			format: TEAM_PRESET_FORMAT,
			version: 1,
			team: {
				name: "全栈软件研发团队",
				description: "面向复杂的 Web、桌面与 Android 工程。队长调度并验收，架构与设计顾问制定技术契约，独立审查员验证质量，执行者负责开发测试；按风险召集成员并按切片交接。",
				captain: {
					name: "team-lead",
					description: "确定目标、任务写入边界和验收证据，按需调度与最终风险裁决。",
					systemPrompt: "你是工程团队队长，负责范围、调度、依赖、风险和最终验收。具体实现交执行者，专业决策咨询对应顾问。\n1. 仅在用户明确要求团队协作时召集成员；先确认目标平台、项目规则、权限与实际可用工具、验收标准。不得假定服务、浏览器或设备可用，不索取明文秘密。\n2. 任务板按切片记录交付物、验收、依赖、负责人及文件写入范围；仅并行互不冲突的工作。接口契约未确定不得盲目实现；已有任务不重复派发，以消息和状态事件推进，避免空转查询。\n3. executor 持续实施、调试与测试；接口、安全或系统设计风险咨询 backend-architect；新交互或视觉争议咨询 ui-designer；reviewer 负责高风险阶段与交付前独立审查。顾问按需参与，不默认全员并行。\n4. 交接优先使用变更路径、简要差异、测试命令和结果、证据位置、待决风险；详情按需读取，不要求复制完整日志。共享浏览器实行单操作者交接；视觉结论需实际查看落盘截图，缺少证据则标记未验证。\n5. 高风险问题修复后复验；同一问题两轮未解决须重新分析根因。必要验收缺证据不得放行；仍有运行中成员或未闭环任务时不得宣布完成。\n6. 最终汇总交付内容、验证结果、未验证项及风险。Git 暂存与提交遵守项目规则和用户授权；push、发布、改写历史分别取得授权。成员默认不继续委派，例外需明确授权并确认工具支持及隔离范围。",
					color: "#4c8dff"
				},
				members: [
					{
						name: "backend-architect",
						description: "制定后端与系统技术契约，评估关键风险与兼容性。",
						systemPrompt: "你是后端与系统架构顾问，负责技术契约与关键风险，不修改生产代码、测试或生成脚本。\n1. 按任务读取相关调用链与项目约定，延续现有架构，不因局部需求扩展无关设计。\n2. 给出必要的模块边界、API/数据契约、错误语义、鉴权隔离、迁移兼容和性能约束；与 ui-designer 对齐业务状态和反馈。\n3. 交付可实施的简洁契约、涉及路径、验收条件、假设与风险；实现后仅按需核对关键路径，静态检查不得冒充运行验证。\n4. 只写获指派的契约资料，未落地内容标为待完成；生成物由执行者按项目规则产生。默认不继续委派，也不接管日常编码调试。",
						color: "#e0a43c"
					},
					{
						name: "ui-designer",
						description: "制定交互与视觉验收规范，基于真实截图裁定偏差。",
						systemPrompt: "你是 UI/UX 设计顾问，负责交互规范与视觉裁定，不修改生产页面、样式或共享测试。\n1. 读取相关页面、组件、设计令牌与项目规则，延续现有风格，不扩大设计范围。按需覆盖流程、加载/空/错误/校验状态及响应式、无障碍与跨端差异。\n2. 与 backend-architect 对齐字段、状态及错误反馈，交付精简交互规格、涉及页面和可验证验收清单；具体开发交执行者。\n3. 视觉裁定前须亲自用可用图像工具读取落盘截图，记录页面、视口、状态、路径和可见偏差；没有截图或无法读图就标未验证，不以源码或文字替代像素证据。\n4. 获指派后方可操作共享浏览器，遵守单操作者交接；报告裁定、证据和待修问题。只写获指派文档，默认不继续委派。",
						color: "#2fbf71"
					},
					{
						name: "reviewer",
						description: "独立审查实际变更、关键风险与测试有效性。",
						systemPrompt: "你是独立代码审查员，不修改共享生产实现，不以成员自评取代证据。\n1. 围绕实际变更、关键调用链与约定的验收契约审查功能、安全权限、并发、兼容迁移和重要界面状态；不无目的扫描全仓。\n2. 确认测试到达目标路径、关键断言能捕获缺陷；mock、全绿和静态检查均不自动等于真实验证。独立复跑前确认权限与隔离范围，不污染共享文件。\n3. 将发现区分为已证实缺陷、待验证风险与建议；按 P0/P1/P2/P3 报告位置、触发条件、影响、证据和最小修复建议。复审聚焦修复差异与相关回归。\n4. 视觉判断需亲自读取实际截图；视觉设计取舍由 ui-designer 裁定，自己负责独立质量判断。结论为通过、需修改或证据不足；必要项未验证不得放行，风险接受交队长裁决。默认不继续委派。",
						color: "#8d6bff"
					},
					{
						name: "executor",
						description: "负责具体编码、调试、测试、修复与验证交接。",
						systemPrompt: "你是研发执行者，负责获派范围的编码、调试、测试、修复和必要生成脚本。\n1. 先核对任务、项目规则、相关实现、接口契约、文件归属与验收要求；业务歧义交队长澄清，不自行补造规则。\n2. 按最小可验证切片实施，覆盖必要校验、错误处理和回归测试；遵循现有技术栈，不改无关文件或覆盖他人产物。默认不继续委派。\n3. 运行适用的 lint、测试、构建和必要的真实链路，记录命令、结果、失败原因与验证范围；mock 通过不能替代关键真实路径。重要修复补负例，测试失败不得报通过。\n4. 每个检查点交接变更路径、简要差异、测试证据、风险与待决事项；长日志只传位置。按审查意见定点修复，同一问题两轮失败则报告根因并交队长协调。\n5. 生成物按项目流程产生，不手改；提交前核对暂存范围并遵守授权，push 与发布另需授权。浏览器或设备操作先确认能力及交接；视觉相关任务保留页面、视口、状态和落盘截图，未实际验证不宣称通过。",
						color: "#4c8dff"
					}
				]
			}
		}
	}
];
BUILTIN_TEAMS.map((entry) => entry.id);
/**
* Stable role identity of one shipped member.
*
* A member's `id` is the identity a durable member snapshot binds to and the one
* the runtime re-reads a route through, so a shipped member is stored under a
* derived identity rather than a random one: restoring the preset a second time
* addresses the same role instead of creating a second one.
* @param teamId - identity of the shipped Team that owns the member.
* @param name - the member's name in the document.
* @param index - the member's position, used only when the document names none.
* @returns the role identity a shipped member is stored under.
*/
function memberRoleId(teamId, name, index) {
	const label = name.trim();
	return `${teamId}:${label === "" ? String(index + 1) : label}`;
}
/**
* Build one member from a shipped document slot.
* @param teamId - identity of the shipped Team that owns the member.
* @param slot - the member's shareable fields.
* @param index - the member's position in the document.
* @returns a fresh member carrying the shared fields, no route, and the default tool policy.
*/
function memberFromDocument(teamId, slot, index) {
	return {
		...captainFromTransfer(slot),
		id: memberRoleId(teamId, slot.name, index),
		provider: "",
		model: "",
		reasoningEffort: ""
	};
}
/**
* Build the preset one shipped document describes.
*
* Everything the document does not carry starts empty, exactly as an import
* starts: the route follows the Session and the tool policy stays unrestricted.
* @param entry - the shipped Team to materialize.
* @returns a fresh preset carrying the document's content.
*/
function builtinTeamDefinition(entry) {
	return {
		id: entry.id,
		name: entry.document.team.name,
		description: entry.document.team.description,
		captain: captainFromTransfer(entry.document.team.captain),
		members: entry.document.team.members.map((slot, index) => memberFromDocument(entry.id, slot, index))
	};
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
function seedBuiltinTeams(teams, seeded) {
	const held = new Set(teams.map((team) => team.id));
	const known = new Set(seeded);
	const install = BUILTIN_TEAMS.filter((entry) => !held.has(entry.id) && !known.has(entry.id));
	const mark = BUILTIN_TEAMS.filter((entry) => (held.has(entry.id) || install.includes(entry)) && !known.has(entry.id));
	return {
		teams: install.length === 0 ? [...teams] : [...teams, ...install.map((entry) => builtinTeamDefinition(entry))],
		seeded: mark.length === 0 ? [...seeded] : [...seeded, ...mark.map((entry) => entry.id)],
		changed: install.length > 0 || mark.length > 0
	};
}


/**
* Live Host configuration of the Agent Team presets plugin.
*
* Both fields are volatile, so a Settings write commits into the running
* references without remounting the plugin and emits `loader/volatile-update`
* to this fiber's context.
* @module dsh-agent-team-presets/config
*/
/** Fields every Team slot stores, whether it is the captain or one member. */
const teamSlotFields = {
	name: z.string().default(""),
	color: z.string().default(""),
	description: z.string().default(""),
	toolMode: z.union(["all", "custom"]),
	tools: z.array(z.string()).default([]),
	systemPrompt: z.string().default("")
};
/** The captain leads the Session, so it stores no route of its own. */
const captainSchema = z.object(teamSlotFields);
/** A member stores the route it runs on. */
const memberSchema = z.object({
	...teamSlotFields,
	id: z.string(),
	provider: z.string().default(""),
	model: z.string().default(""),
	reasoningEffort: z.string().default("")
});
const teamSchema = z.object({
	id: z.string().required(),
	name: z.string().default(""),
	description: z.string().default(""),
	captain: captainSchema,
	members: z.array(memberSchema).default([])
});
const selectionSchema = z.object({
	sessionId: z.string().required(),
	teamId: z.string().required()
});
/** Captain members that named a route before the Session owned the model. */
const LEGACY_CAPTAIN_ROUTE_KEYS = [
	"provider",
	"model",
	"reasoningEffort"
];
/**
* Whether one loaded captain still carries a route of its own.
*
* Schemastery merges members its schema does not declare, so a Team stored
* before captains stopped owning a route still arrives with these keys.
* @param captain - one loaded captain.
* @returns whether any former route member survived loading.
*/
function hasLegacyCaptainRoute(captain) {
	return LEGACY_CAPTAIN_ROUTE_KEYS.some((key) => key in captain);
}
/**
* Rebuild one Team with every captain reduced to the fields a captain owns.
* @param team - one loaded Team preset.
* @returns the Team whose captain carries no route, or the input when it had none.
*/
function withoutCaptainRoute(team) {
	if (!hasLegacyCaptainRoute(team.captain)) return team;
	const captain = {
		...team.captain,
		toolMode: toolMode(team.captain)
	};
	for (const key of LEGACY_CAPTAIN_ROUTE_KEYS) delete captain[key];
	return {
		...team,
		captain
	};
}
/**
* Reduce every Team of one configuration to captains without a route.
* @param teams - every loaded Team preset.
* @returns the same Teams, with a rebuilt captain wherever a route was stored.
*/
function withoutCaptainRoutes(teams) {
	return teams.map(withoutCaptainRoute);
}
/** Runtime schema of {@link Config}. */
const Config = z.object({
	teams: z.array(teamSchema).default([]).volatile(),
	selections: z.array(selectionSchema).default([]).volatile(),
	seededDefaults: z.array(z.string()).default([]).volatile(),
	freshProvider: z.string().default("spawn"),
	forkProvider: z.string().default("fork")
});


/**
* Minimal, revision-fenced reconcile of this plugin's own settings document.
*
* One startup pass owns every repair the plugin makes to the stored Teams,
* because they all rewrite the same `teams` array and two writers would race
* each other's revision fence:
*
* - the legacy captain route, which no current schema declares,
* - a member identity a stored record never carried,
* - the shipped default presets, installed once per deployment.
*
* The pass never touches Session policy, and it writes only when a repair
* really applies. Read-only and conflict errors are not retried for the same
* document: the caller notifies again when the document, the Teams value, or the
* shipped-defaults marker changes.
* @module dsh-agent-team-presets/settings-reconcile
*/
/** Coalesce startup/config edges into one in-flight write and one latest recheck. */
function teamSettingsReconcile(ctx, config, namespace) {
	let disposed = false;
	let running = false;
	let requested = false;
	let attempted;
	return {
		async request() {
			if (disposed) return;
			if (running) {
				requested = true;
				return;
			}
			running = true;
			try {
				do {
					requested = false;
					if (disposed) break;
					const descriptor = ctx.settings.describe().find((row) => row.ns === namespace);
					if (descriptor === void 0) break;
					const teams = config.teams.get();
					const seeded = config.seededDefaults.get();
					const cleaned = withoutCaptainRoutes(teams).map((team) => {
						const used = /* @__PURE__ */ new Set();
						let changed = false;
						const members = team.members.map((member) => {
							if (member.id !== void 0 && member.id !== "" && !used.has(member.id)) {
								used.add(member.id);
								return member;
							}
							changed = true;
							const id = randomUUID();
							used.add(id);
							return {
								...member,
								id
							};
						});
						return changed ? {
							...team,
							members
						} : team;
					});
					const installed = seedBuiltinTeams(cleaned, seeded);
					if (!(cleaned.length !== teams.length || cleaned.some((team, index) => team !== teams[index])) && !installed.changed) continue;
					const identity = JSON.stringify([
						descriptor.revision,
						teams,
						seeded
					]);
					if (identity === attempted) continue;
					attempted = identity;
					try {
						await ctx.settings.update(namespace, {
							teams: installed.teams,
							seededDefaults: [...installed.seeded]
						}, descriptor.revision);
					} catch (error) {
						ctx.logger.warn("agent-team-presets: settings reconcile refused; normal Sessions remain unaffected: %s", String(error));
					}
				} while (requested && !disposed);
			} catch (error) {
				ctx.logger.warn("agent-team-presets: could not prepare settings reconcile; normal Sessions remain unaffected: %s", String(error));
			} finally {
				running = false;
			}
		},
		dispose() {
			disposed = true;
			requested = false;
		}
	};
}


/**
* Live Team execution state for the settings page.
*
* A saved Team change reaches an idle Session right away and a Session whose
* Team task is running only before its next Team task, so the page can promise
* nothing until it knows which Teams are executing. This monitor answers that
* from the same facts the freezer uses — the captain's status and the roster's
* teammate phases — and publishes whole-set frames, never a delta, so a
* consumer that missed a frame is still correct after the next one.
*
* The frame carries identities and counts only: no persona, session name, or
* session content ever leaves the Host.
* @module dsh-agent-team-presets/execution
*/
/**
* Whether one Agent is a top-level Session agent this plugin composes.
* @param agent - the Agent whose Session origin decides it.
* @returns whether that Agent is a Session root rather than a teammate.
*/
function isSessionRoot(agent) {
	return agent.session.header.origin !== "subagent";
}
/**
* Whether any teammate of one Session is still running or provisioning.
*
* A teammate whose child has not been created yet has no `agent/status` of its
* own, so the roster — which folds the durable `team/member` events — is the
* authority here rather than the Agent registry. The captain is not counted:
* its own status is the other half of the same question.
* @param ctx - host context carrying the Team service.
* @param agent - the Session-root Agent to inspect.
* @returns whether a teammate is still working on that Session's Team task.
*/
function teammatesBusy(ctx, agent) {
	if (ctx.agentTeams.tryMembership(agent) === void 0) return false;
	return ctx.agentTeams.listMembers(agent).some((member) => member.role === "teammate" && (member.status === "running" || member.status === "provisioning"));
}
/** One open consumer of the whole-set frames. */
var FrameQueue = class {
	queue = [];
	sent;
	wake;
	closed = false;
	/**
	* Offer one computed frame.
	*
	* An unchanged frame is dropped: the stream reports state, so a consumer that
	* already holds it needs no second copy.
	* @param frame - the whole-set frame just computed.
	*/
	offer(frame) {
		if (this.closed) return;
		const encoded = JSON.stringify(frame);
		if (encoded === this.sent) return;
		this.sent = encoded;
		this.queue.splice(0, this.queue.length, frame);
		const wake = this.wake;
		this.wake = void 0;
		wake?.();
	}
	/** Release the consumer, dropping anything it has not read. */
	close() {
		this.closed = true;
		this.queue.length = 0;
		const wake = this.wake;
		this.wake = void 0;
		wake?.();
	}
	/** @returns the next unread frame, or undefined once closed and drained. */
	async take() {
		while (this.queue.length === 0) {
			if (this.closed) return void 0;
			await new Promise((resolve) => {
				this.wake = resolve;
			});
		}
		return this.queue.shift();
	}
};
/** Publishes whole-set Team execution frames to the settings page. */
var TeamExecutionMonitor = class {
	ctx;
	sources;
	subscribers = /* @__PURE__ */ new Set();
	scheduled = false;
	disposed = false;
	/**
	* @param ctx - host context carrying the Agent registry and Team service.
	* @param sources - live configuration and the applied-Team lookup.
	*/
	constructor(ctx, sources) {
		this.ctx = ctx;
		this.sources = sources;
	}
	/**
	* Publish the current frame after the next microtask.
	*
	* Several commits in one turn cost one frame, and a burst of lifecycle edges
	* is read once, after every listener of the commit that caused it has run.
	*/
	invalidate() {
		if (this.disposed || this.scheduled) return;
		this.scheduled = true;
		queueMicrotask(() => {
			this.scheduled = false;
			if (this.disposed || this.subscribers.size === 0) return;
			const frame = this.frame();
			for (const subscriber of [...this.subscribers]) subscriber.offer(frame);
		});
	}
	/**
	* Stream whole-set frames until the caller aborts.
	*
	* The subscription is in place before the first frame is computed, so a change
	* that lands while it is being sent is still delivered.
	* @param signal - cancellation owned by the Remote stream carrier.
	* @returns the frames, opening with the current state.
	*/
	async *stream(signal) {
		if (this.disposed || signal.aborted) return;
		const queue = new FrameQueue();
		this.subscribers.add(queue);
		const onAbort = () => {
			queue.close();
		};
		signal.addEventListener("abort", onAbort, { once: true });
		try {
			queue.offer(this.frame());
			for (;;) {
				const frame = await queue.take();
				if (frame === void 0) return;
				yield frame;
			}
		} finally {
			signal.removeEventListener("abort", onAbort);
			this.subscribers.delete(queue);
		}
	}
	/** Release every consumer; the stream ends without another frame. */
	dispose() {
		this.disposed = true;
		for (const subscriber of [...this.subscribers]) subscriber.close();
		this.subscribers.clear();
	}
	/**
	* Read the current execution state of every Team the Host can report.
	* @returns one row per configured or referenced Team, ordered by identity.
	*/
	frame() {
		const tallies = /* @__PURE__ */ new Map();
		const tally = (teamId) => {
			const existing = tallies.get(teamId);
			if (existing !== void 0) return existing;
			const created = {
				busy: 0,
				members: 0,
				pending: 0,
				unreadable: false,
				notes: /* @__PURE__ */ new Set()
			};
			tallies.set(teamId, created);
			return created;
		};
		const teams = this.sources.config.teams.get();
		for (const team of teams) tally(team.id);
		for (const agent of this.ctx.agents.list()) {
			if (!isSessionRoot(agent)) continue;
			const selected = selectedTeam(teams, this.sources.config.selections.get(), agent.session.id);
			const applied = this.sources.applied(agent);
			const referenced = /* @__PURE__ */ new Set();
			if (selected !== void 0) referenced.add(selected.id);
			if (applied !== void 0) referenced.add(applied.teamId);
			if (referenced.size === 0) continue;
			const readable = this.ctx.agentTeams.tryMembership(agent) !== void 0;
			const members = readable ? this.ctx.agentTeams.listMembers(agent).filter((member) => member.role === "teammate" && (member.status === "running" || member.status === "provisioning")).length : 0;
			const busy = agent.status === "running" || members > 0;
			const pending = applied === void 0 || selected === void 0 || applied.teamId !== selected.id || applied.fingerprint !== definitionFingerprint(selected);
			for (const teamId of referenced) {
				const row = tally(teamId);
				if (busy) row.busy += 1;
				if (!readable) row.unreadable = true;
				row.members += members;
				if (pending) row.pending += 1;
				if (applied?.teamId === teamId && applied.presentationNote !== void 0) row.notes.add(applied.presentationNote);
			}
		}
		return { teams: [...tallies.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([teamId, row]) => ({
			teamId,
			state: row.busy > 0 ? "busy" : row.unreadable ? "unknown" : "idle",
			busySessions: row.busy,
			executingMembers: row.members,
			pendingSessions: row.pending,
			notes: [...row.notes].sort((left, right) => left.localeCompare(right))
		})) };
	}
};
/** Refusal text for a call that names no editable field at all. */
const NO_FIELDS = "no editable field was supplied; pass team_description, captain_description, captain_system_prompt, or members";
/**
* Whether one edit supplies any editable field.
* @param edit - the requested edit.
* @returns whether the caller named at least one field or member entry.
*/
function suppliesField(edit) {
	return edit.description !== void 0 || edit.captainDescription !== void 0 || edit.captainSystemPrompt !== void 0 || (edit.members?.length ?? 0) > 0;
}
/**
* Apply one field edit to one Team preset.
*
* A member entry resolves exactly the way `spawn_team_member` resolves its
* `member` argument, so the name that summons a member is the name that edits
* it. Supplying a value the preset already holds is not a change: the path is
* left out of `changed`, and a call whose every value already matched returns
* an unchanged preset so the caller can skip the write.
* @param team - the stored preset to edit.
* @param edit - the fields to replace.
* @returns the next preset with the field paths it changed, or the refusal reason.
*/
function editTeamPreset(team, edit) {
	if (!suppliesField(edit)) return {
		ok: false,
		message: NO_FIELDS
	};
	const changed = [];
	let description = team.description;
	if (edit.description !== void 0 && edit.description !== description) {
		description = edit.description;
		changed.push("team.description");
	}
	const captain = { ...team.captain };
	if (edit.captainDescription !== void 0 && edit.captainDescription !== captain.description) {
		captain.description = edit.captainDescription;
		changed.push("captain.description");
	}
	if (edit.captainSystemPrompt !== void 0 && edit.captainSystemPrompt !== captain.systemPrompt) {
		captain.systemPrompt = edit.captainSystemPrompt;
		changed.push("captain.systemPrompt");
	}
	const members = team.members.map((member) => ({ ...member }));
	const roster = memberTargets({
		...team,
		members
	});
	for (const entry of edit.members ?? []) {
		const wanted = entry.member.trim();
		const at = roster.findIndex((row) => row.target === wanted.toLowerCase() || row.member.name.trim() === wanted);
		const row = roster[at];
		if (row === void 0) {
			const targets = roster.map((candidate) => candidate.target).join(", ");
			return {
				ok: false,
				message: `unknown Team member "${entry.member}"; available members: ${targets === "" ? "(none)" : targets}`
			};
		}
		const current = members[at] ?? row.member;
		const updated = { ...current };
		if (entry.description !== void 0) {
			if (entry.description.length > 200) return {
				ok: false,
				message: `member "${row.target}" description is ${String(entry.description.length)} characters; the teammate roster accepts at most ${String(200)}`
			};
			if (entry.description !== updated.description) {
				updated.description = entry.description;
				changed.push(`member:${row.target}.description`);
			}
		}
		if (entry.systemPrompt !== void 0 && entry.systemPrompt !== updated.systemPrompt) {
			updated.systemPrompt = entry.systemPrompt;
			changed.push(`member:${row.target}.systemPrompt`);
		}
		if (updated.description !== current.description || updated.systemPrompt !== current.systemPrompt) members[at] = updated;
	}
	return {
		ok: true,
		team: {
			...team,
			description,
			captain,
			members
		},
		changed
	};
}
/**
* The exact `{{name}}` group grammar `@deepseek-ai/dsh-system-prompt` interpolates.
* A `{{` without this shape is literal prose unless a later `}}` makes it malformed.
*/
const VARIABLE_GROUP = /^\{\{([^{}]*)\}\}/;
/** The exact variable-name grammar the prompt registry accepts. */
const VARIABLE_NAME = /^[a-z][a-z0-9_]*$/;
/**
* Report the first interpolation failure one candidate prompt text would cause.
*
* A Team prompt is registered as an interpolated prompt section (the captain's
* as the Session persona prefix, a member's as that teammate's persona), so a
* group that cannot resolve does not degrade the prompt — it fails the next
* request outright. A stored prompt is never revalidated before that request,
* which is why a preset write refuses one instead of persisting it while a
* Session is running. The scan mirrors the registry's own so the two agree.
* @param text - the candidate captain or member standing prompt.
* @param variables - the variables one assembly resolved for the calling Agent.
* @returns the failure text, or undefined when the text interpolates cleanly.
*/
function promptTemplateFailure(text, variables) {
	let last = 0;
	for (let open = text.indexOf("{{"); open >= 0; open = text.indexOf("{{", last)) {
		const group = VARIABLE_GROUP.exec(text.slice(open));
		if (group === null) {
			if (text.indexOf("}}", open + 2) >= 0) return `malformed prompt variable reference at "${text.slice(open, open + 16)}…": references are complete simple {{name}} groups`;
			last = open + 2;
			continue;
		}
		const name = group[1] ?? "";
		if (!VARIABLE_NAME.test(name)) return `malformed prompt variable reference "{{${name}}}": variable names match ${String(VARIABLE_NAME)}`;
		if (!Object.hasOwn(variables, name)) {
			const known = Object.keys(variables);
			return `unknown prompt variable "{{${name}}}"; registered variables: ${known.length > 0 ? known.join(", ") : "(none)"}`;
		}
		if (variables[name] === void 0) return `prompt variable "{{${name}}}" has no value for this Session`;
		last = open + group[0].length;
	}
}


/**
* Model-facing Team preset tools for the captain of a Session.
*
* `get_team_preset` reads the preset this Session runs and the exact revision
* the settings document is at; `update_team_preset` replaces the descriptions
* and standing prompts it names. Both register in one Session-root Agent scope,
* so a teammate never sees them. A preset is shared by every Session that
* selected it, so a teammate report or an automatic continuation must not
* rewrite it, and a write waits for the run to end rather than changing the
* definition under executing members. A saved change reaches an idle Session
* right away, while a Session whose Team task is running adopts it before its
* next Team task begins.
* @module dsh-agent-team-presets/preset-tools
*/
const GET_VALUE_SCHEMA = {
	type: "object",
	additionalProperties: false,
	properties: {
		status: {
			type: "string",
			required: true,
			enum: [
				"ready",
				"no-selection",
				"unknown-team",
				"unavailable"
			]
		},
		revision: { type: "integer" },
		selectedTeamId: { type: "string" },
		teams: {
			type: "array",
			required: true,
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					id: {
						type: "string",
						required: true
					},
					name: {
						type: "string",
						required: true
					},
					description: {
						type: "string",
						required: true
					},
					members: {
						type: "array",
						required: true,
						items: { type: "string" }
					}
				}
			}
		},
		team: {
			type: "object",
			additionalProperties: false,
			properties: {
				id: {
					type: "string",
					required: true
				},
				name: {
					type: "string",
					required: true
				},
				description: {
					type: "string",
					required: true
				},
				captainName: {
					type: "string",
					required: true
				},
				captainDescription: {
					type: "string",
					required: true
				},
				captainSystemPrompt: {
					type: "string",
					required: true
				},
				members: {
					type: "array",
					required: true,
					items: {
						type: "object",
						additionalProperties: false,
						properties: {
							member: {
								type: "string",
								required: true
							},
							name: {
								type: "string",
								required: true
							},
							description: {
								type: "string",
								required: true
							},
							systemPrompt: {
								type: "string",
								required: true
							}
						}
					}
				}
			}
		},
		executingMembers: { type: "integer" },
		message: {
			type: "string",
			required: true
		}
	}
};
const UPDATE_VALUE_SCHEMA = {
	type: "object",
	additionalProperties: false,
	properties: {
		status: {
			type: "string",
			required: true,
			enum: [
				"updated",
				"unchanged",
				"team-busy",
				"no-selection",
				"unknown-team",
				"unavailable"
			]
		},
		revision: { type: "integer" },
		teamId: { type: "string" },
		changed: {
			type: "array",
			required: true,
			items: { type: "string" }
		},
		message: {
			type: "string",
			required: true
		}
	}
};
/** One editable member entry in the update tool's arguments. */
const MEMBER_EDIT_PARAMETER = {
	type: "object",
	additionalProperties: false,
	properties: {
		member: {
			type: "string",
			required: true,
			description: "Member name or teammate target from the roster get_team_preset reports."
		},
		description: {
			type: "string",
			description: "Replacement role description, at most 200 characters. Omit to keep the stored one."
		},
		system_prompt: {
			type: "string",
			description: "Replacement standing system prompt for this member. Omit to keep the stored one."
		}
	}
};
/**
* Read the revision the settings document stands at.
* @param ctx - host context providing the settings forms.
* @param namespace - this plugin's settings entry id.
* @returns the entry's current revision, or undefined when it has no configurable entry.
*/
function currentRevision(ctx, namespace) {
	return ctx.settings.describe().find((row) => row.ns === namespace)?.revision;
}
/** One Team summary the read tool returns. */
function teamSummary(team) {
	return {
		id: team.id,
		name: team.name,
		description: team.description,
		members: memberTargets(team).map((row) => row.target)
	};
}
/** One Team with every editable field. */
function teamDetail(team) {
	return {
		id: team.id,
		name: team.name,
		description: team.description,
		captainName: team.captain.name,
		captainDescription: team.captain.description,
		captainSystemPrompt: team.captain.systemPrompt,
		members: memberTargets(team).map(({ member, target }) => ({
			member: target,
			name: member.name,
			description: member.description,
			systemPrompt: member.systemPrompt
		}))
	};
}
/**
* Resolve one Team by identity or configured name.
* @param teams - every configured Team preset.
* @param key - Team identity, or its configured name.
* @returns the matching Team, or undefined.
*/
function teamByName(teams, key) {
	const wanted = key.trim();
	return teams.find((team) => team.id === wanted || team.name.trim() === wanted);
}
/**
* Whether the open turn of one Session-root Agent carries host-attested human input.
*
* An omitted `followup()` / `steer()` source resolves to `user`, so a non-human
* producer supplies its own kind and cannot inherit this authority.
* @param agent - the exact live calling Agent.
* @param openTurnStartSeq - first sequence of the caller's open turn.
* @returns whether a human `user/message` was accepted inside that turn.
*/
function hasDirectHumanInput(agent, openTurnStartSeq) {
	const events = agent.session.snapshotEvents(openTurnStartSeq);
	for (let seq = 1; seq < events.length; seq += 1) {
		const event = events[seq];
		if (event?.type === "user/message" && event.data.source.kind === "user") return true;
	}
	return false;
}
/**
* Require the exact live Session captain behind one tool call.
*
* The tools install into an Agent scope, so this only re-checks what scoped
* discovery already guarantees: the caller is a top-level Session agent, not a
* teammate, and it is still the registered Agent the call came from.
* @param ctx - host context carrying the live agent registry.
* @param exec - tool execution metadata supplied by the registry.
* @param tool - tool name for the failure text.
* @returns the authenticated captain.
* @throws when the caller is a teammate, absent, or a stale Agent identity.
*/
function callingCaptain(ctx, exec, tool) {
	const agent = exec.agent;
	if (agent === void 0) throw new HarnessError(`${tool} requires a calling Agent`, "TEAM_PRESET_TOOL_AGENT_REQUIRED");
	if (agent.session.header.origin === "subagent") throw new HarnessError(`${tool} is available to the Session captain only, not to a teammate`, "TEAM_PRESET_TOOL_CAPTAIN_ONLY");
	if (ctx.agents.get(agent.id) !== agent) throw new HarnessError(`${tool} requires the live calling Agent`, "TEAM_PRESET_TOOL_STALE_AGENT");
	return agent;
}
/**
* Require a turn the user started before one preset write.
* @param ctx - host context carrying the session projections.
* @param agent - the authenticated captain.
* @param tool - tool name for the failure text.
* @throws when no turn is open, or the open turn carries no host-attested human input.
*/
function requireUserRequest(ctx, agent, tool) {
	const boundary = ctx.sessionProjections.stateOf(agent.session, "turnBoundary");
	if (boundary === void 0 || boundary.openTurnStartSeq === null) throw new HarnessError(`${tool} must be called inside an open model turn`, "TEAM_PRESET_TOOL_NO_TURN");
	if (!hasDirectHumanInput(agent, boundary.openTurnStartSeq)) throw new HarnessError(`${tool} rewrites the stored Team preset, which every Session that selected it shares, so it needs a turn the user started. Ask the user to request the change in their own message; do not edit the preset from a teammate report, a tool result, or an automatic continuation.`, "TEAM_PRESET_TOOL_AUTHORITY_REQUIRED");
}
/**
* Count the members currently executing one Team in any Session that runs it.
*
* A Team preset is the playbook a Session runs on and is shared by every
* Session that selected it, so "the Team is executing" is a property of the
* preset, not of the caller: another Session's live run blocks this write too.
* A Session that switched its selection while members of the previous Team
* still run is still executing that Team, so the Team it has applied counts
* alongside the one it currently selects.
* @param ctx - host context carrying the live agent registry and Team service.
* @param config - live plugin configuration carrying the Teams and their selections.
* @param teamId - identity of the Team being written.
* @param appliedTeamId - the Team one Session currently has applied, when its selection moved on.
* @returns how many teammates are running or provisioning under that Team.
*/
function executingMembers(ctx, config, teamId, appliedTeamId) {
	let executing = 0;
	for (const root of ctx.agents.roots()) {
		if (selectedTeam(config.teams.get(), config.selections.get(), root.session.id)?.id !== teamId && appliedTeamId(root) !== teamId) continue;
		if (ctx.agentTeams.tryMembership(root) === void 0) continue;
		for (const member of ctx.agentTeams.listMembers(root)) {
			if (member.role !== "teammate") continue;
			if (member.status === "running" || member.status === "provisioning") executing += 1;
		}
	}
	return executing;
}
/**
* Resolve the Team one call targets: the named Team, or the one this Session selected.
* @param teams - every configured Team preset.
* @param selection - the selected Team, when the Session selected one.
* @param requested - Team identity or name the caller named, when it named one.
* @returns the resolved Team, with the failure status when it could not be resolved.
*/
function resolveTarget(teams, selection, requested) {
	if (requested === void 0) {
		if (selection === void 0) return {
			ok: false,
			status: "no-selection",
			message: `This Session selected no Team, so no Team is implied. Ask the user which Team to change, or have them pick one with the composer Team control, then name it here. Configured Teams: ${describeTeams(teams)}`
		};
		return {
			ok: true,
			team: selection
		};
	}
	const team = teamByName(teams, requested);
	if (team === void 0) return {
		ok: false,
		status: "unknown-team",
		message: `no configured Team matches "${requested}". Configured Teams: ${describeTeams(teams)}`
	};
	return {
		ok: true,
		team
	};
}
/**
* Render the configured Teams for one failure message.
* @param teams - every configured Team preset.
* @returns one `id (name)` entry per Team, or a phrase when none is configured.
*/
function describeTeams(teams) {
	if (teams.length === 0) return "(none configured)";
	return teams.map((team) => team.name.trim() === "" ? team.id : `${team.id} (${team.name.trim()})`).join(", ");
}
/** Extract one model-facing reason from a refused settings write. */
function reasonOf(error) {
	return error instanceof Error ? error.message : String(error);
}
/** Model-facing report of what one applied write does and does not reach. */
function applyReport(changed) {
	return `Saved: replaced ${changed.join(", ")}. An idle Session adopts the new definition right away; a Session whose Team task is running keeps the definition that task started with and adopts the new one before its next Team task begins. A member the Session spawns after it adopts the new definition uses it; a teammate that is already provisioned keeps the prompt it was spawned with.`;
}
/**
* Register the Team preset tools in one Session-root Agent scope.
* @param ctx - host context providing settings and the live agent registry.
* @param agent - the exact Session-root Agent that owns the tools.
* @param config - live plugin configuration carrying the Teams and their selections.
* @param namespace - this plugin's settings entry id.
* @param appliedTeamId - the Team one Session currently has applied; the freeze
*   keeps that Team live after a selection change, so its running members still
*   block a write. Defaults to no applied Team for callers that hold no
*   application state.
* @returns the disposer that removes both tools.
*/
function registerPresetTools(ctx, agent, config, namespace, appliedTeamId = () => void 0) {
	const jsonOutput = (schema) => ({
		schema,
		render: (_args, value) => [{
			type: "text",
			text: JSON.stringify(value)
		}]
	});
	const disposers = [agent.ctx.tools.register(defineTool({
		name: "get_team_preset",
		description: GET_TEAM_PRESET_DESCRIPTION,
		parameters: { team_id: {
			type: "string",
			description: "Team identity or name to read; omit to read the Team this Session selected."
		} },
		output: jsonOutput(GET_VALUE_SCHEMA),
		execute(args, exec) {
			const captain = callingCaptain(ctx, exec, "get_team_preset");
			const teams = config.teams.get();
			const selection = selectedTeam(teams, config.selections.get(), captain.session.id);
			const revision = currentRevision(ctx, namespace);
			const summaries = teams.map(teamSummary);
			if (revision === void 0) return Promise.resolve({
				status: "unavailable",
				teams: summaries,
				...selection === void 0 ? {} : { selectedTeamId: selection.id },
				message: `"${namespace}" has no configurable settings entry, so no Team preset can be edited in this deployment.`
			});
			const resolved = resolveTarget(teams, selection, args.team_id);
			if (!resolved.ok) return Promise.resolve({
				status: resolved.status,
				revision,
				teams: summaries,
				...selection === void 0 ? {} : { selectedTeamId: selection.id },
				message: resolved.message
			});
			const executing = executingMembers(ctx, config, resolved.team.id, appliedTeamId);
			return Promise.resolve({
				status: "ready",
				revision,
				teams: summaries,
				...selection === void 0 ? {} : { selectedTeamId: selection.id },
				team: teamDetail(resolved.team),
				executingMembers: executing,
				message: `${executing > 0 ? `This Team is executing right now (${String(executing)} member(s) running or provisioning), so update_team_preset will refuse this preset until the run ends or those members are interrupted, and the running task keeps the definition it started with. Its member routes are not frozen: a member's provider, model, and reasoning effort changed in Settings apply to the next member the captain summons, including in this task. ` : ""}Editing an existing Team preset is a settings write fenced by revision ${String(revision)}. Pass that revision to update_team_preset. Only descriptions and standing prompts change here: names, member routes, and tool policies stay as configured.`
			});
		}
	})), agent.ctx.tools.register(defineTool({
		name: "update_team_preset",
		description: UPDATE_TEAM_PRESET_DESCRIPTION,
		parameters: {
			revision: {
				type: "integer",
				required: true,
				description: "Exact settings revision returned by get_team_preset."
			},
			team_id: {
				type: "string",
				description: "Team identity or name to change; omit to change the Team this Session selected."
			},
			team_description: {
				type: "string",
				description: "Replacement Team purpose, read by the captain and by every member it summons. Omit to keep the stored one."
			},
			captain_description: {
				type: "string",
				description: "Replacement captain role description. Omit to keep the stored one."
			},
			captain_system_prompt: {
				type: "string",
				description: "Replacement captain standing system prompt, installed as the Session persona. Omit to keep the stored one."
			},
			members: {
				type: "array",
				items: MEMBER_EDIT_PARAMETER,
				description: "Member edits, each naming a member from the roster get_team_preset reports."
			}
		},
		output: jsonOutput(UPDATE_VALUE_SCHEMA),
		async execute(args, exec) {
			const captain = callingCaptain(ctx, exec, "update_team_preset");
			const teams = config.teams.get();
			const selection = selectedTeam(teams, config.selections.get(), captain.session.id);
			const revision = currentRevision(ctx, namespace);
			if (revision === void 0) return {
				status: "unavailable",
				changed: [],
				message: `"${namespace}" has no configurable settings entry, so no Team preset can be edited in this deployment.`
			};
			const resolved = resolveTarget(teams, selection, args.team_id);
			if (!resolved.ok) return {
				status: resolved.status,
				revision,
				changed: [],
				message: resolved.message
			};
			const executing = executingMembers(ctx, config, resolved.team.id, appliedTeamId);
			if (executing > 0) return {
				status: "team-busy",
				revision,
				teamId: resolved.team.id,
				changed: [],
				message: `Team "${resolved.team.name.trim() === "" ? resolved.team.id : resolved.team.name.trim()}" is executing: ${String(executing)} member(s) are running or provisioning, so the preset is not written. Wait for those members to finish, or interrupt them with interrupt_agent, then call get_team_preset again and retry with the revision it returns; the running task keeps the definition it started with. A member's provider, model, and reasoning effort are outside that frozen definition, so the Settings page can correct a route while the task runs and the next member the captain summons uses it.`
			};
			requireUserRequest(ctx, captain, "update_team_preset");
			if (args.revision !== revision) throw new HarnessError(`revision ${String(args.revision)} is stale; the Team preset document is at revision ${String(revision)}. Call get_team_preset again and retry with the revision it returns.`, "TEAM_PRESET_TOOL_STALE_REVISION");
			const suppliedPrompts = [...args.captain_system_prompt === void 0 ? [] : [args.captain_system_prompt], ...(args.members ?? []).flatMap((entry) => entry.system_prompt === void 0 ? [] : [entry.system_prompt])];
			if (suppliedPrompts.some((text) => text.includes("{{"))) {
				const assembly = await ctx.systemPrompt.assemble(assembleContextFor(captain));
				for (const text of suppliedPrompts) {
					const failure = promptTemplateFailure(text, assembly.variables);
					if (failure !== void 0) throw new HarnessError(`the Team prompt was refused: ${failure}. Write the literal text without that group, or name a registered variable.`, "TEAM_PRESET_TOOL_INVALID_PROMPT");
				}
			}
			const edit = {
				...args.team_description === void 0 ? {} : { description: args.team_description },
				...args.captain_description === void 0 ? {} : { captainDescription: args.captain_description },
				...args.captain_system_prompt === void 0 ? {} : { captainSystemPrompt: args.captain_system_prompt },
				...args.members === void 0 ? {} : { members: args.members.map((entry) => ({
					member: entry.member,
					...entry.description === void 0 ? {} : { description: entry.description },
					...entry.system_prompt === void 0 ? {} : { systemPrompt: entry.system_prompt }
				})) }
			};
			const applied = editTeamPreset(resolved.team, edit);
			if (!applied.ok) throw new HarnessError(applied.message, "TEAM_PRESET_TOOL_INVALID_EDIT");
			if (applied.changed.length === 0) return {
				status: "unchanged",
				revision,
				teamId: resolved.team.id,
				changed: [],
				message: `Every supplied value already matched the stored Team preset, so nothing was written. The document stays at revision ${String(revision)}.`
			};
			const approval = ctx.get("approval");
			if (approval === void 0) throw new HarnessError("Shared Team edits require Host approval support; edit in Settings instead.", "TEAM_PRESET_TOOL_APPROVAL_REQUIRED");
			const outcome = await approval.request({
				agent: captain,
				toolName: "update_team_preset",
				callId: exec.callId,
				signal: exec.signal,
				reason: `Persist shared Team preset ${resolved.team.id} at revision ${revision}: ${JSON.stringify({
					changed: applied.changed,
					before: teamDetail(resolved.team),
					after: teamDetail(applied.team)
				})}`
			});
			if (outcome !== "allowed-once") throw new HarnessError(`Shared Team edit was not approved (${outcome}); no settings were written.`, "TEAM_PRESET_TOOL_APPROVAL_REQUIRED");
			exec.signal.throwIfAborted();
			if (currentRevision(ctx, namespace) !== revision || executingMembers(ctx, config, resolved.team.id, appliedTeamId) > 0) throw new HarnessError("Team state changed during approval; read the preset again.", "TEAM_PRESET_TOOL_STALE_REVISION");
			const next = teams.map((team) => team.id === resolved.team.id ? applied.team : team);
			try {
				await ctx.settings.update(namespace, { teams: next }, revision);
			} catch (error) {
				throw new HarnessError(`the Team preset write was refused: ${reasonOf(error)}. Call get_team_preset for the current revision and retry.`, "TEAM_PRESET_TOOL_WRITE_REFUSED");
			}
			const written = currentRevision(ctx, namespace);
			return {
				status: "updated",
				...written === void 0 ? {} : { revision: written },
				teamId: resolved.team.id,
				changed: [...applied.changed],
				message: applyReport(applied.changed)
			};
		}
	}))];
	return () => {
		for (const dispose of disposers.splice(0).reverse()) dispose();
	};
}


/**
* Host catalog of the tools a Team member's allow-list may name.
*
* Read globals and standing Agent preset scopes without creating Agents. The
* editor offers their union plus fixed Team operations; application validates
* the selected Session and strict guards cover exact-Agent registrations.
* @module dsh-agent-team-presets/tool-catalog
*/
var __runInitializers = function(thisArg, initializers, value) {
	var useValue = arguments.length > 2;
	for (var i = 0; i < initializers.length; i++) value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
	return useValue ? value : void 0;
};
var __esDecorate = function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
	function accept(f) {
		if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
		return f;
	}
	var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
	var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
	var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
	var _, done = false;
	for (var i = decorators.length - 1; i >= 0; i--) {
		var context = {};
		for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
		for (var p in contextIn.access) context.access[p] = contextIn.access[p];
		context.addInitializer = function(f) {
			if (done) throw new TypeError("Cannot add initializers after decoration has completed");
			extraInitializers.push(accept(f || null));
		};
		var result = (0, decorators[i])(kind === "accessor" ? {
			get: descriptor.get,
			set: descriptor.set
		} : descriptor[key], context);
		if (kind === "accessor") {
			if (result === void 0) continue;
			if (result === null || typeof result !== "object") throw new TypeError("Object expected");
			if (_ = accept(result.get)) descriptor.get = _;
			if (_ = accept(result.set)) descriptor.set = _;
			if (_ = accept(result.init)) initializers.unshift(_);
		} else if (_ = accept(result)) if (kind === "field") initializers.unshift(_);
		else descriptor[key] = _;
	}
	if (target) Object.defineProperty(target, contextIn.name, descriptor);
	done = true;
};
/**
* One frame for a composition that holds no execution state.
*
* Written as an explicit iterator rather than an `async function*`: the frame
* carries no awaitable work, and an async generator without an `await` trips
* `typescript/require-await` for a function that is only asynchronous by
* signature. The board is announced once and the stream then completes.
* @returns one empty frame, then completion.
*/
function emptyExecution() {
	return { [Symbol.asyncIterator]() {
		let sent = false;
		return { next: () => {
			if (sent) return Promise.resolve({
				done: true,
				value: void 0
			});
			sent = true;
			return Promise.resolve({
				done: false,
				value: { teams: [] }
			});
		} };
	} };
}
/**
* Descriptions this plugin owns for the capabilities it implements.
*
* Every name here is a tool this plugin registers and therefore authors, and
* the text is the same constant its tool definition carries. A tool the registry
* did not describe is never listed, and an upstream tool is never described from
* here: inventing hover text for someone else's tool would put unverified claims
* in the tip, and offering a name the registry does not expose would only
* produce an application the summon path rejects.
*/
const OWN_TOOL_DESCRIPTIONS = {
	spawn_team_member: SPAWN_TEAM_MEMBER_DESCRIPTION,
	get_team_preset: GET_TEAM_PRESET_DESCRIPTION,
	update_team_preset: UPDATE_TEAM_PRESET_DESCRIPTION
};
/**
* Capabilities only the captain can exercise.
*
* `interrupt_agent` is enforced by the Team service, and the preset tools are
* registered on the Session root scope only, so a member's selection can never
* make them usable. The page marks them instead of implying they are grantable.
*/
const CAPTAIN_ONLY = new Set([
	"spawn_team_member",
	"get_team_preset",
	"update_team_preset",
	"interrupt_agent"
]);
/**
* The Harness names an MCP tool `mcp__<server>__<name>`, so the middle segment
* is the server this plugin can attribute the capability to.
*/
const MCP_TOOL_NAME = /^mcp__([A-Za-z0-9_-]{1,32})__/;
/**
* Attribute one capability to the only sources the registry can prove.
*
* `register()` stores a definition under its tool name with a fixed label, so a
* tool's registering package is never recorded and native Harness tools cannot
* be told apart from a third-party plugin's. Two attributions remain
* deterministic: a name this plugin registers, and a Harness-generated MCP name.
* Everything else is reported as `other` rather than guessed at, so the group
* can split by itself once upstream records the registering source.
* @param name - the registered tool name.
* @returns the attribution, plus the MCP server name when there is one.
*/
function attributionOf(name) {
	if (Object.hasOwn(OWN_TOOL_DESCRIPTIONS, name)) return { source: "presets" };
	const mcp = MCP_TOOL_NAME.exec(name);
	if (mcp !== null) return {
		source: "mcp",
		server: mcp[1]
	};
	return { source: "other" };
}
let TeamPresetsToolCatalog = (() => {
	let _classSuper = TypertRemoteService;
	let _instanceExtraInitializers = [];
	let _catalog_decorators;
	let _execution_decorators;
	return class TeamPresetsToolCatalog extends _classSuper {
		static {
			const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
			_catalog_decorators = [Remote];
			_execution_decorators = [Remote({ mode: "stream" })];
			__esDecorate(this, null, _catalog_decorators, {
				kind: "method",
				name: "catalog",
				static: false,
				private: false,
				access: {
					has: (obj) => "catalog" in obj,
					get: (obj) => obj.catalog
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _execution_decorators, {
				kind: "method",
				name: "execution",
				static: false,
				private: false,
				access: {
					has: (obj) => "execution" in obj,
					get: (obj) => obj.execution
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			if (_metadata) Object.defineProperty(this, Symbol.metadata, {
				enumerable: true,
				configurable: true,
				writable: true,
				value: _metadata
			});
		}
		static inject = ["tools", "typert"];
		monitor = __runInitializers(this, _instanceExtraInitializers);
		/**
		* @param ctx - Host context carrying the tool registry and Typert gateway.
		* @param config - the preset runtime's execution monitor, when it is mounted.
		*/
		constructor(ctx, config = {}) {
			super(ctx, "teamPresetsToolCatalog", { namespace: "teamPresets" });
			this.monitor = config.monitor;
		}
		/**
		* List global, standing-preset and fixed Team capability choices.
		*
		* The reserved PTC mode transport is excluded: `ctx.tools.restrict()` refuses
		* it, so offering it as a checkbox would produce a selection the summon path
		* rejects.
		* @returns the tool names and model-facing descriptions, sorted by name.
		*/
		async catalog() {
			const choices = /* @__PURE__ */ new Map();
			const add = (schemas) => {
				for (const schema of schemas) {
					if (schema.name === RUN_CODE_NAME) continue;
					choices.set(schema.name, {
						name: schema.name,
						description: schema.description,
						...attributionOf(schema.name)
					});
				}
			};
			add(this.ctx.tools.schemas());
			const presets = this.ctx.get("agentPresets");
			if (presets !== void 0) for (const preset of await presets.list()) {
				if (preset.broken !== void 0) throw new Error(`Cannot read tools of preset "${preset.id}": ${preset.broken}`);
				const lease = await presets.acquireScope(preset.id);
				try {
					add(this.ctx.tools.schemas(lease.key));
				} finally {
					await lease[Symbol.asyncDispose]();
				}
			}
			for (const [name, description] of Object.entries(OWN_TOOL_DESCRIPTIONS)) if (!choices.has(name)) choices.set(name, {
				name,
				description,
				source: "presets"
			});
			for (const name of CAPTAIN_ONLY) {
				const choice = choices.get(name);
				if (choice !== void 0) choices.set(name, {
					...choice,
					captainOnly: true
				});
			}
			return { tools: [...choices.values()].sort((left, right) => left.name.localeCompare(right.name)) };
		}
		/**
		* Stream the execution state of every Team the Host reports.
		*
		* The settings page reads this before it promises that a saved change takes
		* effect right away: a Team executing a task adopts a save only before its
		* next task, and a state the Host cannot decide stays `unknown` rather than
		* passing for idle.
		* @param signal - cancellation owned by the Remote stream carrier.
		* @returns whole-set frames, opening with the current state.
		*/
		execution(signal) {
			return this.monitor?.stream(signal) ?? emptyExecution();
		}
	};
})();


/**
* Agent Team presets: configure reusable Teams in Settings, pick one per
* Session from the composer, and let its captain summon configured members.
*
* The Host half owns the live configuration, applies a selected Team to its
* Session, and registers the member tool. A Team task owns the definition it
* started with: while the captain runs or any teammate is running or
* provisioning, the Session keeps the application it has and adopts the latest
* stored definition only between Team tasks. Two groups of fields are outside
* that definition because they are read from the stored Team when they are
* needed rather than captured with it: a member's model route, which a task
* therefore picks up for the next member it summons, and the accent colors the
* roster draws with. A captain runs on the model the Session already selected;
* only members carry a configurable route. The `./client` half renders the
* Settings page and the composer control over the same `agent-team-presets`
* settings namespace.
* @module dsh-agent-team-presets
*/
/** Cordis plugin name. */
const name = "agent-team-presets";
/** Settings entry this plugin owns and rewrites when stored Teams are stale. */
const NAMESPACE = "agent-team-presets";
/**
* Services this plugin reads: the Session agents it composes, the Team service
* it summons members through, the tool registry its member and preset tools
* join, the prompt sections its captain adds, the session projections that
* authenticate a preset write, and the settings document it owns.
*/
const inject = [
	"agents",
	"agentTeams",
	"tools",
	"systemPrompt",
	"sessionProjections",
	"settings",
	"subagents"
];
/** Diagnostics prefix for the failures this plugin only reports. */
const LOG = "agent-team-presets";
/**
* Apply one valid Team preset to one live Session, and keep it current between
* that Session's Team tasks.
* @param ctx - the plugin context providing the Session, Team, tool, prompt, and settings services.
* @param config - the live configuration whose volatile values carry the stored Teams.
*/
function apply(ctx, config) {
	const applications = /* @__PURE__ */ new Map();
	const definitions = /* @__PURE__ */ new Map();
	const quarantines = /* @__PURE__ */ new Map();
	const childPolicies = /* @__PURE__ */ new Map();
	const childEnvelopes = /* @__PURE__ */ new Map();
	/** Teammates whose scoped configuration the durable member runtime installed. */
	const managedMembers = /* @__PURE__ */ new Set();
	const members = new MemberRuntime(ctx);
	const providers = registerMemberProviders(ctx, {
		fresh: config.freshProvider,
		fork: config.forkProvider
	}, (context, state, reason) => {
		if (state === "registration" || state === "unsupported" || state === "alias" || state === "unconfigured") ctx.logger.warn(`${LOG}: ${context} Team members are unavailable: %s`, reason);
	});
	ctx.effect(() => () => {
		providers.dispose();
	}, "agent-team-presets: member execution aliases");
	const quarantine = (agent, reason) => {
		const previous = quarantines.get(agent);
		if (previous !== void 0) {
			previous.reason = reason;
			return;
		}
		const state = {
			reason,
			dispose: () => {}
		};
		state.dispose = agent.ctx.tools.guard(() => state.reason);
		quarantines.set(agent, state);
	};
	const recovery = "Choose another valid Team or \"No team\" in this Session's composer Team control. Changes apply once the captain and its teammates are idle.";
	/**
	* Refuse one child: inside the serial `agent/created` transaction a throw
	* aborts creation before the member's first request; a child that is already
	* live cannot be refused retroactively without leaking the registrations its
	* own activation installed, so it is quarantined instead.
	*/
	const refuseChild = (agent, live, reason) => {
		if (!live) throw new Error(reason);
		ctx.logger.warn(`${LOG}: %s`, reason);
		quarantine(agent, reason);
	};
	const initializeChild = (agent, live) => {
		if (isSessionRoot(agent) || childPolicies.has(agent) || managedMembers.has(agent)) return;
		const managed = isPresetMemberProvider(memberProviderMarker(agent));
		let membership;
		try {
			membership = ctx.agentTeams.tryMembership(agent);
		} catch (error) {
			if (managed) throw new Error(`Preset-managed child "${agent.id}" could not be resolved from the Team roster: ${String(error)}`);
			throw error;
		}
		if (managed && membership?.role !== "teammate") {
			refuseChild(agent, live, `The Host records child "${agent.id}" as created through this plugin's member backend, but it belongs to no Team roster in this Session. It is refused rather than resumed without its frozen configuration.`);
			return;
		}
		if (membership?.role === "teammate") {
			let claim;
			try {
				claim = members.claim(agent, {
					root: membership.root,
					name: membership.name
				}, managed);
			} catch (error) {
				const reason = `Preset-managed teammate "${membership.name}" could not be initialised with its frozen configuration: ${String(error)}`;
				if (!live) throw new Error(reason);
				ctx.logger.warn(`${LOG}: %s`, reason);
				quarantine(agent, reason);
				return;
			}
			if (claim.kind === "installed") {
				if (claim.record.lifecycle === "intent" && claim.record.childSessionId === void 0) {
					const refusal = createdDepthRefusal(ctx, agent);
					if (refusal !== void 0) {
						members.release(agent);
						refuseChild(agent, live, refusal);
						return;
					}
				}
				managedMembers.add(agent);
				childEnvelopes.set(agent, {
					teamId: claim.record.teamId,
					mode: claim.record.policy.mode,
					allow: [...claim.record.policy.allow]
				});
				return;
			}
			if (claim.kind === "invalid") {
				if (!live) throw new Error(claim.reason);
				ctx.logger.warn(`${LOG}: %s`, claim.reason);
				quarantine(agent, claim.reason);
				return;
			}
		}
		const legacyPreset = membership?.role === "teammate" && hasLegacyPresetBriefing(agent);
		const declared = descriptorPolicy(agent, legacyPreset);
		if (declared !== void 0) {
			childPolicies.set(agent, guardPolicy(agent, declared));
			childEnvelopes.set(agent, declared);
			return;
		}
		const parentId = agent.session.header.parentSession;
		const parent = parentId === void 0 ? void 0 : ctx.agents.get(parentId);
		if (parent === void 0) return;
		const refuse = (reason) => {
			if (!live) throw new Error(reason);
			ctx.logger.warn(`${LOG}: %s`, reason);
			quarantine(agent, reason);
		};
		if (quarantines.has(parent)) {
			refuse("Parent Team policy is quarantined; child creation is refused.");
			return;
		}
		if (membership?.role === "teammate") {
			if (!legacyPreset) {
				const parentDefinition = definitions.get(parent);
				if (parentDefinition !== void 0 && policyOf(parentDefinition.id, parentDefinition.captain).mode === "custom") refuse("Custom Team policy requires preset-managed child creation; unmarked native members are refused.");
				return;
			}
			const legacyAll = {
				teamId: "legacy-team",
				mode: "all",
				allow: []
			};
			childPolicies.set(agent, guardPolicy(agent, legacyAll));
			childEnvelopes.set(agent, legacyAll);
			return;
		}
		const parentDeclared = childEnvelopes.get(parent) ?? descriptorPolicy(parent);
		const rootDefinition = definitions.get(parent);
		if ((parentDeclared ?? (rootDefinition === void 0 ? void 0 : policyOf(rootDefinition.id, rootDefinition.captain)))?.mode === "custom") refuse("Custom Team policy requires preset-managed child creation; ordinary delegation cannot preserve its strict policy.");
	};
	const presetTools = /* @__PURE__ */ new Map();
	/** Session roots whose durable roster settlement waits for the next microtask. */
	const pendingRoster = /* @__PURE__ */ new Set();
	let rosterScheduled = false;
	let disposed = false;
	const monitor = new TeamExecutionMonitor(ctx, {
		config,
		applied: (agent) => applications.get(agent)
	});
	ctx.plugin(TeamPresetsToolCatalog, { monitor });
	ctx.effect(() => () => {
		monitor.dispose();
	}, "agent-team-presets: execution monitor");
	ctx.effect(() => ctx.settings.configure({ auto: false }, ctx.fiber), "agent-team-presets: page policy");
	/**
	* Resolve the Session root one Agent's lifecycle edge belongs to.
	* @param agent - the Agent whose status changed.
	* @returns the Agent itself for a Session root, its Team root for a teammate, or undefined.
	*/
	const rootOf = (agent) => {
		if (isSessionRoot(agent)) return agent;
		const membership = ctx.agentTeams.tryMembership(agent);
		return membership?.role === "teammate" ? membership.root : void 0;
	};
	/**
	* Adopt the latest stored definition into one Session, and re-read what the
	* settings page must promise.
	* @param agent - the Session-root Agent to reconcile.
	* @param startingTask - whether this call runs on a root's own wake-up edge.
	*/
	const reconcile = (agent, startingTask = false) => {
		adopt(agent, startingTask);
		monitor.invalidate();
	};
	const jobs = /* @__PURE__ */ new Map();
	/**
	* Options that declare a custom Team's native presentation at the Agent scope.
	*
	* The install is part of the application's rollback region: releasing the
	* application releases the declaration with it.
	* @param agent - the Agent the Team is applied to.
	* @param disclosure - locale key of the effective presentation, when it replaced another one.
	* @returns the application options.
	*/
	const presentationOptions = (agent, disclosure) => ({ presentation: {
		...disclosure === void 0 ? {} : { disclosure },
		install: () => installNativePresentation(agent)
	} });
	/**
	* Report one refused application.
	*
	* A rejected update never lifts the last effective capability policy: the
	* previous application stays installed, and only a Session that has none is
	* quarantined until Settings supplies a valid definition.
	*/
	const refuseTeam = (agent, team, reason) => {
		ctx.logger.warn(`${LOG}: Team "%s" was refused for Session "%s": %s`, team.id, agent.session.id, reason);
		if (!applications.has(agent)) quarantine(agent, `${reason} ${recovery}`);
	};
	/**
	* Re-install the policy a refused update must not lift.
	*
	* A previous application that had declared its own native presentation has to
	* declare it again here, because releasing that application released the
	* declaration with it. One that merely found the surface already native needs
	* no declaration, and asking for one would risk the very false conflict the
	* preparation step exists to avoid.
	* @param agent - the Session-root Agent.
	* @param previous - the definition that was installed before the refusal.
	* @param redeclareNative - whether that application owned a native declaration.
	*/
	const restorePrevious = (agent, previous, redeclareNative) => {
		if (previous === void 0) return;
		try {
			const options = toolMode(previous.captain) === "custom" && redeclareNative ? presentationOptions(agent) : {};
			applications.set(agent, applyTeamToAgent(ctx, agent, previous, providers, () => findTeam(config.teams.get(), previous.id), members, options));
			definitions.set(agent, previous);
		} catch (error) {
			ctx.logger.warn(`${LOG}: the previous Team "%s" could not be restored for Session "%s": %s`, previous.id, agent.session.id, String(error));
		}
	};
	/**
	* Apply one Team after its asynchronous preparation.
	*
	* Nothing of the new application is installed until every check has passed,
	* and the effective wire is read once more after the commit: a strict custom
	* policy is only considered applied when the surface it governs really is the
	* native one, so a declaration that silently lost to another presentation is
	* rolled back instead of being trusted.
	* @param agent - the Session-root Agent.
	* @param team - the definition to apply.
	* @param epoch - identity of this application, so a superseded one stops.
	*/
	const commit = async (agent, team, epoch) => {
		const superseded = () => disposed || jobs.get(agent)?.epoch !== epoch;
		const before = await readWire(agent);
		if (superseded()) return;
		let options = {};
		if (team.captain.systemPrompt.trim() === "" && before !== void 0) {
			const baseline = personaBaseline(before.sections);
			if (baseline.kind === "foreign") {
				refuseTeam(agent, team, `the deployment composes a complete prompt section this plugin cannot re-declare safely ("${baseline.name}"), so this Team could not be made visible to its captain`);
				return;
			}
			if (baseline.kind === "persona") options = { personaFallback: baseline.text };
		}
		const missing = capabilityRefusal(agent, team);
		if (missing !== void 0) {
			refuseTeam(agent, team, missing);
			return;
		}
		if (toolMode(team.captain) === "custom") {
			const presentation = await prepareNativePresentation(agent);
			if (superseded()) return;
			if (presentation.kind === "conflict" || presentation.kind === "unknown") {
				refuseTeam(agent, team, presentation.reason);
				return;
			}
			if (presentation.kind === "installable") options = {
				...options,
				...presentationOptions(agent, presentation.disclosure)
			};
		}
		try {
			assertTeamApplicable(agent, team);
		} catch (error) {
			refuseTeam(agent, team, `application failed validation: ${String(error)}`);
			return;
		}
		if (superseded()) return;
		const previous = definitions.get(agent);
		const previousApplication = applications.get(agent);
		previousApplication?.dispose();
		applications.delete(agent);
		try {
			const application = applyTeamToAgent(ctx, agent, team, providers, () => findTeam(config.teams.get(), team.id), members, options);
			applications.set(agent, application);
			definitions.set(agent, team);
			if (toolMode(team.captain) === "custom") {
				const after = await readWire(agent);
				if (after === void 0 || after.tools.includes(RUN_CODE_NAME)) {
					application.dispose();
					applications.delete(agent);
					definitions.delete(agent);
					restorePrevious(agent, previous, previousApplication?.presentationNote !== void 0);
					refuseTeam(agent, team, after === void 0 ? "the effective tool surface could not be read after the native presentation was installed" : "the effective tool surface still exposes the general purpose PTC transport after the native presentation was installed, so a strict custom policy cannot govern it");
					return;
				}
			}
			quarantines.get(agent)?.dispose();
			quarantines.delete(agent);
			monitor.invalidate();
		} catch (error) {
			applications.delete(agent);
			definitions.delete(agent);
			restorePrevious(agent, previous, previousApplication?.presentationNote !== void 0);
			refuseTeam(agent, team, `application failed: ${String(error)}`);
		}
	};
	/**
	* Queue one application for a Session root, serialized per root.
	*
	* A newer request supersedes an older one through its epoch, and a Session
	* that has no current application stays denied while its first one is being
	* prepared instead of running on the deployment default.
	* @param agent - the Session-root Agent.
	* @param team - the definition to apply.
	*/
	const schedule = (agent, team) => {
		const epoch = (jobs.get(agent)?.epoch ?? 0) + 1;
		if (!applications.has(agent)) quarantine(agent, `Team "${team.id}" is being validated for this Session; tool access is paused until it is applied. ${recovery}`);
		const promise = (jobs.get(agent)?.promise ?? Promise.resolve()).then(async () => {
			if (disposed || jobs.get(agent)?.epoch !== epoch) return;
			await commit(agent, team, epoch);
		}).catch((error) => {
			ctx.logger.warn(`${LOG}: applying Team "%s" to Session "%s" failed unexpectedly: %s`, team.id, agent.session.id, String(error));
		});
		jobs.set(agent, {
			epoch,
			promise
		});
		promise.then(() => {
			monitor.invalidate();
		});
	};
	/**
	* Adopt the latest stored definition into one Session between its Team tasks.
	*
	* A Team task owns the definition it started with, so the captain's persona
	* section, briefing section, member roster, tool scope, and allow-list stay
	* one frozen snapshot while the captain runs or any teammate is running or
	* provisioning. A member's model route and each slot's accent color are not
	* part of that snapshot: both are read from the stored Team when they are
	* needed, so correcting a route reaches the next member the task summons.
	* The frozen snapshot is the preset object this application captured: a
	* settings write replaces the volatile value instead of mutating it, so the
	* captured Team cannot drift.
	*
	* A root that just woke up is about to assemble its next request, which is
	* the last moment a new definition can still reach it; it therefore counts as
	* between tasks unless a teammate is still running the previous one. Every
	* other edge only re-checks whether the Session became idle enough to adopt.
	* @param agent - the Session-root Agent to adopt into.
	* @param startingTask - whether this call runs on a root's own wake-up edge.
	*/
	const adopt = (agent, startingTask) => {
		if (disposed) return;
		const selectedId = config.selections.get().find((row) => row.sessionId === agent.session.id)?.teamId;
		if (!presetTools.has(agent)) presetTools.set(agent, registerPresetTools(ctx, agent, config, NAMESPACE, (root) => applications.get(root)?.teamId));
		if (startingTask ? teammatesBusy(ctx, agent) : agent.status === "running" || teammatesBusy(ctx, agent)) {
			if (!applications.has(agent) && selectedId !== void 0) quarantine(agent, `Team "${selectedId}" cannot be safely restored into an already-running task; tools are paused until its task boundary. ${recovery}`);
			return;
		}
		const team = selectedTeam(config.teams.get(), config.selections.get(), agent.session.id);
		const current = applications.get(agent);
		if (team === void 0) {
			current?.dispose();
			applications.delete(agent);
			definitions.delete(agent);
			quarantines.get(agent)?.dispose();
			quarantines.delete(agent);
			if (selectedId !== void 0) quarantine(agent, `Selected Team "${selectedId}" no longer exists. This is not "No team"; tool access stays denied. ${recovery}`);
			return;
		}
		const fingerprint = definitionFingerprint(team);
		if (current !== void 0 && current.teamId === team.id && current.fingerprint === fingerprint) return;
		const unreachable = capabilityRefusal(agent, team);
		if (unreachable !== void 0) {
			refuseTeam(agent, team, unreachable);
			return;
		}
		try {
			assertTeamApplicable(agent, team);
		} catch (error) {
			if (current === void 0) quarantine(agent, `Team "${team.id}" application failed validation; no tools were granted. ${recovery}`);
			ctx.logger.warn(`${LOG}: Team "%s" was refused for Session "%s": %s`, team.id, agent.session.id, String(error));
			return;
		}
		schedule(agent, team);
	};
	/**
	* Stop the members this plugin owns, grouped by their exact Team root.
	*
	* Only the children this activation recorded are drained: draining a whole
	* descendant tree would also stop upstream-owned work the plugin never
	* installed, and the Team service offers the selective call for exactly this
	* case.
	* @returns resolution once every recorded child has been asked to stop.
	*/
	const drainManagedChildren = async () => {
		const subagents = ctx.get("subagents");
		if (subagents === void 0) {
			if (managedMembers.size > 0) ctx.logger.warn(`${LOG}: %d managed Team member(s) were not drained because the subagent service was already released.`, managedMembers.size);
			return;
		}
		const byRoot = /* @__PURE__ */ new Map();
		for (const agent of [...managedMembers]) {
			const membership = ctx.agentTeams.tryMembership(agent);
			if (membership?.role !== "teammate") continue;
			byRoot.set(membership.root, [...byRoot.get(membership.root) ?? [], agent.id]);
		}
		for (const [root, ids] of byRoot) try {
			await subagents.drainContinuableChildren(root, ids);
		} catch (error) {
			ctx.logger.warn(`${LOG}: managed members of Session "%s" could not be drained: %s`, root.session.id, String(error));
		}
	};
	let shutdown;
	const teardown = () => {
		shutdown ??= (async () => {
			disposed = true;
			const queued = [...jobs.values()].map((job) => job.promise);
			await members.closeAdmission();
			await Promise.allSettled(queued);
			await drainManagedChildren();
			monitor.dispose();
			for (const application of applications.values()) application.dispose();
			applications.clear();
			definitions.clear();
			for (const state of quarantines.values()) state.dispose();
			quarantines.clear();
			for (const dispose of childPolicies.values()) dispose();
			childPolicies.clear();
			childEnvelopes.clear();
			managedMembers.clear();
			for (const dispose of presetTools.values()) dispose();
			presetTools.clear();
			pendingRoster.clear();
			jobs.clear();
			await members.close();
		})();
		return shutdown;
	};
	ctx.effect(() => () => teardown(), "agent-team-presets: ordered shutdown");
	const settingsReconcile = teamSettingsReconcile(ctx, config, NAMESPACE);
	const reconcileTimer = setTimeout(() => {
		if (!disposed) settingsReconcile.request();
	}, 0);
	ctx.effect(() => () => {
		clearTimeout(reconcileTimer);
		settingsReconcile.dispose();
	}, "agent-team-presets: settings reconcile readiness");
	for (const agent of ctx.agents.list()) if (isSessionRoot(agent)) reconcile(agent);
	else initializeChild(agent, true);
	members.whenReady().then(() => {
		if (disposed) return;
		for (const agent of ctx.agents.list()) if (!isSessionRoot(agent)) initializeChild(agent, true);
	});
	ctx.on("agent/created", async ({ agent }) => {
		if (isSessionRoot(agent)) {
			reconcile(agent);
			return;
		}
		initializeChild(agent, false);
		if (managedMembers.has(agent)) {
			const membership = ctx.agentTeams.tryMembership(agent);
			if (membership?.role === "teammate") await members.bind(agent, {
				root: membership.root,
				name: membership.name
			});
		}
	});
	ctx.on("agent/disposed", ({ agent }) => {
		applications.get(agent)?.dispose();
		applications.delete(agent);
		definitions.delete(agent);
		quarantines.get(agent)?.dispose();
		quarantines.delete(agent);
		childPolicies.get(agent)?.();
		childPolicies.delete(agent);
		childEnvelopes.delete(agent);
		managedMembers.delete(agent);
		members.release(agent);
		presetTools.get(agent)?.();
		presetTools.delete(agent);
		pendingRoster.delete(agent);
		jobs.delete(agent);
		monitor.invalidate();
	});
	ctx.on("loader/volatile-update", () => {
		for (const agent of ctx.agents.list()) if (isSessionRoot(agent)) reconcile(agent);
		if (!disposed) settingsReconcile.request();
		monitor.invalidate();
	});
	ctx.on("agent/status", ({ agent, status }) => {
		const root = rootOf(agent);
		if (root === void 0) return;
		reconcile(root, isSessionRoot(agent) && status === "running");
	});
	ctx.on("session/event", (session, event) => {
		if (event.type !== "team/member") return;
		const agent = ctx.agents.get(session.id);
		if (agent === void 0 || !isSessionRoot(agent)) return;
		pendingRoster.add(agent);
		if (rosterScheduled) return;
		rosterScheduled = true;
		queueMicrotask(() => {
			rosterScheduled = false;
			const roots = [...pendingRoster];
			pendingRoster.clear();
			for (const root of roots) reconcile(root);
		});
	});
}

export { Config, apply, inject, name };

import { RUN_CODE_NAME, defineTool } from "@deepseek-ai/dsh-tools";
import { HarnessError, ReasoningEffortId } from "@deepseek-ai/dsh-llm";
import { PERSONA_PREFIX_SECTION } from "@deepseek-ai/dsh-system-prompt";
import { randomUUID } from "node:crypto";
import z from "@deepseek-ai/schemastery";
import { assembleContextFor } from "@deepseek-ai/dsh-agent";
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
function guardPolicy(agent, policy) {
	const allowed = new Set(policy.allow);
	let native;
	if (policy.mode === "custom") try {
		native = agent.ctx.tools.presentAs("native");
	} catch {}
	const disposeGuard = agent.ctx.tools.guard((exec) => {
		if (exec.name === "spawn_teammate") return "This Team uses preset-managed creation; call spawn_team_member instead.";
		if (policy.mode === "custom" && [
			"subagent",
			"subagent_fork",
			"workflow"
		].includes(exec.name)) return "Custom Team policies cannot delegate through providers without a durable strict-policy contract; use preset-managed Team members.";
		if (exec.name === RUN_CODE_NAME && policy.mode === "custom") return "Custom Team policies deny general-purpose run_code; use native allowed tools.";
		if (policy.mode === "custom" && !allowed.has(exec.name)) return `Team preset "${policy.teamId}" tool policy denies "${exec.name}".`;
	});
	return () => {
		disposeGuard();
		native?.();
	};
}
function policyPersona(persona, policy) {
	return `${persona}${MARKER}${JSON.stringify(policy)}`;
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
/** Read the plugin declaration only from the child's own Host-written descriptor. */
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
		model: { type: "string" }
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
* @param ctx - the plugin context providing `agentTeams`.
* @param agent - the live Session agent that owns the tool.
* @param team - the applied Team preset.
* @param providers - continuable-subagent providers to spawn through.
* @param stored - reads the latest stored definition of the applied Team.
* @returns the tool registration disposer.
*/
function registerMemberTool(ctx, agent, team, providers, stored) {
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
				const context = args.context ?? "fresh";
				const task = [{
					type: "text",
					text: args.task
				}];
				const route = routeOptions(routedMember(member, stored()));
				const policy = policyOf(team.id, member);
				const filter = inheritedFilter(caller, policy);
				const briefing = policyPersona(memberBriefing(team, member, instance), policy);
				const result = await ctx.agentTeams.spawnTeammate(caller, {
					name: instance,
					description: args.description ?? (member.description.trim() === "" ? member.name.trim() || target : member.description.trim()),
					prompt: task,
					context,
					provider: context === "fork" ? providers.fork : providers.fresh,
					...route === void 0 ? {} : { agentOptions: route },
					persona: briefing,
					...filter === void 0 ? {} : { toolFilter: filter },
					signal: exec.signal
				});
				return {
					target: result.member.name,
					status: result.member.status === "failed" ? "failed" : "active",
					...result.member.model === void 0 ? {} : { model: result.member.model }
				};
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
* @returns the applied Team, whose `dispose` releases every registration.
*/
function applyTeamToAgent(ctx, agent, team, providers, stored = () => void 0) {
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
		const briefing = captainBriefing(team);
		if (briefing !== "") register(agent.ctx.systemPrompt.section({
			name: "agent-team-presets:briefing",
			order: agent.ctx.systemPrompt.getSectionOrder("TEAM_POLICY"),
			text: briefing
		}));
		register(guardPolicy(agent, policyOf(team.id, captain)));
		register(restrictCaptainTools(agent, captain));
		register(registerMemberTool(ctx, agent, team, providers, stored));
	} catch (error) {
		for (const dispose of disposers.reverse()) dispose();
		throw error;
	}
	return {
		teamId: team.id,
		fingerprint: definitionFingerprint(team),
		dispose() {
			for (const dispose of disposers.splice(0).reverse()) dispose();
		}
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
	freshProvider: z.string().default("spawn"),
	forkProvider: z.string().default("fork")
});


/** Coalesce startup/config edges into one in-flight write and one latest recheck. */
function teamSettingsMigration(ctx, config, namespace) {
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
					if (cleaned.every((team, index) => team === teams[index])) continue;
					const identity = JSON.stringify([descriptor.revision, teams]);
					if (identity === attempted) continue;
					attempted = identity;
					try {
						await ctx.settings.update(namespace, { teams: cleaned }, descriptor.revision);
					} catch (error) {
						ctx.logger.warn("agent-team-presets: settings migration refused; normal Sessions remain unaffected: %s", String(error));
					}
				} while (requested && !disposed);
			} catch (error) {
				ctx.logger.warn("agent-team-presets: could not prepare settings migration; normal Sessions remain unaffected: %s", String(error));
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
				unreadable: false
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
			}
		}
		return { teams: [...tallies.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([teamId, row]) => ({
			teamId,
			state: row.busy > 0 ? "busy" : row.unreadable ? "unknown" : "idle",
			busySessions: row.busy,
			executingMembers: row.members,
			pendingSessions: row.pending
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
	"settings"
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
	const providers = {
		fresh: config.freshProvider,
		fork: config.forkProvider
	};
	const applications = /* @__PURE__ */ new Map();
	const definitions = /* @__PURE__ */ new Map();
	const quarantines = /* @__PURE__ */ new Map();
	const childPolicies = /* @__PURE__ */ new Map();
	const childEnvelopes = /* @__PURE__ */ new Map();
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
	const initializeChild = (agent, live) => {
		if (isSessionRoot(agent) || childPolicies.has(agent)) return;
		const membership = ctx.agentTeams.tryMembership(agent);
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
		try {
			assertTeamApplicable(agent, team);
		} catch (error) {
			if (current === void 0) quarantine(agent, `Team "${team.id}" application failed validation; no tools were granted. ${recovery}`);
			ctx.logger.warn(`${LOG}: Team "%s" was refused for Session "%s": %s`, team.id, agent.session.id, String(error));
			return;
		}
		const previous = definitions.get(agent);
		current?.dispose();
		applications.delete(agent);
		try {
			applications.set(agent, applyTeamToAgent(ctx, agent, team, providers, () => findTeam(config.teams.get(), team.id)));
			definitions.set(agent, team);
			quarantines.get(agent)?.dispose();
			quarantines.delete(agent);
		} catch (error) {
			if (previous !== void 0) try {
				applications.set(agent, applyTeamToAgent(ctx, agent, previous, providers, () => findTeam(config.teams.get(), previous.id)));
			} catch {
				quarantine(agent, `Team "${team.id}" application failed and the previous policy could not be restored; tools remain denied. ${recovery}`);
			}
			else quarantine(agent, `Team "${team.id}" application failed; tools remain denied. ${recovery}`);
			ctx.logger.warn(`${LOG}: applying Team "%s" to Session "%s" failed: %s`, team.id, agent.session.id, String(error));
		}
	};
	ctx.effect(() => () => {
		disposed = true;
		monitor.dispose();
		for (const application of applications.values()) application.dispose();
		applications.clear();
		definitions.clear();
		for (const state of quarantines.values()) state.dispose();
		quarantines.clear();
		for (const dispose of childPolicies.values()) dispose();
		childPolicies.clear();
		childEnvelopes.clear();
		for (const dispose of presetTools.values()) dispose();
		presetTools.clear();
		pendingRoster.clear();
	}, "agent-team-presets: session applications");
	const migration = teamSettingsMigration(ctx, config, NAMESPACE);
	const migrationTimer = setTimeout(() => {
		if (!disposed) migration.request();
	}, 0);
	ctx.effect(() => () => {
		clearTimeout(migrationTimer);
		migration.dispose();
	}, "agent-team-presets: migration readiness");
	for (const agent of ctx.agents.list()) if (isSessionRoot(agent)) reconcile(agent);
	else initializeChild(agent, true);
	ctx.on("agent/created", ({ agent }) => {
		if (isSessionRoot(agent)) reconcile(agent);
		else initializeChild(agent, false);
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
		presetTools.get(agent)?.();
		presetTools.delete(agent);
		pendingRoster.delete(agent);
		monitor.invalidate();
	});
	ctx.on("loader/volatile-update", () => {
		for (const agent of ctx.agents.list()) if (isSessionRoot(agent)) reconcile(agent);
		if (!disposed) migration.request();
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

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
 * @module dsh-agent-team-presets/member-identity
 */
/** Alias a fresh member is created through; persisted by the Host as its provider. */
export const MEMBER_FRESH_PROVIDER = 'preset-member-fresh-v1';
/** Alias a forked member is created through; persisted by the Host as its provider. */
export const MEMBER_FORK_PROVIDER = 'preset-member-fork-v1';
/** Every alias this plugin registers. The set is fixed and versioned. */
const ALIASES = new Set([MEMBER_FRESH_PROVIDER, MEMBER_FORK_PROVIDER]);
/**
 * Whether one execution-backend name is this plugin's member marker.
 * @param name - a subagent provider name, from a roster row or a child descriptor.
 * @returns whether this plugin owns that name.
 */
export function isPresetMemberProvider(name) {
    return name !== undefined && ALIASES.has(name);
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
export function memberProviderMarker(agent) {
    for (const event of agent.session.ownEvents()) {
        if (event.type !== 'subagent/descriptor')
            continue;
        const data = event.data;
        if (data.mode !== 'continuable')
            return undefined;
        return typeof data.provider === 'string' ? data.provider : undefined;
    }
    return undefined;
}
/**
 * Resolve the alias one spawn context must be created through.
 * @param registry - the aliases this activation registered.
 * @param context - the configured spawn context of the member about to be created.
 * @returns the alias to spawn through, or the refusal for that context.
 */
export function memberProviderFor(registry, context) {
    const error = context === 'fresh' ? registry.freshError : registry.forkError;
    if (error !== undefined)
        return { error };
    return { name: context === 'fresh' ? registry.fresh : registry.fork };
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
        ...upstream.agentRouteDefaults === undefined ? {} : { agentRouteDefaults: upstream.agentRouteDefaults },
        start: request => upstream.start(request),
        ...upstream.prepareContinuable === undefined
            ? {}
            : { prepareContinuable: request => upstream.prepareContinuable(request) },
    };
}
/**
 * Register the member aliases, delegating to the configured providers.
 *
 * The two spawn contexts are independent: a deployment that composes only a
 * fresh provider still serves fresh members, while a forked member is refused
 * with the reason its own backend is unusable. A configured name that is itself
 * an alias is always refused — the wrapper must never become its own backend —
 * and so is a name the deployment does not register, or one whose provider
 * cannot create continuable children. Registration failure is reported per
 * context rather than skipped: a member created through the deployment's own
 * provider would carry no marker and could not be told apart from a native
 * teammate after a restart.
 * @param ctx - the plugin context carrying the subagent service.
 * @param configured - the deployment's fresh/fork provider names from the plugin config.
 * @returns the registered aliases plus the refusal of each unusable context.
 */
export function registerMemberProviders(ctx, configured) {
    const errors = {};
    const sponsored = [];
    const unavailable = 'this deployment composes no subagent service, so a Team member cannot be created through '
        + 'this plugin\'s identity alias.';
    const subagents = ctx.get('subagents');
    if (subagents === undefined) {
        // The Settings page and the preset tools still belong to such a
        // deployment; only member creation has no channel, so it is refused with a
        // reason instead of taking the whole plugin down.
        return {
            fresh: MEMBER_FRESH_PROVIDER,
            fork: MEMBER_FORK_PROVIDER,
            freshError: unavailable,
            forkError: unavailable,
            dispose: () => { },
        };
    }
    try {
        for (const [context, alias, name] of [
            ['fresh', MEMBER_FRESH_PROVIDER, configured.fresh],
            ['fork', MEMBER_FORK_PROVIDER, configured.fork],
        ]) {
            if (name.trim() === '') {
                errors[context] = `the ${context} subagent provider is not configured, so a ${context} member cannot be `
                    + 'created without losing the identity that proves it is preset-managed.';
                continue;
            }
            if (isPresetMemberProvider(name)) {
                errors[context] = `the ${context} subagent provider "${name}" is this plugin's own member alias; point the `
                    + 'plugin at the deployment provider it should delegate to.';
                continue;
            }
            const upstream = subagents.getProvider(name);
            if (upstream === undefined) {
                errors[context] = `this deployment registers no subagent provider named "${name}", so a ${context} member `
                    + 'cannot be created through this plugin\'s identity alias.';
                continue;
            }
            if (upstream.prepareContinuable === undefined) {
                errors[context] = `subagent provider "${name}" cannot create continuable children, so it cannot back a `
                    + `${context} Team member.`;
                continue;
            }
            try {
                sponsored.push(subagents.registerProvider(aliasProvider(alias, upstream)));
            }
            catch (error) {
                errors[context] = `the ${context} member execution alias "${alias}" could not be registered: ${String(error)}`;
            }
        }
    }
    catch (error) {
        // A provider lookup that itself throws leaves no alias usable.
        for (const dispose of sponsored.reverse())
            dispose();
        return {
            fresh: MEMBER_FRESH_PROVIDER,
            fork: MEMBER_FORK_PROVIDER,
            freshError: `the member execution aliases could not be registered: ${String(error)}`,
            forkError: `the member execution aliases could not be registered: ${String(error)}`,
            dispose: () => { },
        };
    }
    return {
        fresh: MEMBER_FRESH_PROVIDER,
        fork: MEMBER_FORK_PROVIDER,
        ...errors.fresh === undefined ? {} : { freshError: errors.fresh },
        ...errors.fork === undefined ? {} : { forkError: errors.fork },
        dispose: () => { for (const dispose of sponsored.reverse())
            dispose(); },
    };
}

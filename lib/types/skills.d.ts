/**
 * The two professional skills this plugin ships beside its Teams.
 *
 * A Team prompt can tell a role to follow a house style for repository
 * presentation or for Git delivery, but a prompt cannot make that style
 * *available*: it would have to restate the whole method in every role, and a
 * restated method drifts from the one the user actually reviewed. So the method
 * ships as a skill instead, and the roles name it.
 *
 * The bodies are plain `SKILL.md` bundles under `assets/skills`, which is what
 * the official bundled providers ship too. Registering them through
 * `ctx.skills` — rather than copying them into a user directory — is what keeps
 * install, upgrade, and removal honest: the files arrive and leave with the
 * package, no user directory is guessed, and a skill provider the deployment
 * composed still wins by rank.
 *
 * Nothing here is required for the plugin to work. A deployment that composes no
 * skill service simply gets the Teams without these two skills, and every role
 * prompt is written to keep working when the named skill is unavailable.
 * @module dsh-agent-team-presets/skills
 */
import type { Context } from '@deepseek-ai/cordis';
import type { SkillProvider } from '@deepseek-ai/dsh-skill';
/** Provider name this plugin registers on `ctx.skills`. */
export declare const SKILL_PROVIDER = "dsh-team-presets";
/** Every skill this plugin ships, in the order it lists them. */
export declare const SHIPPED_SKILLS: readonly ["github-repository-presentation", "git-release-hygiene"];
/**
 * Build the provider one deployment registers.
 *
 * Candidates are read once at registration and the body on each load, so an
 * edited document is picked up without re-registering — the same split the
 * filesystem provider makes between discovery and loading.
 * @param root - absolute `assets/skills` directory.
 * @returns the provider to register.
 */
export declare function shippedSkillProvider(root: string): SkillProvider;
/**
 * Register the shipped skills on the deployment's skill registry.
 *
 * Registration is optional by design: `ctx.inject` waits for `skills` and
 * re-runs if it is replaced, while a deployment that never composes one keeps
 * loading this plugin. A failure to read the bundled documents is logged rather
 * than thrown, because losing two advisory skills must not cost the user every
 * Team in the plugin.
 * @param ctx - the plugin context.
 * @param log - receives diagnostic text when the skills cannot be offered.
 */
export declare function installShippedSkills(ctx: Context, log: (message: string) => void): void;

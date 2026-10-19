/**
 * The Team Skills settings panel: the library on the left, one skill on the
 * right, and the assignment dialog that makes it take effect.
 *
 * Everything the panel reports about safety comes from the Host answer — a
 * blocked delete lists the roles, the running members, or the dependency the
 * Host named — so this file never re-derives a rule and cannot drift from the
 * Agent-facing path. The panel exists because the Host alone is not testable by
 * a user: importing a folder, editing `SKILL.md`, and binding a role have to be
 * clickable before any of the isolation work is observable.
 * @module dsh-agent-team-presets/client/TeamSkillsView
 */
import type { TeamSkillsController } from './team-skills-controller.ts';
/** Props of {@link TeamSkillsView}. */
export interface TeamSkillsViewProps {
    /** Page state and actions. */
    readonly controller: TeamSkillsController;
    /** Translate one locale key. */
    readonly t: (key: 'skillsEmpty' | 'skillsHint' | 'skillsImport' | 'skillsNew' | 'skillsSave' | 'skillsDelete' | 'skillsAssign' | 'skillsUnassign' | 'skillsOfficial' | 'skillsFiles' | 'skillsBindings' | 'skillsNamePlaceholder' | 'skillsDescriptionPlaceholder' | 'skillsRoot' | 'skillsRefresh' | 'skillsOverride' | 'skillsReset' | 'skillsBody') => string;
}
/** The Team Skills panel. */
export declare function TeamSkillsView(props: TeamSkillsViewProps): React.ReactElement;

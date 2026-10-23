# Changelog

## Unreleased

### Added

- **Method Team Skills**: ship `grilling` and `research` as built-in Team Skills.
  `grilling` is bound by default to the Discovery captain; `research` is bound to the
  Discovery `technical-scout`/`product-scout` and the Research `evidence-scout`.
  Both keep the upstream English body and add a DSH adaptation section; see `NOTICE`
  for the upstream repository, pinned commit, and MIT license.

## 0.1.6 — unreleased

### Added

- **Display metadata** (`metadata`): summary, tags, use cases, suggested tasks, and notes per Team.
  Stored in the preset document, used for search, grouping, and the Team intro, and never injected
  into the runtime context.
- **Local categories** (`categories`, `teamCategories`): create, rename, reorder, and delete
  categories, and put a Team in one. Local only — never exported with a preset.
- **Search** over name, summary, tags, use cases, and suggested tasks in both the settings list and
  the composer picker.
- **Private Team Skill library**: import a folder or ZIP into a plugin-owned store, create an
  editable local override of a shipped skill, reset it to the official copy, and see when the
  shipped copy has moved ahead (`updateAvailable`).
- **Per-Agent skill assignment**: a member page grid assigns skills to one role; a role may hold
  several. A skill is discovered only inside the Agent scope of the role it is bound to.
- **Guarded deletion**: refused while a role still holds the skill, a running member uses it, or
  another skill depends on it, listing every blocker with its holder.
- **Dependency reporting**: declared executables are resolved against `PATH` and shown as found or
  missing; an assignment is refused (`dependency-missing`) when a required executable is absent.
  A required MCP server is reported as declared, never guessed as missing.
- **Agent-facing tools**: `list_team_skills`, `assign_team_skill`, `unassign_team_skill`, and
  `remove_team_skill` on the Session root, sharing the manager's rules with the page.

### Changed

- Host and Client wire formats follow DSH `0.2.1-rc.2` (`TypertRemoteService`, `TYPERT`/`TYPERT_REMOTE`
  descriptors, `RemoteResult`).
- The browser half no longer declares the `teamSkills` namespace in its required inject list, so a
  deployment without the service still boots; the panel degrades to an unavailable message.

### Fixed

- A namespace method named `remove` collided with the namespace-service proxy and stopped the whole
  web entry from activating.
- The panel controller was built inside the injected UI scope, where a further injection is not
  guaranteed to work.
- `npm run bundle` failed on the Typert workspace analysis; the staging step now mirrors the Harness
  workspace layout and references each package's face `tsconfig`.

## 0.1.5

Initial published surface: nine built-in Teams, per-member model routes and tool policies, portable
preset import/export, and the composer Team picker.

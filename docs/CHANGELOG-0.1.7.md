# Changelog

## 0.1.7

### Added

- **Method Team Skills** (`grilling`, `research`), contributed in PR #2 and integrated here.
  - `grilling` is bound by default to the Discovery captain (`discovery-lead`).
  - `research` is bound by default to the Discovery `technical-scout`/`product-scout` and the
    Research `evidence-scout`.
  - Both keep the upstream English body and add a `## 在 DSH 团队中的用法` adaptation section.
    Upstream: Matt Pocock, [skills](https://github.com/mattpocock/skills), commit
    `5beb35b040e3de97e54fa9e386d7e42d15c295c2`, MIT. Full attribution in `NOTICE`.

### Changed

- **Built-in Team Skill bindings now follow the catalog on upgrade.** A shipped identity always
  declares its current catalog defaults, so an existing deployment gains a newly shipped default
  binding without any user action. An explicit user unbind is still preserved across restarts
  (the `seeded` marker), custom Teams are never seeded, and a custom/imported Team keeps its own
  `officialSkills` declaration.
- **Host support is now stated as measured.** The declared `engines.dsh` range is unchanged
  (`>=0.2.0-rc.2 <0.3.0`, enforced by the plugin manager); this release was verified against
  `0.2.1-rc.2`. `0.2.0-rc.2` was not re-run for 0.1.7, and the READMEs now say so instead of
  implying the whole range was re-tested.

### Fixed

- **The 0.1.6 security fix now actually ships.** Commit `c59cbd1` changed `src/` only and never
  rebuilt `lib/`, which is the published artifact. On the 0.1.6 line the committed `lib/` was
  byte-identical to the `v0.1.6` tag and therefore did not contain the quarantine fix at all.
  0.1.7 ships a rebuilt `lib/`; a new test (`tests/committed-artifact.spec.ts`) fails if the
  committed artifact loses any of the security-critical declarations below, and its negative
  control demonstrates it rejects the stale `v0.1.6` artifact.
- **A declared default can no longer leak to the captain through a member named like the
  sentinel.** Role names were resolved member-first, so a stored Team holding a member literally
  named `captain` with no `id` had its declared default granted to the captain slot. The captain
  branch now resolves first and such a colliding declaration is dropped rather than mis-granted.
  Reachable only from a hand-written settings document; the UI and the import path both assign a
  UUID.

### Security regressions re-verified for this release

Re-confirmed with executable evidence, not by inspection alone:

- **Team state misclassification (wrong freeze)** — a Session that provably ran without a Team is
  no longer frozen when the user picks one mid-task; the selection applies at the task boundary.
- **Lost recovery channel after isolation** — a quarantined captain keeps exactly the ten
  non-capability tools; a teammate keeps deny-all.
- **Privilege escalation from a mid-task Team change** — deselect (or switch) followed by a plugin
  reload no longer drops the strict policy and falls back to the deployment-default tool surface.
- **Fail-open on insufficient evidence** — a restore failure followed by "No team" and then an
  invalid Team still ends up quarantined rather than unguarded.

### Known limitations (recorded, not fixed in this release)

- **Residual header window — wider than previously documented, and deterministic.** The
  request-log marker is positive evidence only, so a running Team task whose captain has not yet
  assembled a request *under that Team* has no marker and is classified as unknown. Measured for
  0.1.7: "apply A while idle → a teammate runs → deselect → reload" reproduces it with **no timing
  race at all**, and the task falls back to the deployment-default surface, reopening the
  capability the Team denied (under PTC that is `run_code`, i.e. arbitrary code). The previous
  documentation described this as a narrow race; that description was wrong and is corrected in
  `src/index.ts`. Closing it needs a durable marker written before the application is installed —
  a separate change. It must not be closed by widening the quarantine, which would restore the
  denial-of-service that the current classification exists to prevent.
- **A Team that widens a tool the applied Team still hides is refused, with a misleading
  diagnosis (pre-existing, fail-closed).** `capabilityRefusal` probes the Session's reach while the
  previous Team's `tools.restrict` is still installed, and a restricted-away global tool reads as
  absent. Switching to (or editing toward) a Team that allows a tool the applied Team excluded is
  therefore refused at every boundary and reported as "names capabilities this Session cannot
  reach". Workaround: select **No team** first, then the new Team. Present identically in 0.1.6 and
  before the quarantine fix, so it is not a regression of this release; fixing it means changing a
  security-relevant reachability probe, which is out of scope for a last-mile release.
- **Under PTC a quarantined captain has zero callable tools.** The wire collapses to `run_code`,
  which the quarantine refuses, and the ten exempted names are not directly callable. This is a
  denial, never a widening, but it means the S2 recovery channel is unreachable in that
  presentation mode.
- **`send_message` recovery exemption has a side effect.** A quarantined captain may still message
  a member, which can wake it and delay the task boundary that would release the quarantine. It
  cannot create members or widen its own capabilities.
- **Cross-platform build output is not byte-identical.** The committed `lib/client.js` carries
  Windows path separators inside CSS module style keys, so a Linux rebuild differs in those keys
  (style keys and hashed class names only, ~165 lines). Runtime behaviour is unaffected, and two
  builds on the same platform are byte-identical. The artifact gate therefore asserts
  security-critical declarations rather than a whole-file diff.
- **`selectionPending` is a dead state.** It is declared and projected by the settings controller
  but never assigned and never consumed, so the in-flight indication its documentation promises
  never appears. No unauthorized write results from it.

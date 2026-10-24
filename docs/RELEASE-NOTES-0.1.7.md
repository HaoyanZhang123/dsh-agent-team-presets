# v0.1.7 发布说明 / Release Notes

> 本文件是**发版材料**，供维护者执行正式发布时使用。本轮未创建 Release、未推送 Tag、未执行 `npm publish`。

---

## 中文

### 版本主题

v0.1.7 集成 PR #2 的两个方法型 Team Skill，并修复一个**发布完整性缺陷**：0.1.6 线的安全修复从未进入实际分发的 `lib/` 产物。

### 致谢

- **PR #2 贡献者：张灏焱**（`1814914856@qq.com`）—— 新增 `grilling` 与 `research` 两个方法型 Team Skill、其默认绑定、`NOTICE` 许可证署名，以及预构建产物重建。该重建提交同时把 0.1.6 线遗漏的安全修复带入了 `lib/`。上游技能正文来自 Matt Pocock 的 [skills](https://github.com/mattpocock/skills)（MIT，见 `NOTICE`）。

### 新增

- **方法型 Team Skill：`grilling`、`research`**（PR #2 贡献）
  - `grilling` 默认绑定需求探索团队队长（`discovery-lead`）。
  - `research` 默认绑定需求探索的 `technical-scout` / `product-scout`，以及科研协作的 `evidence-scout`。
  - 两者保留上游英文正文，并附 `## 在 DSH 团队中的用法` 适配段与 `## 来源与许可`。
  - 上游：Matt Pocock, [skills](https://github.com/mattpocock/skills)，commit `5beb35b040e3de97e54fa9e386d7e42d15c295c2`，MIT。完整署名见 `NOTICE`。

### 变更

- **内置 Team Skill 绑定随版本升级自动补齐。** 内置团队身份始终以目录声明为准，因此既有部署无需任何操作即可获得新默认绑定；用户显式解绑仍被保留（`seeded` 标记），自定义团队永不被播种，导入/自定义团队按其自身 `officialSkills` 声明执行。
- **宿主支持范围按实测如实陈述。** `engines.dsh` 范围未变（`>=0.2.0-rc.2 <0.3.0`，由插件管理器强制），但本版本实测环境为 `0.2.1-rc.2`；`0.2.0-rc.2` 本轮未复验，README 已改为如实说明，不再暗示全范围重测。

### 修复

- **0.1.6 的安全修复现在才真正随包发布。** 提交 `c59cbd1` 只改了 `src/`，从未重建 `lib/`——而 `lib/` 才是发布产物。0.1.6 线的 `lib/` 与 `v0.1.6` 标签逐字节相同，因此**完全不含**隔离修复。0.1.7 重新构建了 `lib/`，并新增 `tests/committed-artifact.spec.ts`：一旦产物丢失关键安全声明即失败，且其负向对照（对 `v0.1.6` 产物）确认该门禁确实能拦住 B1。
- **声明默认值不再经「名为 captain 的成员」泄漏到队长槽。** 角色名原按「成员优先」解析，因此手写 settings 文档中一个名为 `captain` 且无 `id` 的成员，会把其默认技能授予队长槽（`captain: true`）。现改为队长分支优先，冲突声明被丢弃而非错误授予。

### 本次复验的安全回归

- **Team 状态误分类导致错误冻结** —— 可证明无 Team 的会话中途选 Team 不再被冻结，选择在任务边界生效。
- **隔离后失去合法恢复通道** —— 隔离中的队长保留精确 10 项非能力工具；队员仍全拒。
- **任务执行期间切换 Team 导致权限提升** —— 取消选择（或切换）+ 重载不再丢失严格策略。
- **状态证据不足时错误放行** —— restore 失败 → No team → 非法 Team 仍进入隔离，不再无守卫放行。

### 已知限制（如实记录，本轮未修）

- **残余 header 窗口：比旧文档描述的更宽，且是确定性的。** 请求日志标记只作阳性证据，因此队长尚未在 Team 下组装过请求的运行中任务没有标记，被判为 unknown。实测「空闲应用 A → 队员运行 → 取消选择 → 重载」**无需任何竞态**即可复现，任务回落部署默认工具面，重新开放该 Team 禁止的能力（PTC 下即 `run_code`，任意代码执行）。旧文档称其为「极窄竞态」是**不准确的**，已在 `src/index.ts` 更正。彻底修复需在应用安装前落盘 durable marker，属独立变更；**不得**通过扩大隔离来修（那会重新引入用户报障的拒绝服务）。
- **「放宽被当前 Team 隐藏的工具」的 Team 会被永久拒绝，且归因错误（既有缺陷，fail-closed）。** `capabilityRefusal` 在上一份 Team 的 `tools.restrict` 仍生效时探测可达性，被限制掉的全局工具读作不存在。缓解：先选「No team」再选目标 Team。0.1.6 与安全修复前行为一致，非本版本回归。
- **PTC 下隔离队长零可用工具。** wire 折叠为 `run_code` 且被隔离拒绝，10 项豁免名不可直调。是纯拒绝，不构成放权，但该形态下恢复通道不可达。
- **`selectionPending` 是死状态。** 已声明并投影，但无赋值、无消费者，其文档承诺的「写入在途」指示不会出现。不产生任何越权写入。
- **跨平台构建产物非逐字节一致。** 已提交的 `lib/client.js` 在 CSS module style key 内含 Windows 路径分隔符，Linux 重建仅在这些 key 与哈希类名上不同（约 165 行），运行时无影响；同平台两次构建逐字节一致。

### 验证摘要

| 项目 | 结果 |
|---|---|
| 单元/组合测试 | 46 文件 / 701 通过 / 1 跳过 |
| 生产 Loader 端到端 | 49 文件 / 707 通过 / 1 跳过 |
| 类型检查 | host 0 / client 0 本地诊断 |
| 构建 | 99 产物，退出 0 |
| 打包（dry-run） | 111 文件，version 0.1.7，含 `NOTICE` 与 4 个技能资产 |
| 产物完整性门禁 | 5 通过；对 `v0.1.6` 产物的负向对照按预期失败 |
| 真实宿主（隔离 `DSH_HOME`） | 冷启动、组件 active、4 技能入库、14 条默认绑定、用户配置/选择/seeded 全保留 |

唯一跳过用例为本轮之前既有，本轮未改动。

### 下一步发布操作（由维护者执行）

```sh
# 1. 确认工作树与测试
git status
DSH_CHECKOUT=<checkout> npm test && npm run typecheck && npm run bundle

# 2. 提交并打标签
git add -A && git commit -m "Release 0.1.7: method Team Skills, artifact integrity, role-isolation fix"
git tag v0.1.7

# 3. 推送（需授权）
git push origin main && git push origin v0.1.7

# 4. 发布
npm publish            # 或按仓库既有流程
gh release create v0.1.7 --notes-file docs/CHANGELOG-0.1.7.md
```

> 注意：`lib/` 必须在提交前完成构建，且提交后不得再次构建而不重新提交——B1 正是这么发生的。

---

## English

### Theme

v0.1.7 integrates PR #2's two method Team Skills and fixes a **release-integrity defect**: the 0.1.6-line security fix had never reached the shipped `lib/` artifact.

### Credits

- **PR #2 contributor: 张灏焱** (`1814914856@qq.com`) — added the `grilling` and `research` method Team Skills, their default bindings, the `NOTICE` licence attribution, and the prebuilt-artifact rebuild. That rebuild commit is also what carried the previously missing 0.1.6-line security fix into `lib/`. The upstream skill bodies come from Matt Pocock's [skills](https://github.com/mattpocock/skills) (MIT, see `NOTICE`).

### Added

- **Method Team Skills `grilling` and `research`** (contributed in PR #2)
  - `grilling` is bound by default to the Discovery captain (`discovery-lead`).
  - `research` is bound by default to Discovery `technical-scout`/`product-scout` and Research `evidence-scout`.
  - Both keep the upstream English body and add a `## 在 DSH 团队中的用法` adaptation section plus `## 来源与许可`.
  - Upstream: Matt Pocock, [skills](https://github.com/mattpocock/skills), commit `5beb35b040e3de97e54fa9e386d7e42d15c295c2`, MIT. Full attribution in `NOTICE`.

### Changed

- **Built-in Team Skill bindings follow the catalog on upgrade.** A shipped identity always declares its current catalog defaults, so an existing deployment gains a new default binding without any user action. An explicit unbind is still preserved (the `seeded` marker), custom Teams are never seeded, and an imported/custom Team keeps its own `officialSkills` declaration.
- **Host support is stated as measured.** The `engines.dsh` range is unchanged (`>=0.2.0-rc.2 <0.3.0`, enforced by the plugin manager), but this release was verified on `0.2.1-rc.2`; `0.2.0-rc.2` was not re-run, and the READMEs now say so instead of implying the whole range was retested.

### Fixed

- **The 0.1.6 security fix now actually ships.** Commit `c59cbd1` changed `src/` only and never rebuilt `lib/` — which is what gets published. The 0.1.6-line `lib/` was byte-identical to the `v0.1.6` tag and therefore did **not** contain the quarantine fix. 0.1.7 ships a rebuilt `lib/`, and the new `tests/committed-artifact.spec.ts` fails if the artifact loses a security-critical declaration; its negative control (against the `v0.1.6` artifact) proves the gate catches B1.
- **A declared default can no longer leak to the captain through a member named `captain`.** Role names were resolved member-first, so a hand-written settings document holding a member literally named `captain` with no `id` had its default granted to the captain slot (`captain: true`). The captain branch now resolves first and a colliding declaration is dropped rather than mis-granted.

### Security regressions re-verified

- **Team state misclassification (wrong freeze)** — a provably No-team Session is no longer frozen when a Team is picked mid-task; the selection applies at the boundary.
- **Lost recovery channel** — a quarantined captain keeps exactly the ten non-capability tools; teammates stay deny-all.
- **Mid-task privilege escalation** — deselect (or switch) followed by a reload no longer drops the strict policy.
- **Fail-open on insufficient evidence** — restore failure → No team → invalid Team still ends up quarantined, never unguarded.

### Known limitations (recorded, not fixed)

- **Residual header window — wider than previously documented, and deterministic.** The request-log marker is positive evidence only, so a running Team task whose captain has not yet assembled a request under that Team has no marker and is classified as unknown. Measured: "apply A while idle → a teammate runs → deselect → reload" reproduces it with **no race at all**, and the task falls back to the deployment-default surface, reopening the capability the Team denied (under PTC that is `run_code`, i.e. arbitrary code). The previous "narrow race" description was wrong and is corrected in `src/index.ts`. Closing it needs a durable marker written before the application is installed — a separate change. It must **not** be closed by widening the quarantine, which would restore the denial-of-service this classification exists to prevent.
- **A Team that widens a tool the applied Team still hides is refused, with a misleading diagnosis (pre-existing, fail-closed).** `capabilityRefusal` probes reachability while the previous Team's `tools.restrict` is still installed. Workaround: select **No team** first. Identical in 0.1.6 and before the quarantine fix, so not a regression.
- **Under PTC a quarantined captain has zero callable tools** — a denial, never a widening.
- **`selectionPending` is a dead state** — declared and projected, never assigned or consumed; no unauthorized write results.
- **Cross-platform build output is not byte-identical** — the committed `lib/client.js` carries Windows separators in CSS module style keys; runtime behaviour is unaffected and same-platform builds are byte-identical.

### Verification summary

| Gate | Result |
|---|---|
| Unit/composition suite | 46 files / 701 passed / 1 skipped |
| Production-Loader e2e | 49 files / 707 passed / 1 skipped |
| Type check | host 0 / client 0 local diagnostics |
| Build | 99 artifacts, exit 0 |
| Package (dry-run) | 111 files, version 0.1.7, `NOTICE` + 4 skill assets |
| Artifact integrity gate | 5 passed; negative control against `v0.1.6` fails as intended |
| Real Host (isolated `DSH_HOME`) | cold start, component active, 4 skills, 14 bindings, user config/selection/seeded preserved |

### Next release steps (maintainer)

```sh
git status
DSH_CHECKOUT=<checkout> npm test && npm run typecheck && npm run bundle
git add -A && git commit -m "Release 0.1.7: method Team Skills, artifact integrity, role-isolation fix"
git tag v0.1.7
git push origin main && git push origin v0.1.7
npm publish
gh release create v0.1.7 --notes-file docs/CHANGELOG-0.1.7.md
```

> Build `lib/` **before** the commit, and never rebuild after committing without committing the result — that is exactly how B1 happened.

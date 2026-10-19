# dsh-agent-team-presets v0.1.6 — 实施报告（IMPLEMENTATION REPORT）

> 状态：**部分交付 / 未发布**。本报告只陈述实际发生的改动与实测结果；未完成项在 §6 逐条列出，且验收单中对应条目标记为 `NOT_RUN` / `BLOCKED`。
> 执行日期：2026-10-19（Asia/Shanghai）
> 对应交接文档：`DSH_AGENT_TEAM_PRESETS_v0.1.6_HANDOFF.md`

## 1. 基线与版本事实

| 项目 | 实际值 |
|---|---|
| v0.1.5 基线 tag | `v0.1.5` → `72d10fece922d0312b5c9ed660653a8a33f90662` |
| 集成分支 | `main` |
| PR #1 合并方式 | 本地 merge commit（未 push 远端；远端合并未执行） |
| PR #1 merge commit | `70f91c5`，保留贡献者三个提交 `9505a70` / `15e0b3c` / `34f8a68`（作者 `HaoyanZhang123 <1814914856@qq.com>`） |
| 目标宿主 | `dsh-v0.2.1-rc.2` = `687f282e8625c6b8d11ff58211a90524be2e4317`（本机已安装 `@deepseek-ai/dsh@0.2.1-rc.2`） |
| 插件版本 | `0.1.6`（`package.json`） |
| v0.1.6 提交序列 | `fa0d9b2`（Gate A）→ `b97aa6e`（类型面）→ `08a27b1`（Gate B）→ `c16d27f`（Gate C） |

**远端合并未执行的原因**：本机 git 推送守卫拒绝把该本地仓库推送到公开目标（`~/.git-guard/public-allowlist.txt` 未收录该仓库）。按交接 §0.2 的要求，已停止远端写操作，把 PR 合并以**本地 merge commit** 完成，远端合并列为待办。

## 2. 宿主隔离

- **未修改 DSH 宿主源码、已安装宿主包、profile 实现文件或 node_modules。** 全部构建/测试都在本仓库内进行，`DSH_CHECKOUT` 指向一份只读使用的独立 clone（`Plugins/.dsh-checkout/dsh-0.2.1-rc.2`，仅用于 `npm test` / `npm run typecheck` 的路径映射与类型解析）。
- 唯一对宿主的“写入”是把该 clone 的 pnpm 依赖装好并编译其 `native/system` 宿主插件（用于运行宿主栈的测试），这发生在我们自己的 clone 内，不是用户已安装的宿主目录。
- 兼容范围：`package.json` 的 `engines.dsh` 保持 `>=0.2.0-rc.2 <0.3.0`（0.2.1-rc.2 满足该串），peer 范围对每个 0.2.x 包补了 `|| >=0.2.1-rc.2 <0.3.0`，因为**半开区间 `>=0.2.0-rc.2 <0.3.0` 并不匹配 `0.2.1-rc.2` 这类预发布**（实测：`semver.satisfies('0.2.1-rc.2', '>=0.2.0-rc.2 <0.3.0') === false`）。这是“只改版本字符串不够”的具体证据。

## 3. 阶段 A — 0.2.1-rc.2 适配（已完成）

1. **依赖**：devDependencies 全量对齐 `0.2.1-rc.2`（`@deepseek-ai/dsh-*`），`cordis` `~4.0.5`、`cordis-plugin-loader` `~1.0.6`、`@deepseek-ai/dsh-skill` 作为 optional peer + dev 依赖。
2. **公共 API 迁移**（均为 0.2.1 真实签名，未靠猜测）：
   - `@deepseek-ai/dsh-session-persistence-jsonl` 改为命名空间导入（0.2.1 无 default 导出）。
   - `SubagentProvider.start` 变为可选 → 成员执行别名按上游实际成员镜像，不再调用可能不存在的 `start`。
   - `SubagentRuntime.drainContinuableChildren` → `drainChildren`；`start(...)` → `startActivation({provider, label, request, signal, delivery})`。
   - `SkillProvider.get(candidate, options)` 新增参数；`SkillCandidate` 的 `resourceBase` 在 `exactOptionalPropertyTypes` 下不可显式 `undefined`。
   - 客户端 settings mirror 的 status 联合类型不再含 `'unavailable'`（改为 `idle|loading|ready` + `error`），页面据 `view` 与 `error` 推导。
   - `mountAgentLoopTestDependencies` 需要 `workingDirectory: true`（0.2.1 的 `SubagentRuntime` 声明 `inject: ['workingDirectory']`）；测试 fixture 相应补齐。
   - 宿主把 Team 应用改为**排队 + 等待 prompt 组装**后安装，测试因此改用可观测的“成员工具已注册”作为屏障（`waitForTeamApplication`），不再用固定宏任务数猜测。
3. **可选包不阻断加载**：删除了 `src/skills.ts` 对 `@deepseek-ai/dsh-skill` 的**顶层值导入**（`BUNDLED_SKILL_RANK` 改为本地常量并注明来源）。这样缺少该包时 `lib/index.js` 仍可加载，只损失两个技能。

## 4. 阶段 B/C — 九个官方团队、展示元数据、本地分类（已完成，UI 部分见 §6）

1. **唯一官方目录** `src/team-catalog.ts`：3 个研发规模 + 6 个工作模式，稳定 ID 全部沿用（`builtin-lightweight` / `standard` / `fullstack` / `discovery` / `planning` / `workflow` / `engineering` / `audit` / `research`），每个条目带固定 `series`、展示元数据、以及官方默认技能声明（仅 workflow 与 engineering 的 `repository-specialist`）。
2. `src/builtin-teams.ts` 改为该目录的投影：播种、恢复、“恢复全部默认”都只有一条事实源；`contrib/default-presets/` 重新生成九份 **v2** 文档，测试保证二者不可能漂移。
3. **迁移语义**（`seedBuiltinTeams` + `seededDefaults`）：新装一次得到九个；0.1.5 升级只补六个、三个原样保留；用户删过的内置团队不会因重启/升级复活；“恢复全部”是唯一复活路径且只影响官方九个，自定义团队不受影响。
4. **展示元数据**：`TeamPreset.metadata?`（summary/tags/useCases/quickPrompts/notes），完全可选。`definitionFingerprint` 不含 metadata，因此元数据编辑不会触发 Team 重新应用；`tests/metadata-boundary.spec.ts` 用近 16KB 元数据断言 captain briefing、每个 member briefing、member roster、member team division 与 fingerprint **逐字节相同**。
5. **预设传输 v2**：写出 v2、兼容读取 v1；v2 新增 `metadata` 与 `officialSkills`，每个字段/数组/整文档都有上限，未知字段一律拒绝（不静默丢弃）；个人 Team Skill 资产、成员绑定、分类关系、本地路径**永不导出**。
6. **本地分类**：`config.categories` / `config.teamCategories`（Volatile），`src/team-search.ts` 提供唯一确定性检索/分组模型（来源来自目录而非用户字段、加权关键词只索引发现字段、系列/分类筛选、分类增删改序）。启动 reconcile 会清理“分类已删/自定义团队已删”的死关联，但保留指向官方 ID 的关联（恢复默认后回到原分组），且仅在实际清理时多写这两个字段。

## 5. 阶段 D — Team Skills（核心已交付，UI 未交付）

**替代 PR #1 的全局注册**：新增 `src/team-skills/`，按 `teamId + roleId`（队长独立 `captain` 槽位）分配，**只在目标 Agent 自己的 Cordis scope 内**注册 provider。

| 模块 | 职责 |
|---|---|
| `paths.ts` | 唯一路径判定：规范化相对路径、解析后必须仍在资产根内、单文件/单目录上限、文本/二进制判定、拒绝符号链接 |
| `import.ts` | 目录与 ZIP 导入；ZIP 自行解析中央目录 + 原始 inflate（无新依赖），拒绝声明尺寸炸弹、重复项、加密项、穿越路径；frontmatter 必填 `name`/`description`，其它键（`license`/`compatibility`/`allowed-tools`/自定义）**原样保留**，不改写第三方 `SKILL.md` |
| `store.ts` | 完整文件夹、不可变版本目录 `<root>/assets/<assetId>/<version>/`；编辑=发布新版本（运行中成员继续读旧版本）；内置技能幂等落盘、覆盖版落后时只置 `updateAvailable` 不自动合并；内置资产只读 |
| `manager.ts` | 绑定存 `bindings.json`；删除强校验：角色绑定 / 活跃成员 / 显式 `otherSkills` 依赖 → 拒绝并列出全部原因；文本疑似引用只告警 |
| `provider.ts` | `inject(['skills'])` 内 `createScope(ctx, agent)` → `scope.ctx.skills.registerProvider(...)`；候选只含被分配资产，正文按需从版本固定目录读取；释放用 provider 自身 disposer（同步撤销发现） |
| `index.ts` | 私有根解析（`skillRoot` 配置优先，否则 `$DSH_HOME`/`~/.dsh` 下插件自有目录）、内置技能加载、按角色解析与生命周期 |

**运行时接线**（`src/index.ts`）：成员被 claim 后按其**持久化快照**的 `teamId/roleId` 同步；队长用独立 `captain` 槽位；`agent/disposed` 释放；`loader/volatile-update` 重新同步；teardown 释放全部 scope。

**为何根目录是推导值**：0.2.1-rc.2 未发布“每插件数据目录”公共 API（在已安装宿主包的公开类型中检索 `dshHome`/`profileDir` 无插件可用入口），因此默认路径是 `$DSH_HOME|~/.dsh/agent-team-presets/team-skills`，并保留 `skillRoot` 配置显式覆盖；它不是任何用户级/项目级技能目录。

**MCP**：仅按交接要求保留“依赖声明/可见性”数据模型（`TeamSkillDependencies`），**未实现**按成员动态挂载 MCP 连接——0.2.1-rc.2 的公开 API 没有该能力，按交接 §8C.2 记为 Blocked，不做全局注册冒充。

## 6. 未完成 / 偏差（必须与验收单一起看）

| 项 | 状态 | 原因 |
|---|---|---|
| `npm run bundle` 重新生成 `lib/` | **BLOCKED** | 0.2.1 的 `@deepseek-ai/dsh-session` 对 `TypertResourceMap` 做了 interface merge，而 typert 生成器要求**被 merge 的每个声明都在同一 workspace root 的注册包内**；本插件的独立隔离构建只 stage `typert/protocol`，因此报 `merged interface TypertResourceMap contains a declaration outside this face`。已验证这不是本插件代码问题：同一生成器在“宿主 checkout 内”跑也有独立的源解析差异，需要单独修 `tools/build.mjs` 的 stage 范围。**`lib/` 仍是 PR #1 的产物，与当前源码不一致，不能作为 0.1.6 发布包。** |
| Team Skills 的设置页 CRUD/分配/升级 UI（U07–U16） | **NOT_RUN** | 未实现；Host 侧 store/manager/provider 已就绪但缺少 Remote 服务与页面。 |
| Team Skills 远程服务（`remote.teamSkills`） | **NOT_RUN** | 同上。 |
| 分类 CRUD UI（U03）与列表分组交互（U02 部分） | **NOT_RUN** | 数据模型、检索/分组纯函数、启动清理已完成；页面动作未接线（unused import 已移除，未留半成品入口）。 |
| README/README.zh 更新、截图、CHANGELOG | **NOT_RUN** | 按交接 §8D，文档应在 Desktop 验收后再改；当前不具备该前提。 |
| Desktop 原装安装验收 | **NOT_RUN** | 未执行；验收单所有 DESKTOP 项均为 `NOT_RUN`，不得视为通过。 |
| Web GUI 实机截图（U01–U22） | **NOT_RUN** | 同上。 |

## 7. 改动文件

新增：`src/team-catalog.ts`、`src/team-search.ts`、`src/team-skills/{paths,import,store,manager,provider,index}.ts`、`tests/{team-search,metadata-boundary,team-skills}.spec.ts`、`contrib/default-presets/{lightweight,standard,fullstack}-team.json`（重建）。
改写：`src/builtin-teams.ts`、`src/preset-transfer.ts`、`src/config.ts`、`src/types.ts`、`src/settings-reconcile.ts`、`src/skills.ts`、`src/index.ts`、`src/member-identity.ts`、`src/member-store.ts`、`src/client/team-presets-controller.ts`（mirror status + StoredSection 回退）、`src/client/locales.ts`、`tsconfig.host.json`、`package.json`、九份 contrib 文档。
新增（同伴产出、已并入）：`src/client/team-grouping.ts`、`src/client/team-metadata.ts`。
测试适配：`tests/boundary-regressions.spec.ts`、`member-injection`、`member-identity`、`security-regressions`、`settings-reconcile`、`preset-transfer`、`builtin-teams`、`team-presets-controller.client.spec.ts`、`fixtures/plugin-harness.ts`。

## 8. 结论

Gate A、Gate B 与 Gate C 的**代码与单元级证据**已完成；Gate D（UI/Agent 双入口的完整可视化管理）与 Gate E（发布包、README、Desktop 验收）**未完成**。
按交接 §10 的判定：当前状态是 **候选待复测（Candidate / not releasable）**——不是完整通过，也不应发布。

# dsh-agent-team-presets v0.1.6 — 开发与生产兼容验收单（由执行 Agent 填写）

> **模板状态：全部待测；任何未执行用例都不得提前标 PASS。**  
> 对应 [开发 Handoff](./DSH_AGENT_TEAM_PRESETS_v0.1.6_HANDOFF.md) 和 [全视图交互原型](./DSH_AGENT_TEAM_PRESETS_v0.1.6_NATIVE_UI_PROTOTYPE_REVISED_V2.html)。  
> **双环境独立结论：Web = 开发/调试环境；Desktop = 生产发行包兼容验收环境。** Web 的 PASS 不能推导出 Desktop 的 PASS。  
> 生产 Desktop 绝不修改宿主源码、打包文件、插件系统代码或 node_modules。  
> 建议单份工作副本放执行交接目录；提交到公开仓的用户文档不得混入此文件或执行过程记录。

## 0. 实际执行信息（必须填写）

| 项目 | 执行 Agent 填写 |
|---|---|
| 执行负责人 / Agent | 执行 Agent（Team Lead） |
| 开始/结束时间（时区） | 2026-10-19 08:07 → 2026-10-19 09:00（Asia/Shanghai） |
| 插件代码分支 / 起止 commit | `main`；起 `70f91c5`（PR merge）→ 止 `c16d27f` |
| PR #1 合并方式 / merge SHA / 合并日期 | **本地 merge commit** `70f91c5`（2026-10-19），保留贡献者 3 个提交；**远端 PR 未合并**（git 守卫禁止推公开仓，见 R-04） |
| 插件源码版本、package 发布版本 | 源码 `0.1.6`；**未发布 npm / 未建 GitHub Release** |
| `0.2.1-rc.2` 目标宿主 release / commit SHA | `dsh-v0.2.1-rc.2` = `687f282e8625c6b8d11ff58211a90524be2e4317` |
| Web 开发环境 OS、Node、npm/pnpm、浏览器 | Linux x86_64；Node v22.23.3；npm 10.9.9；pnpm 11.7.0（仅用于宿主 clone）；**未使用浏览器** |
| Desktop **原装正式安装** OS、安装包 build、应用版本 | **未执行（NOT_RUN）** |
| Desktop 安装插件来源（包名、tarball SHA-256） | **未执行（NOT_RUN）** |
| Desktop 是否使用宿主源码修改、补丁、替换 node_modules | **NO**（全程未修改任何宿主安装；本项不构成 FAIL 依据，因为 Desktop 一侧未运行） |
| Web 与 Desktop 是否相同的插件产物 SHA-256 | `N/A`（Desktop 未执行；且见 R-01，`lib/` 未按当前源码重建） |
| 原 v0.1.5 配置备份目录/校验 | 未对真实用户配置做备份/升级演练（NOT_RUN）；迁移逻辑仅在测试夹具上验证 |
| 报告/截图/日志位置（仅相对路径，无密钥） | `docs/DSH_AGENT_TEAM_PRESETS_v0.1.6_FINAL_HANDOFF_BUNDLE/IMPLEMENTATION_REPORT.md`、`TEST_REPORT.md`；无截图 |

**结果标记：** `PASS`（附证据）/ `FAIL`（附复现）/ `BLOCKED`（说明第三方或宿主限制与证据）/ `NOT_RUN`（实际未执行）/ `N/A`（给出原因）。不得因为 PR 作者说测试通过而自动标 PASS。

**分工提示：** 标记 `WEB` 仅适用于开发环境验证；`DESKTOP` 仅适用于正式安装；`BOTH` 需要分别记录证据，不能共用一次测试充当两次。

## 1. 发布阻断级 Gate（每项必须有明确结论）

| Gate | 内容 | Web | Desktop | 实证链接/命令/说明 |
|---|---|---|---|---|
| G00 | 从开始到结束没有修改宿主源码、已装宿主包或 profile 实现文件 | `PASS` | `N/A` | 全程仅改本仓库；`DSH_CHECKOUT` 为独立 clone，只读消费。已装宿主 `@deepseek-ai/dsh@0.2.1-rc.2` 未被改动 |
| G01 | PR #1 真实集成，贡献者署名/commit 保留，版本设为 0.1.6 | `PASS`（本地） | `N/A` | merge `70f91c5` 保留 `9505a70`/`15e0b3c`/`34f8a68`（作者 HaoyanZhang123）；`package.json` = `0.1.6`。**远端未合并** |
| G02 | 目标宿主 `0.2.1-rc.2` 插件正常加载，不影响普通会话 | `PASS`（自动化） | `NOT_RUN` | 498 用例在 0.2.1-rc.2 宿主栈上通过，含 `apply()` 真实挂载与普通会话路径；未见 GUI 实机加载 |
| G03 | Web 构建与 **Desktop 正式包 GUI 安装**都通过且使用相同可追溯产物 | `PASS`（构建） | `NOT_RUN` |  `npm run bundle` 现退出码 0：93 个产物，host/client 零本地诊断，`lib/` 已按当前源码重建。Desktop 正式包安装仍为 NOT_RUN |
| G04 | 九个官方预设、旧用户迁移、恢复默认/删除保护全部通过 | `PASS`（自动化） | `NOT_RUN` | `builtin-teams.spec.ts`、`settings-reconcile.spec.ts`；无 GUI 证据 |
| G05 | Team Skill 在真实目标成员 Scope 隔离；绝无全局静默注册 | `PASS`（代码级，真实 SkillRegistry） | `NOT_RUN` | `team-skills.spec.ts`：A 可见 / B 与全局不可见 / 释放后撤销 / 构造时无全局注册 |
| G06 | 删除依赖阻断由后端执行，内置 Skill 版本切换/回滚正确 | `PASS`（代码级） | `NOT_RUN` | 三重阻断用例 + 覆盖版/升级标记用例；**无 UI 入口** |
| G07 | 原模型路由/工具权限/Agent Team 原生协作能力无回归 | `PASS`（自动化） | `NOT_RUN` | 原 427 用例中除宿主 API 适配外全部保留并通过；应用排队/成员身份/严格策略用例均绿 |
| G08 | 配置兼容与禁用可选服务后的安全降级有证据 | `PASS`（部分） | `NOT_RUN` | 缺 skill 服务降级用例；v1→v2 读取；**0.2.0-rc.2 实机未测** |
| G09 | UI 覆盖 U01–U18 并有 Web / Desktop 实截图 | `PARTIAL` | `NOT_RUN` |  Web 截图已归档到 `docs/shots/` 并附 `INDEX.md` 说明每张图对应哪一项；Desktop 截图因无 Desktop 包仍然缺失，属环境阻塞 |
| G10 | 对外文档按实际完成情况更新、中文英文无关键矛盾 | `PASS` | `NOT_RUN` |  README.md / README.zh.md 的 Features 按 0.1.6 重写；新增 `docs/CHANGELOG-0.1.6.md`（Added/Changed/Fixed，含本轮真机暴露的三个缺陷）。仓库根 `CHANGELOG.md` 被 .gitignore 忽略（发布流水线生成），故放在 docs/ 下，仍未提交生成式 changelog |
| G11 | 官方 Skill 与 MCP 依赖严格区分、无未授权 MCP 自动连接/凭据泄漏 | `PASS`（声明层） | `NOT_RUN` | 仅有依赖声明数据模型；无自动连接、无凭据落盘；动态挂载按 Blocked 记录 |

**硬性判定规则：** Desktop G00 / G02 / G03 / G05 / G06 / G07 / G11 任一 `FAIL`、`BLOCKED` 或 `NOT_RUN`，**不得签署“完整通过，可发布”**。`BLOCKED` 可以交付代码及报告，由维护者决定功能删减/版本策略；不得静默绕开。

## 2. 环境与基础构建（记录原样命令/退出码）

| ID | 测项 | Web 开发环境结果 | Desktop 生产环境结果 | 证据/复现 |
|---|---|---|---|---|
| E01 | git status、plugin 基线、PR 分支、合并 SHA 截图/记录 | `PASS` | `N/A` | 基线 `v0.1.5`=`72d10fe`；PR head `34f8a68`；merge `70f91c5`；分支 `main` |
| E02 | 宿主公开 API / Scope 能力探针（含原始 log、能力表） | `PASS` | `NOT_RUN` | 以编译+运行期用例代替独立探针：`start` 可选、`drainChildren`、`startActivation`、`SkillProvider.get(candidate, options)`、`SkillRegistry` 分层、`createScope`/`scopeOf`、mirror 形状 |
| E03 | `npm test`（记录数字、跳过/失败原因） | `PASS` | `N/A` | 31 文件 / 498 用例全绿，0 skipped；命令见 TEST_REPORT §2 |
| E04 | `npm run typecheck` | `PASS` | `N/A` | host 0 / client 0 local diagnostics |
| E05 | `npm run bundle` & lib 与源码一致 | `PASS` | `N/A` |  `npm run bundle` exit 0（93 artifacts）；构建改为宿主 workspace 形态 stage + aggregate 引用 `tsconfig.host.json` 文件 |
| E06 | `npm pack --dry-run` + `npm pack`；所有 assets/skills、源码 map/声明按预期 | `PASS` | `N/A` | `npm pack --dry-run`：80 文件，两份 `assets/skills/**/SKILL.md` 与 `lib/*`、`locale/*` 均在包内 |
| E07 | 缺 `@deepseek-ai/dsh-skill` optional 包也可启动旧功能 | `PASS` | `NOT_RUN` | `src/skills.ts` 已移除 optional 包顶层值导入；缺 skill 服务时 provider 报 unavailable 且 Team 功能不受影响（用例） |
| E08 | Windows 构建 npm.cmd spawn、TS 声明 machine path 未泄漏 | `NOT_RUN` | `NOT_RUN` | 无 Windows 环境 |
| E09 | Web 正式 bundle 加载，与源码开发启动表现一致 | `PASS` | `N/A` |  验证 profile 安装并运行的就是 `npm run bundle` 的产物（`lib/`），启动与页面表现一致，无源码软链 |
| E10 | Desktop GUI → Plugins → 添加/启用/关闭/重启/卸载/重装插件 | `N/A` | `NOT_RUN` | `TBD` |
| E11 | Desktop 不依赖开发服务器、源码软链接、管理员临时补丁 | `N/A` | `NOT_RUN` | `TBD` |
| E12 | Desktop 正式插件包与 Web 包哈希、manifest 一致 | `NOT_RUN` | `NOT_RUN` | 见 E05 |
| E13 | 宿主版本超出已测区间/服务缺失时正确提示与降级，不崩溃 | `PASS`（部分） | `NOT_RUN` | 能力缺失时降级：skill 服务缺失、存储域缺失、成员快照缺失均有明确拒绝/降级用例；宿主版本区间外未测 |
| E14 | 扫描二进制/源码包引用：没有 runtime 写宿主目录、没有未公开内部 deep import | `PASS` | `PASS` | 源码检索：无 runtime 写宿主目录；`@deepseek-ai/*` 仅公共子路径导入（`/client`、`/types`、包根），无未公开 deep import |

**原始命令及返回（执行时填）：**

```text
$ [exact command]
exit code: [number]
selected output: [redacted]
log relative path: [path]
```

## 3. 团队数据/迁移/分类/元数据（Web 与 Desktop 独立测试）

> 本节 `Web` 列 = 自动化/源码级证据；`Desktop` 列全部为 `NOT_RUN`（未在正式安装中执行）。

| ID | 测项 | Web | Desktop | 证据 |
|---|---|---|---|---|
| T01 | 全新安装恰有 9 个内置；研发规模 3 + 工作模式 6 | `PASS` | `NOT_RUN` | `builtin-teams.spec.ts`「ships exactly nine…」「ships the nine documents…」 |
| T02 | 旧 v0.1.5 3 个内置团队/自定义团队无损升级，仅首次补 6 个 | `PASS` | `NOT_RUN` | `seedBuiltinTeams` 升级用例；`settings-reconcile.spec.ts`「upgrades a 0.1.5 deployment…」 |
| T03 | 已编辑队长/队员 Prompt、路由、推理强度、工具策略保持不变 | `PASS` | `NOT_RUN` | `editedShipped` 用例断言 route/policy 原样保留 |
| T04 | 历史删除的内置团队不因升级或重启静默复活 | `PASS` | `NOT_RUN` | 「never reinstalls a preset the user deleted」「does not resurrect a 0.1.5 Team…」 |
| T05 | 恢复全部默认主动恢复且只恢复 9 个，不删除自定义团队 | `PASS` | `NOT_RUN` | 「restores exactly nine official Teams…」「never touches a Team the user created」 |
| T06 | 恢复单个官方团队、修改官方团队、复制删除均遵循旧 CRUD 语义 | `PASS`（逻辑） | `NOT_RUN` | 恢复单团队用例；复制/删除 UI 未改（沿用 0.1.5） |
| T07 | 重复启动/热重载/失败后重试迁移无重复播种、无数据漂移 | `PASS` | `NOT_RUN` | 幂等用例（连跑两次 changed=false） |
| T08 | 官方来源标记不可被恶意普通导入 JSON 伪造 | `PASS` | `NOT_RUN` | 来源由 `builtinEntry(team.id)` 决定；导入不写来源字段（`team-search.spec.ts`） |
| T09 | 官方两个系列固定；自定义类别可创建、改名、移动、删除 | `PASS` | `NOT_RUN` |  真机：新建/删除/归属/过滤 + 本轮补齐改名（审核→质量审核，配置文件同步）与上移/下移（两个分类顺序互换）；order 存为 0..n-1 |
| T10 | 删除分类不删除任何团队；恢复默认不清空个人分类 | `PASS`（纯函数） | `NOT_RUN` | `withoutCategory` 用例；恢复默认只改 `teams`/`metadata`，不触碰分类字段 |
| T11 | metadata 可完全为空；官方预设有区别清晰的初始说明 | `PASS` | `NOT_RUN` | 九个 summary/tags/useCases/quickPrompts 非空且互不重复（用例） |
| T12 | 添加 10 KB metadata 后运行时 prompt、spawn tool description、快照严格等值 | `PASS` | `NOT_RUN` | `metadata-boundary.spec.ts`（近 16KB，逐字节相等） |
| T13 | 导入 v1、导出 v2 并 round-trip；完整元数据保留 | `PASS` | `NOT_RUN` | `preset-transfer.spec.ts` |
| T14 | 自定义 Skill 资产/成员私有绑定/绝对路径/模型密钥不进入分享 JSON | `PASS` | `NOT_RUN` | 导出断言不含 provider/model/toolMode/本地路径/skill 绑定 |
| T15 | 官方随包 Skill 的默认关联声明跨导入导出可解析，不隐式复制资源 | `PASS`（数据层） | `NOT_RUN` | `officialSkills` round-trip 用例；导入不创建本地绑定 |
| T16 | 数据损坏/格式错误/版本冲突提示清晰且可恢复，不悄悄重置数据 | `PASS`（部分） | `NOT_RUN` | 文档层拒绝原因齐全；存储/绑定文档损坏时拒绝打开而非清空（用例）。页面提示文案未在 GUI 验证 |

## 4. 全视图 UI U01–U22（Web/Desktop 各需截图或录像）

**本轮未交付页面级验证，也无任何截图。** 下表 `Web` 列若无注明一律 `NOT_RUN`。

| ID | 视图与主要交互 | Web | Desktop | UI 证据 / 问题 |
|---|---|---|---|---|
| U01 | 设置 → 配置：团队预设、团队技能入口均在 | `PASS` | `NOT_RUN` |  真机多次确认：设置 → 智能体团队预设 内含「团队预设 / 团队技能」两个 tab，入口均在 |
| U02 | 团队列表：来源筛选、两系列、分类、搜索、九团队与空态 | `PASS` | `NOT_RUN` |  真机：列表页搜索框 + 全部/插件内置/自定义/研发规模/工作模式 五个 chips；「审计」查询把列表收窄到 1 行；计数行「匹配 N · 展示信息不会注入运行时上下文」 |
| U03 | 分类 CRUD、团队移动、分组删除安全语义 | `PASS` | `NOT_RUN` |  真机：新建「审核」与归属均落盘且重启存活；点 chip 后 匹配 10 → 1；删除后 chip 消失 |
| U04 | 团队详情：运行时标签、提示块、元数据分组展示 | `PASS` | `NOT_RUN` |  真机：团队详情有「队长会接管本会话…」提示块、运行时说明「当前没有会话在执行该团队任务，保存后立即生效」，以及折叠的展示元数据分组 |
| U05 | 队长/成员 Prompt、模型、工具原有编辑能力没有缩水 | `PASS`（回归） | `NOT_RUN` | 原有编辑用例保持通过（未改页面） |
| U06 | 元数据编辑标注不进入运行时上下文；标签半角逗号 | `PASS` | `NOT_RUN` |  真机：团队编辑页出现「团队展示信息 仅用于展示」折叠面板（简介/标签/适用场景/推荐任务/备注），写入单个 metadata patch |
| U07 | 每成员 Skill 三列九宫格勾选分配 | `PASS` | `NOT_RUN` |  真机：成员编辑页出现 Team Skill 九宫格；勾选即分配（checked false→true），绑定落在 (teamId, roleId, assetId) |
| U08–U16 | Skills 库/详情/导入/覆盖/删除阻断/升级/MCP/无 Agent 按钮/导入导出说明 | `NOT_RUN` | `NOT_RUN` | 后端能力已有，页面与 Remote 服务未实现 |
| U17 | Composer：默认「未选择团队」固定顶部、统一搜索/分类 | `PASS` | `NOT_RUN` |  真机：分类 chips 与来源 chips 并列可用；分类过滤收窄生效 |
| U18 | 错误、权限、资源缺失、平台限制空态/边界 | `PASS` | `NOT_RUN` |  真机空态：`还没有安装任何团队技能`、`没有匹配的团队`、`尚未分配给任何成员`、`此技能未声明 MCP 服务或运行环境依赖` |
| U19–U22 | 窄窗口/主题/双语/键盘；Composer 忙碌与多会话 | `NOT_RUN` | `NOT_RUN` | 未验证 |

## 5. Team Skill 完整资源、作用域、删除与升级

`Web` 列证据均为 `tests/team-skills.spec.ts`（真实 `SkillRegistry` + 真实 store），`Desktop` 全部 `NOT_RUN`。

| ID | 测项 | Web | Desktop | 证据 |
|---|---|---|---|---|
| S01 | Team 私有目录不被 DSH 原生用户/项目 Skill 扫描 | `PASS` | `NOT_RUN` | 根目录为 `$DSH_HOME/agent-team-presets/team-skills`，非用户/项目技能目录；无全局 provider |
| S02 | 只含 SKILL.md 的标准包安装正确，YAML 必填/命名验证正确 | `PASS` | `NOT_RUN` | import 用例 |
| S03 | 完整资源包 scripts/*.py、*.sh、assets、references、任意合法目录保留 | `PASS` | `NOT_RUN` | RICH 夹具用例 |
| S04 | 可选 frontmatter license/compatibility/metadata/allowed-tools 无损保留 | `PASS` | `NOT_RUN` |  真机：导入后磁盘出现在私有库目录下，2 个文件、路径未被拍平 |
| S05 | 同名但不同来源冲突给出真实处理，不偷改原生 Skill | `PASS` | `NOT_RUN` |  真机：同一 skillId 下 builtin/override/custom 三个资产并存；详情页出现「同名，各自独立」标签与说明「互不覆盖，插件不会改写任何全局 Skill」；单测证明删除用户副本后官方副本仍在 |
| S06 | 没选 Team 的普通 Agent 看不到本插件专属 Skill 元数据 | `PASS` | `NOT_RUN` | 无全局注册用例（构造后立即 list 为空） |
| S07 | 选 Team 但未 spawn 对应成员，不全局注册它的专属 Skill | `PASS` | `NOT_RUN` | 注册仅发生在成员被 claim 后（`src/index.ts`） |
| S08 | 成员 A 可发现/加载仅绑定 A 的 Skill，成员 B 与另一团队不可获取 | `PASS` | `NOT_RUN` | A/B 隔离用例（list 与 get 双路径） |
| S09 | 包括队长在内的各角色单独分配/解除；普通 Session 不受影响 | `PASS`（代码级） | `NOT_RUN` | 队长独立 `captain` 槽位；分配/解除用例 |
| S10 | 发现 metadata 和按需加载正文分离；资源不是自动全部进入 Prompt | `PASS` | `NOT_RUN` | 候选只含 name/description；`get()` 才读正文 |
| S11 | fresh/fork/恢复/退出/热重载/卸载/切 Team 后无残留 Provider | `PASS`（部分） | `NOT_RUN` | release 同步撤销发现用例；宿主侧 fresh/fork 未逐一实测 |
| S12 | 无/禁用 Skill 服务，旧团队功能仍能加载并有提示 | `PASS` | `NOT_RUN` | unavailable 降级用例；顶层值导入已移除 |
| S13 | 通过文件/ZIP 导入恶意路径、symlink、ZIP bomb 均拒绝且不污染库 | `PASS` | `NOT_RUN` | 穿越/加密/炸弹/重复/超大用例；symlink 在 store 读取时拒绝 |
| S14 | UI 与 Agent 双入口共享后端权限、revision/事务和验证 | `PASS` | `NOT_RUN` |  页面入口全部可用；Agent 侧 4 个工具已接线（round 9 证实此前的失败是测试屏障竞态，非工具副作用）并共用同一 manager 与阻断规则；真机模型调用因验证 profile 凭据无效未执行（见 TEST_REPORT §7） |
| S15 | Skill 有成员绑定 → 删除强阻断，展示所有角色依赖 | `PASS` | `NOT_RUN` |  真机：已绑定的技能点删除并确认，宿主一次性列出 `binding: 轻量研发团队 → team-lead` 等全部阻断理由 |
| S16 | Skill 被活动 Agent 使用 → 删除阻断、资源不消失 | `PASS` | `NOT_RUN` |  真机：阻断理由含 `active: <持有者>`（本轮改为真实 Agent 标识，新增单测覆盖） |
| S17 | 显式依赖阻断、疑似文本依赖警告；解除依赖后可以事务删除 | `PASS` | `NOT_RUN` | dependency 阻断 + 文本告警用例 |
| S18 | 原版官方内置 Skill 只读；编辑创建本地覆盖，不更改资产包 | `PASS` | `NOT_RUN` |  真机：把 override 的 baseVersion 标为落后后，列表行与详情页同时出现「已启用本地覆盖」标签；改回后消失 |
| S19 | 内置 Skill 整目录 SHA 校验、版本比对、更新、原版恢复、回滚 | `PASS`（部分） | `NOT_RUN` | digest/updateAvailable/`resetOverride` 用例；UI 未实现 |
| S20 | 运行成员引用版本固定；插件升级/文件保存不能改坏运行成员资源 | `PASS` | `NOT_RUN` | 版本目录不可变用例 |
| S21 | 旧用户 Skill 覆盖版升级不会丢失、自动覆盖或自动合并 | `PASS` | `NOT_RUN` | `updateAvailable` 标记用例（不合并） |
| S22 | Windows/Desktop 打开目录/路径复制/安全文件访问降级 | `NOT_RUN` | `NOT_RUN` | 未实现 UI、未在 Windows 测试 |

## 6. MCP、脚本与通用规范专项

| ID | 测项 | Web | Desktop | 证据 |
|---|---|---|---|---|
| M01 | 官方 Agent Skills 必填/可选 frontmatter 兼容与未知字段保留 | `PASS` | `NOT_RUN` | import 用例 |
| M02 | 不强制额外私有 manifest 写入第三方 SKILL.md | `PASS` | `NOT_RUN` | 原文逐字节保留用例 |
| M03 | Skill 依赖 required/optional MCP serverName/tool/resource 可保存并展示 | `PASS` | `NOT_RUN` |  真机+单测：详情页按依赖逐条展示；MCP 标「已声明」，可执行文件按 PATH 解析为「存在/缺失」 |
| M04 | required 缺失有具体阻断/降级提示；optional 缺失仅提示 | `PASS` | `NOT_RUN` |  阻断规则+单测；真机详情页红色横幅与「PATH 中缺失」标签；真机成员页勾选被拒：出现 `dependency-missing: the executable "…" is not on PATH` 且 4 个勾选框全部保持未选中（没有写入绑定） |
| M05 | 连接失败、权限拒绝、离线，UI 不假报「已加载」 | `PASS` | `NOT_RUN` |  真机（权限拒绝场景）：把库目录 chmod 000 后重启，面板只显示「the Team Skill store could not be opened in this deployment」，没有出现「全部/插件内置/自定义」等已加载元素，也未显示空库；恢复权限后列表正常回来 |
| M06 | 未授权/未分配成员时不启动 stdio、HTTP MCP，不注册额外工具 | `PASS`（结构性） | `NOT_RUN` | 本插件不启动任何 MCP 连接（无相关代码路径） |
| M07 | 探针确认动态 MCP per-agent 生命周期受官方 API 支持与否 | `PASS`（负结论） | `NOT_RUN` | 0.2.1-rc.2 公开 API 无 per-Agent 动态挂载入口 → **Blocked**，不做全局伪隔离 |
| M08 | 如实现动态挂载：仅目标作用域生效、注销准确 | `N/A` | `N/A` | 未实现（M07 Blocked） |
| M09 | MCP 凭据只走安全引用/环境，UI/JSON/日志/tarball 无明文 | `PASS`（未有凭据） | `NOT_RUN` | 无凭据字段、无连接代码 |
| M10 | Skill 中 .py/.sh 可读不代表可执行，执行遵循成员 Tools 权限 | `PASS`（结构性） | `NOT_RUN` | 导入/存储从不执行；执行仅经成员工具策略 |
| M11 | Shell/Python 缺失或 Windows 路径不同，给出明确错误，不改宿主 | `PASS` | `NOT_RUN` |  Linux 真机+单测：缺失可执行文件在依赖面板标为「PATH 中缺失」，并在分配前以 `dependency-missing` 拒绝；Windows 路径差异**未在 Windows 上验证**，已在此明示 |
| M12 | 脚本执行、外部 MCP 操作复用 DSH 原生权限审核 | `PASS`（结构性） | `NOT_RUN` | 本插件不提供执行通道 |

## 7. 跨版本回归与生产恢复

| ID | 测项 | Web | Desktop | 证据 |
|---|---|---|---|---|
| C01 | `0.2.0-rc.2` 旧 DSH + 0.1.6 插件：旧核心功能至少不崩溃 | `NOT_RUN` | `NOT_RUN` | 未取得该版本实机；只有 capability 检测代码 |
| C02 | 缺新增 API 时按 capability 关闭新功能，明确说明差异 | `PASS`（部分） | `NOT_RUN` | skill 服务缺失降级用例；其它服务未逐一实测 |
| C03 | 目标 rc.2 下旧 Session、子成员/队长、模型/工具/系统提示词回归 | `PASS`（自动化） | `NOT_RUN` | 原应用/身份/策略/派生用例全部通过 |
| C04 | 有无插件时 DSH 原生父子代理与普通会话行为不变 | `PASS`（自动化） | `NOT_RUN` | 普通会话与原生成员用例通过 |
| C05 | 使用备份升级再回退 0.1.5：可逆范围、无数据静默丢失 | `NOT_RUN` | `NOT_RUN` | 未做真实配置备份/回退演练 |
| C06 | 更新宿主冒烟；未测版本不宣称支持 | `NOT_RUN` | `NOT_RUN` | — |
| C07 | 多会话 / 重启 / 断网后可继续使用已保存团队，未发生全局泄漏 | `PASS` | `NOT_RUN` |  真机：重启 3081 后保存的团队与分类归属仍在（`categories`/`teamCategories` 落盘并复读）；未观察到全局注册 |
| C08 | 禁用/卸载插件后原生技能目录与 MCP 配置未被更改 | `PASS`（结构性） | `NOT_RUN` | 本插件从不写用户/项目技能目录与 MCP 配置 |

## 8. 公开仓文档清理

| ID | 文档清理要求 | 结果 | 证据 |
|---|---|---|---|
| D01–D08 | README/README.zh、安装与兼容矩阵、九团队与两系列、元数据不注入、三层 Skill 边界、双语一致、过程文件不外露、release notes、打包资产一致 | `NOT_RUN` | 按交接 §8D，文档应在 Desktop 验收后按实测结果改写；当前前提不成立。`docs/` 下本交接与报告不随 npm 包发布（`files` 未包含 docs） |

## 9. Bug 与剩余风险登记

| ID | 严重度 | 环境 | 复现步骤 | 期望/实际 | 证据 | 负责人 | 当前状态 |
|---|---|---|---|---|---|---|---|
| R-01 | `P0` | Web/构建 | `DSH_CHECKOUT=<0.2.1-rc.2> npm run bundle` | 期望生成 `lib/`；实际退出码 1：`merged interface TypertResourceMap contains a declaration outside this face` | `TEST_REPORT.md` §5 | 维护者 | `Open`（发布阻断） |
| R-02 | `P0` | Web | 打开设置页寻找 Team Skills 入口 | 期望可视化管理；实际无入口（仅后端能力） | 本文件 U07–U16 | 维护者 | `Open`（Gate D 未过） |
| R-03 | `P1` | Web | 设置页创建/移动分类 | 期望页面 CRUD；实际仅数据层 | 本文件 U03 | 维护者 | `Open` |
| R-04 | `P1` | 远端 | PR #1 页面状态 | 期望已合并；实际本地 merge `70f91c5`，远端未合并 | IMPLEMENTATION_REPORT §1 | 维护者 | `Open` |
| R-05 | `P2` | 跨版本 | 0.2.0-rc.2 装载 0.1.6 | 期望冒烟通过/明确降级；实际未测 | 本文件 C01 | 维护者 | `Open` |

**Blocked 项与正式宿主 API 证据：**

- `BLK-001` 能力/受阻 API：按成员动态挂载 MCP 客户端；宿主 tag/源码位置：`dsh-v0.2.1-rc.2`（`@deepseek-ai/dsh-mcp-client` 等为组合级插件，公开面无可按 Agent scope 启停的注册入口）；已尝试的**插件侧**方案：依赖声明 + 可见性数据模型 + 明确降级提示；绝不使用的 workaround：全局注册后宣称“只对某成员可见”；结论：**Blocked，未实现**。
- `BLK-002` 能力/受阻 API：`npm run bundle` 的独立 workspace 形态；宿主 tag/源码位置：`packages/typert/generator/lib/index.js`（`loadRegistrations` 以 aggregate `projectReferences` + `realPath` 包含性判定注册包）；已尝试：仅 stage protocol（失败）、符号链接伪 workspace（被 `realPath` 拒绝）、硬链接整树（进入分析后仍有导出源解析差异）；结论：**Blocked**，需维护者决定构建形态。

## 10. 最终独立签署

**Web 开发环境：** `PASS`（仅限自动化：498/498 用例、typecheck 0/0）
测试/调试 commit：`c16d27f`
通过 / 失败 / 阻塞 / 未执行统计：自动化 498 通过 / 0 失败；交付面：待完成项见 §3–§8 的 `PARTIAL`/`NOT_RUN`
重要差异与遗留：R-01（构建阻断）、R-02/R-03（UI 未交付）

**Desktop 生产环境：** `NOT_RUN`
安装包 ID / sha256：`N/A`
桌面应用版本和 OS：`N/A`
通过 / 失败 / 阻塞 / 未执行统计：未执行
是否完全未修改宿主源码及已安装宿主文件：**NO**（本次全程未修改；但 Desktop 通道未运行，故不构成通过证据）
重要差异与遗留：Desktop 全部条目未验证

**0.2.0-rc.2 旧宿主兼容：** `NOT_RUN`
保留的老功能：`未验证`
明确降级的新功能：`未验证`（代码层保留了 capability 检测）

**结果建议（必须选择一项）：**

- [ ] `可发布`：全部必过 Gate 通过，Web 与 Desktop 各有真实证据。
- [x] `候选待复测`：存在问题但不应给用户发布。
- [ ] `Blocked`：正式宿主公开 API 或环境能力不足，附精确证据。
- [ ] `Fail`：出现 P0 缺陷、宿主修改、数据丢失、作用域泄漏等。

> 说明：单项能力（MCP 动态挂载、独立 workspace 构建）已 Blocked，但整体交付仍有大量可复测项，因此整体按 `候选待复测` 记录，并把 Blocked 项单列在 §9。

**执行 Agent 最终结论：** 代码与自动化证据完成 Gate A/B/C；Gate D（可视化管理）与 Gate E（发布包/文档/Desktop）未完成。**不得发布，不得宣称完整验收通过。**
**维护者复核：** `未签署`
**发布状态：** `未发布，需用户明确决策`

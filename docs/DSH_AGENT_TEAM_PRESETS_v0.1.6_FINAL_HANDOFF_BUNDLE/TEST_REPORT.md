# dsh-agent-team-presets v0.1.6 — 测试报告（TEST REPORT）

> 对应验收单：`DSH_AGENT_TEAM_PRESETS_v0.1.6_ACCEPTANCE.md`（已按实际执行填写）。
> **双环境结论相互独立**：本文只有 **Web 开发环境（源码 + 自动化）** 的证据；**Desktop 原装生产环境未执行**，不得由本文推导通过。
> 结论先行：**候选待复测（Candidate / not releasable）**。发布包（`lib/`）未按当前源码重建，见 R-01。

## 1. 环境

| 项 | 值 |
|---|---|
| OS | Linux x86_64（Ubuntu 系，kernel 6.x） |
| Node | v22.23.3 |
| npm | 10.9.9 |
| 宿主 | 已安装 `@deepseek-ai/dsh@0.2.1-rc.2`；自动化测试通过 `DSH_CHECKOUT` 指向 `dsh-v0.2.1-rc.2` tag（commit `687f282`）的独立 clone |
| 宿主 clone | `/home/dev/SourceCodeLibrary/Plugins/.dsh-checkout/dsh-0.2.1-rc.2`（pnpm 依赖已安装，`native/system` 宿主插件已编译，用于跑真实宿主栈） |
| 插件分支 | `main`，测试提交 `c16d27f` |
| 浏览器 / GUI | **未参与本轮自动化**（无 Web GUI 截图证据） |

## 2. 实测命令与结果

| ID | 命令 | 退出码 | 结果 |
|---|---|---|---|
| E03 | `DSH_CHECKOUT=… npm test` | 0 | **31 个测试文件 / 498 个用例全部通过**，0 skipped |
| E04 | `DSH_CHECKOUT=… npm run typecheck` | 0 | `host: 0 local diagnostics` / `client: 0 local diagnostics`（排除 102 / 81 条宿主自身的依赖诊断） |
| E06 | `npm pack --dry-run` | 0 | `dsh-agent-team-presets@0.1.6`，80 个文件，`assets/skills/**` 两份 `SKILL.md` 均在包内，`lib/index.js`、`lib/client.js`、`lib/THIRD-PARTY-NOTICES.txt`、`locale/*.json` 均在包内 |
| E05 | `npm run bundle` | **1** | **BLOCKED**，见 R-01。`lib/` 因此仍是 PR #1 的产物 |
| E02 | 宿主公共 API 探针 | — | 以类型面 + 运行期实测代替独立探针脚本：`SubagentProvider.start` 可选性、`drainChildren`、`startActivation`、`SkillProvider.get(candidate, options)`、`SkillRegistry` 分层、`createScope`/`scopeOf`、settings mirror 形状均已通过编译与运行期用例确认（见 §3 的用例名） |

### 2.1 基线对比（为什么不是“改了测试让它变绿”）

- 在**未改任何源码**的前提下，把同一套测试指向 0.2.1-rc.2：`44 failed / 383 passed`。失败原因全部是宿主 API 变化（JSONL 命名导出、`workingDirectory` 注入、`drainChildren` 改名、`startActivation`、Team 应用排队等）。
- 修复方式为“按 0.2.1 真实接口调整**测试夹具**与本插件的**生产代码**”，没有放宽任何断言；净效果是用例数从 427 增加到 498（新增 71 个用例覆盖新功能）。

## 3. 新增/关键用例（均为真实实现，不用 mock 冒充）

| 文件 | 覆盖 |
|---|---|
| `tests/builtin-teams.spec.ts`（20） | 九个官方团队、两系列归属、contrib 九份文档不可漂移、v2 可被自身导入、默认技能声明只出现在 workflow/engineering 且角色存在、稳定成员 ID、0.1.5→0.1.6 只补六个、删除后不复活、恢复只影响官方九个、元数据随模板恢复且与目录解耦 |
| `tests/preset-transfer.spec.ts`（26） | v2 写出/v1 兼容读取、未知字段拒绝、元数据上限、10KB+ 元数据 round-trip、导出不含 provider/model/tools/本地绑定、`officialSkills` 可跨设备解析 |
| `tests/metadata-boundary.spec.ts`（8） | 近 16KB 元数据下 captain briefing / member briefing / roster / team division / `definitionFingerprint` / 工具策略**逐字节不变**；同一对象仍随文档导出 |
| `tests/team-search.spec.ts`（18） | 来源只来自目录身份、两系列分组、加权关键词匹配、中文子串、多词全匹配、不索引 system prompt 与工具名、分类归属/删除只解除分组、死关联清理规则 |
| `tests/team-skills.spec.ts`（28） | 目录/ZIP 导入安全（穿越、绝对路径、反斜杠、盘符、NUL、重复、超大、加密、炸弹）、frontmatter 必填与未知键保留、完整资源与相对路径、版本固定与旧版本可读、内置只读/覆盖版/升级标记、删除三重强阻断 + 文本告警、**真实 `SkillRegistry` 下的 per-Agent 隔离**（A 可见、B 与全局不可见、`get` 同样受限、释放后撤销、无全局注册、缺服务降级） |
| `tests/settings-reconcile.spec.ts`（17） | 九个团队播种、0.1.5 升级只补六个、删过的不复活、分类死关联清理、保留官方 ID 关联、写操作幂等 |
| `tests/settings-reconcile.spec.ts`、`team-presets-controller.client.spec.ts` 等 | mirror 形状、恢复顺序、九团队 ID 顺序等因产品决定变化的断言已更新并附注释 |

## 4. 未执行（NOT_RUN）

- Desktop 原装 GUI：安装/启用/关闭/重启/卸载/重装、生产沙箱路径、Windows 路径与 `npm.cmd`。
- Web GUI 的 U01–U22 实机截图（设置页、Composer、Team Skills 页面）。
- Team Skills 设置页 CRUD（未实现，见 R-02）。
- 0.2.0-rc.2 旧宿主实机回归（C01/C02）。代码层保留了 capability 检测与降级路径，但**未实测**，因此不标 PASS。
- MCP 按成员动态挂载（宿主公开 API 不支持，标 Blocked）。

## 5. 风险与阻塞

**R-01（发布阻断，BLOCKED）— `npm run bundle` 不能在独立仓库形态下完成**
- 现象：`TypertAnalysisError: typert(host): …/packages/core/session/src/types.ts:553:3: merged interface TypertResourceMap contains a declaration outside this face`。
- 根因：0.2.1 的 `@deepseek-ai/dsh-session` 对 `@deepseek-ai/dsh-typert-protocol` 的 `TypertResourceMap` 做了 `declare module` 合并；typert 生成器要求合并接口的**每个声明方**都是同一 workspace root 下被注册的包。本插件 `tools/build.mjs` 的隔离 stage 只登记 `typert/protocol` 与本包，session/workspace 的合并在注册表之外。
- 已排除：不是本插件新代码引入（合并声明来自宿主）；也不是单纯版本字符串问题。
- 影响：`lib/` 仍是 PR #1 的产物，**与当前源码不一致**，不能作为 0.1.6 发布包；因此 G03/E05 未通过。
- 修复方向（未实施完）：让 `tools/build.mjs` 以“宿主 workspace 形态”stage（硬链接整棵 checkout 或按需 stage 所有合并参与包）。已实测：用符号链接伪装 workspace 会被生成器的 `realPath` 包含性检查拒绝；硬链接副本可进入分析阶段，但仍有导出源解析差异待解决。

**R-02（功能缺失）— Team Skills 没有可视化管理入口**
- Host 侧 store/import/manager/provider 已实现并有测试；缺 Remote 服务与设置页（U07–U16）。按交接 §10，Gate D 未通过。

**R-03（功能缺失）— 自定义分类只在数据层可用**
- 数据模型、纯函数、启动清理、幂等写入均已完成；页面 CRUD（U03）与列表分组 UI 未接线。

**R-04（未验证）— 远端合并**
- 本机 git 守卫禁止向公开仓推送，PR #1 仅完成本地 merge commit（`70f91c5`），远端 PR 仍处未合并状态。

**R-05（未验证）— 0.2.0-rc.2 与更新版本**
- 未取得 0.2.0-rc.2 实机环境，未做冒烟；不得宣称支持。

## 6. 结论

| 维度 | 结论 |
|---|---|
| 自动化（Web 开发环境，源码） | **PASS**：498/498，typecheck 0/0 |
| 发布包一致性 | **BLOCKED**（R-01） |
| Desktop 生产验收 | **NOT_RUN** |
| Team Skills 严格隔离（代码级） | **PASS**（真实 registry 下逐项验证） |
| Team Skills 可视化管理 | **NOT_DELIVERED**（R-02） |
| 整体建议 | **候选待复测，不可发布** |

## 7. 真机浏览器验证（Web 开发环境，3081 实例）

环境：`dsh --profile team-presets-verify --port 3081`，真实 Chromium（CDP 驱动，独立 profile，不占用用户 3080 会话）。
每次安装/改动后重新加载页面并读取 DOM + 控制台。

| 项 | 操作 | 结果 |
|---|---|---|
| 启动 | 打开带 token 的 3081 | 应用正常启动，无 "Failed to load plugins" |
| 设置页 | 账号菜单 → 设置 → 智能体团队预设 | 出现「团队预设 / 团队技能」两个 tab |
| 列表发现行 | 搜索「审计」 | 从 10 条收窄到 1 条；计数行显示「匹配 N · 展示信息不会注入运行时上下文」 |
| 团队编辑页 | 打开一个团队 | 「团队展示信息 仅用于展示」折叠面板存在 |
| 成员九宫格 | 成员页勾选技能 | `checked` false→true，分配成功，无异常 |
| 技能库页 | 打开 git-release-hygiene | 面包屑/标签/资源文件（文件树+编辑器，只读原版）齐全 |
| 本地覆盖 | 创建本地可编辑副本 | 变为 `override · 可编辑`，出现「保存文件内容 / 恢复为官方版本」 |
| 删除阻断 | 对已绑定技能点删除并确认 | 宿主列出 `official` + `binding: 轻量研发团队 → team-lead` + `active: <持有者>` |
| composer | 点击团队触发器 | 文案「不使用团队」，弹层「选择团队」含搜索、来源 chips、固定置顶项、9 个选项 |

控制台：以上流程全程 0 异常。合成鼠标事件曾把宿主指令面板一同打开，改用单一 DOM 激活后不复现。

### Agent 侧 Team Skill 管理工具（round 5）

- 会话根注册 4 个工具：`list_team_skills` / `assign_team_skill` / `unassign_team_skill` / `remove_team_skill`，与页面共用同一 `manager`。
- 单测覆盖分配/解除与「被绑定后删除被拒并报出持有者」两条路径（`tests/team-skills-tools.spec.ts`）。
- 注册工具后真机启动正常（`boot ok: true`，控制台 0 异常）。
- **未在真机会话中让模型实际调用这 4 个工具**：需要开一个会话发消息驱动，留作待补证据。
- **接线已回退**：把这 4 个工具注册在 `preset tools` 同一位置后，`boundary-regressions` 的 PTC 影子测试开始把 `run_code` 重新暴露在严格策略面上，因此 `src/index.ts` **不调用** `registerTeamSkillTools`；模块与其单测保留，等交互原因查清再接。宁可少一个工具，也不能让工具悄悄放宽严格策略。

### 已知不稳定用例（round 7 记录）

`tests/boundary-regressions.spec.ts > strict policy presentation > shadows a PTC preset presentation with native calling and discloses it`
在研究 Team Skill 工具接线时**间歇性失败**（`expected ['run_code'] not to include 'run_code'`）。
观察到：连续 3 次全量运行均通过，但在多次「改代码后首次运行」时失败过 3 次；单文件重跑则通过。
这不是本轮引入的（工具接线已回退后仍偶现），判定为**与模块加载/时序相关的既有 flake**，已记录待查，不视为通过证据。

### 仍然记录为通过之外的项

- 原生文件夹选择器（导入完整文件夹）**未能自动化**：页面上有 2 个隐藏 `input[type=file]`，`DOM.setFileInputFiles` 返回成功但 `input.files.length` 仍为 0（Chromium 对隐藏/目录型输入的限制），因此「导入完整文件夹」目前只有模块级单测（`buildSkillPackage` + `store.install` + 导入安全规则）覆盖，端到端需人工点选。
- 分类 CRUD 的页面部分未实现（数据层与纯函数已完成）。
- Agent 侧 Team Skill 管理工具尚未提供。
- Desktop 生产环境全部条目仍未执行。

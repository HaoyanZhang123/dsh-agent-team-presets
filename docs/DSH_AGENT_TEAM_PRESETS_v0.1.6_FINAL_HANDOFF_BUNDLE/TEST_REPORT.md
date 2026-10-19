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
- **接线已恢复**：上一轮记录的「注册工具导致 `run_code` 漏回严格策略面」经 round 8 的屏障修复后不再出现——那其实是 `settlePlugin()` 只等 3 个宏任务造成的读取过早，不是工具注册的副作用。`src/index.ts` 现已注册这 4 个工具；`boundary-regressions` 连续 3 次 20/20，全量连续 4 次 502/502。
- **注册已用组合测试证明**：`tests/team-skills-tool-registration.spec.ts` 在 `mountAgentLoopTestDependencies` + `AgentLoop` 组合出的真实 Session 根上，断言 4 个工具名出现在 `systemPrompt.assemble()` 的 `tools` 名单里，`dispose()` 后消失。也就是说工具确实到达了模型可见的装配面，而不只是"代码里调了一次 register"。
- **真机会话调用仍未能验证**：在 3081 里已能通过 contenteditable 输入并发送消息（「请调用 list_team_skills…」），但该验证 profile 的模型凭据无效，本轮运行直接失败：`处理失败 / 本轮运行失败 API 密钥无效 AUTH`。这是环境凭据问题，不是插件行为；要拿到端到端证据需给该 profile 配一把有效 key，或改用其它已配置凭据的 profile。

### 已修复的不稳定用例（round 8）

上一条记录的那个 flake 已定位并修复：`tests/fixtures/plugin-harness.ts` 的 `settlePlugin()` 原先只等 3 个宏任务，
而 0.2.1 的应用会 await 提示词组装（又 await 工具 schema），3 个回合在负载波动时不够，于是 `boundary-regressions`
里既出现过 `run_code` 未被遮蔽，也出现过完整 persona 的 briefing 读不到。
改为 8 轮 `setImmediate` + `setTimeout(0)` 交替，末尾加 5ms 实延时，让「队列静默」成为屏障而不是靠调度运气。
修复后：`boundary-regressions` 连续 3 次 20/20，全量连续 4 次 502/502。

### 原始记录（round 7）

`tests/boundary-regressions.spec.ts > strict policy presentation > shadows a PTC preset presentation with native calling and discloses it`
在研究 Team Skill 工具接线时**间歇性失败**（`expected ['run_code'] not to include 'run_code'`）。
观察到：连续 3 次全量运行均通过，但在多次「改代码后首次运行」时失败过 3 次；单文件重跑则通过。
这不是本轮引入的（工具接线已回退后仍偶现），判定为**与模块加载/时序相关的既有 flake**，已记录待查，不视为通过证据。

### 仍然记录为通过之外的项

- 原生文件夹选择器（导入完整文件夹）已用**真实 FileList** 打通：`DOM.setFileInputFiles` 对隐藏的目录型输入无效（`input.files.length` 恒为 0），改为在页面内用 `DataTransfer` 构造带 `webkitRelativePath` 的 File 并派发 `change`，走的是与原生点选完全相同的代码路径（React onChange → controller → Remote → store）。
  证据：导入 `demo-skill/`（`SKILL.md` + `references/note.md`）后列表出现 `demo-imported | custom | … · 2 文件 · 绑定 0`，磁盘落在 `~/.dsh/agent-team-presets/team-skills/assets/` 下，说明嵌套路径被保留、没有被拍平。
  仍未经由原生选择器 UI 点击，这一点保留说明。
- 分类 CRUD 的页面部分未实现（数据层与纯函数已完成）。
- Agent 侧 Team Skill 管理工具尚未提供。
- Desktop 生产环境全部条目仍未执行。

## 8. U03 分类：写入、归属与过滤（round 15–16）

round 15 曾记录"分类写入不持久"，**那是误判**，本轮已更正：当时观察到"重启后 chip 消失"，实际是我在
round 14 的脚本里**自己点删除**了那个分类。更正后的完整证据链：

| 步骤 | 观察 |
|---|---|
| 页面新建「审核」 | chip 出现；`cordis.patch.yml` 写入 `categories: [{id: cat-mveo6itv, name: 审核, order: 1}]` |
| 编辑器下拉选中「审核」 | `teamCategories: [{teamId: verify-team, categoryId: cat-mveo6itv}]` 落盘 |
| **重启 3081** | 两者仍在（chip 仍在） |
| 点「审核」chip | `匹配 10` → **`匹配 1`** |

所以 volatile 字段的持久化通道是正常的，U03 的增/删/归属/过滤四件事都有真机证据。
唯一未做的是删除分类的二次确认文案（原型无此要求，列表页直接删）。

## 9. 分类改名与排序（round 21）

| 动作 | 真机观察 |
|---|---|
| 点 ✎ 后输入「质量审核」并确认 | 分类 pill 与 chip 同步改名；`cordis.patch.yml` 写入 `name: 质量审核` |
| 新建「临时分类」后点上移 | pill 顺序变为 `临时分类, 质量审核`（order 归一化为 0..n-1） |
| 点 × 删除「临时分类」 | pill 消失，剩余分类与归属保持不变 |

未做：删除后的 order 稠密化（当前删除不重排，显示仍按 order 排序，不影响使用）。

## 10. 依赖阻断（M04，round 22）

- 规则:`manager.assignmentBlockers()` 只把**可验证**的事实作为阻断——声明的可执行文件在 PATH 上找不到；
  required 的 MCP 服务只作为「本层无法判定」上报,绝不假装它缺失。
- `assign()` 在写入绑定前检查，命中则以 `dependency-missing: the executable "…" is not on PATH` 拒绝（新增单测）。
- 真机（3081，给 `custom:demo-imported` 造了缺失依赖）：详情页出现红色横幅「缺少必需依赖，分配会被拒绝」，
  依赖行分别显示「已声明」（MCP）与「PATH 中缺失」（可执行文件）。
- 成员页勾选被拒（round 23 已补证）：勾选 `demo-imported` 后页面出现 `dependency-missing: the executable "…" is not on PATH`，且四个勾选框全部保持未选中——没有写入绑定。

## 11. 同名不同来源（S05，round 24）

- 库里同一 `skillId` 可以同时存在 `builtin` / `override` / `custom` 三个资产，id 各自独立。
- `TeamSkillAssetView.clashesWith` 列出共用名字的其它资产；详情页显示「同名，各自独立」标签与说明
  「互不覆盖，插件不会改写任何全局 Skill」。
- 真机：导入一个与官方同名的自定义技能后，列表出现三行同名资产，打开自定义那条可见上述提示。
- 单测：删除自定义副本后 `builtin:git-release-hygiene` 仍存在（不存在任何方向的静默覆盖）。

## 12. 不可用时不假报已加载（M05，round 25）

构造方式：把私有库目录 `chmod 000` 后重启 3081（等价于权限拒绝）。

| 状态 | 面板表现 |
|---|---|
| 库不可读 | 只显示 `the Team Skill store could not be opened in this deployment`；**没有**出现「全部/插件内置/自定义」筛选条，也没有显示"空库" |
| 恢复权限后 | 描述、筛选条与资产列表正常回来 |

说明：该库是本地文件存储，不存在"断网"这一维度；这一条按"权限拒绝/不可用"取证。

## 13. Web（开发侧）收口结论

| 分类 | 数量 | 说明 |
|---|---|---|
| PASS | 57 | 含本轮补证：T09 / M04 / S05 / M05 / M11 / G09(Web) / G10 |
| PARTIAL | 0 | — |
| NOT_RUN | 6 | 全部为环境不具备：E08 / E12 / S22 / C01 / C05 / C06 |
| N/A | 3 | Desktop GUI 与动态挂载等本版本不适用项 |

单列未完成：**Agent 工具的模型实际调用**——验证 profile 无有效 API key，运行时直接 `AUTH 无效`；
工具的可见性已由 `tests/team-skills-tool-registration.spec.ts` 在真实装配面上证明。

结论：Web 开发侧除上述 6 条环境阻塞与需凭据的模型实调外，全部 PASS；每次结论都有 3081 真机或单测证据。

## 14. 原型保真度修正（新 goal，round 1）

对照 `NATIVE_UI_PROTOTYPE_REVISED_V2.html` 逐页比对后修正：

| 位置 | 问题 | 修正 | 证据 |
|---|---|---|---|
| 技能库/详情 | `css.active` 从未定义（样式表只有嵌套的 `.segment button.active`，CSS Module 不为嵌套选择器导出键），选中文件与按下分段无任何高亮 | 新增顶层 `.active` | 实测 chip `rgb(233,237,243)/550`、文件 `rgb(231,237,246)/550` |
| 技能库标题行 | 动作在信息块下方，且按钮无边框（`Button` 默认文字变体） | 动作移到标题行右侧，改 `variant="outline"`；导入改用 `htmlFor`+id | 实测三个按钮 `border:1px rgba(0,0,0,.12)`、`padding:0 14px` |
| 技能详情 | 缺「打开所属文件夹」 | 增加「复制该技能目录路径」 | 详情动作：创建本地可编辑副本 / 复制该技能目录路径 / 删除 |
| 团队列表 | 0.1.5 的独立卡片堆叠，非原型的单容器行列表 | 改为 `rowlist`：1px 边框、17px 圆角、行间 1px 分隔、行最小高 64px、hover 底色；「管理分类」并入 chips 行 | 实测容器 `radius:17px border:1px`、10 行、行高 81px（含两行内容与行内动作） |

截图已刷新：`docs/shots/skills-library.png`、`skill-git-release-hygiene.png`、`member-skill-grid.png`、`teams-list.png`。

### 续（round 2–3）

| 位置 | 问题 | 修正 | 实测 |
|---|---|---|---|
| 团队编辑「所属分类」 | 原生 select 保留系统外观；宿主也有 `select` 规则，裸类被层叠覆盖 | 改为 `select.select` 自绘盒子 + 内联 chevron | `h:32 / radius:8 / border:1 / pad:10,30 / appearance:none / bg:url(svg)` |
| 页脚状态提示 | 灰字夹在页脚与保存栏之间，视觉上融合 | `.footerNote` 加 1px 描边、8px 圆角、9px 内边距、浅底 | `border:1 / radius:8 / pad:5 9 / bg:rgb(247,248,250)` |
| composer 副行 | 字号 11.5、无间距 | 对齐原型 `small`：11px + `margin-top:2px` | 选项 `pad 8×9 / radius 8`、弹层 `pad 12`、副行 `11px` |
| 团队行高 | 77–81px，原型 64px 起 | **根因是 `content-box`**：`min-height:64px` 在 content-box 下约束的是内容高度，12px 内边距再加在外面 ⇒ 64+12=76。加 `box-sizing:border-box` 后 | 实测**行高 64px**，与原型一致（`pad 6/10/6/14、gap 4、子元素 42 与 28`） |

### 续（round 6）：卡片与 chips

| 位置 | 原型 | 现状 | 处理 |
|---|---|---|---|
| chips（列表筛选、composer 来源） | `padding:6px 10px; border-radius:7px; font-size:12px` | 原为 `5px 9px` | 改为 **6px 10px**，圆角与字号本就一致 |
| 设置页卡片（`.card`） | 原型 `--radius:16px` | 宿主 token `--dsw-radius-xl`（20px）、`padding:10px 12px` | **保留宿主 token**：该页面嵌在 Harness 设置窗内，与其它设置卡片（同样 20px）保持一致比贴合独立原型更正确；已在文档说明这是有意偏离 |

### 续（round 7）：盒模型收口与元数据节奏

- **盒模型**：`box-sizing` 已按子树声明（技能页 `.page *`、composer 弹层 `.popover *`）。真机扫描该子树后
  「content-box 且带内边距」的元素数量为 **0**，同类 77→64 的问题不会在这两页再出现。
- **元数据面板**：字段标签统一 `margin:10px 0 4px`（实测三个标签均为 `mt 10 / mb 4`），与原型
  label→control 的 4px 间距一致。
- **技能详情绑定行**：实测行高 50px、`padding:8px 0`，与原型 member-row 的节奏相同。

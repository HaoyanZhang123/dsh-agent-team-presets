# dsh-agent-team-presets v0.1.6 — 开发与测试交接（Handoff）

> **状态：待执行 / 未发布**  
> **交接修订：2026-10-19（与最终确认的原生风格交互原型 V2 对齐）**  
> **项目：** https://github.com/bloodarea/dsh-agent-team-presets  
> **待合并贡献 PR：** https://github.com/bloodarea/dsh-agent-team-presets/pull/1  
> **插件版本：** `0.1.5` → `0.1.6`  
> **目标 DSH：** `dsh-v0.2.1-rc.2`（npm `@deepseek-ai/dsh@0.2.1-rc.2`）  
> **原适配基线：** `dsh-v0.2.0-rc.2`  
> **交付状态：** 此文档为开发指令，不代表 PR 已合并、代码已修改或测试已通过。

## 0. 执行 Agent 必须先读的约束

1. 在真实工作区确认 `git status`、当前版本、分支、最新提交、PR 合并状态和目标 DSH checkout 的准确 commit；以实际源码、API 和可运行的生产包为准，本文只指定**产品决策**及**验收目标**。不得按历史会话里猜测的 API 签名直接硬编码。
2. **先合并 PR #1，再进行 v0.1.6 改造**；保留贡献者提交/署名，推荐使用 merge commit。合并前为 `0.1.5` 基线留可复现的 tag/commit 记录；不要覆盖本地未提交变更。若执行环境无 GitHub 合并权限，停止远端合并操作，在本地基于 PR 分支进行集成验证并把远端合并列为明确待办；不得谎称已合并。
3. **不修改 DSH 宿主源码、已安装宿主包或仅靠开发环境的宿主私有补丁实现功能**。优先使用 `0.2.1-rc.2` 已公开的插件服务、事件和 Scope API；无正式能力时给出证据、可用降级及测试结果，不可假装实现严格隔离。
4. 保留插件根本边界：**原生 Agent Teams 管协作、任务板、消息、并发与运行时调度；本插件只管预设、成员配置、工具策略、Team Skills 资产与成员范围的注册**。不另做 Harness、不接管 Team runtime，不增加团队心跳、消息总线、任务板。
5. 维持现有安全及兼容性：队长沿用会话当前模型；成员模型/推理强度、系统提示词、工具权限独立配置；工具限制不能因新 Skill 功能变宽；已有会话及持久化成员恢复应继续工作。
6. 用**阶段性可验收提交**实施，不自动发布 npm / GitHub Release，不擅自 push、改写历史；远端合并遵循用户本次授权，其他远端写操作先确认。
7. 每个阶段提供变更清单、测试命令与实际结果；最终提交 `IMPLEMENTATION_REPORT.md` 与 `TEST_REPORT.md`（或仓库既有相应文件），列出未实现能力及原因。**不把 mock 测试当正式安装兼容性证明。**
8. **本交接必须连同 `DSH_AGENT_TEAM_PRESETS_v0.1.6_ACCEPTANCE.md` 和 `DSH_AGENT_TEAM_PRESETS_v0.1.6_NATIVE_UI_PROTOTYPE_REVISED_V2.html` 阅读**：验收模板的每个 P0 项必须填实际证据，HTML 是用户体验与页面覆盖的交互参考，不是可直接复制到宿主的代码。
9. **硬性环境边界**：Web 为插件开发/调试环境，Desktop 为真实生产安装兼容性验收环境。两者各自出示独立的 PASS/FAIL/Blocked/Not run 状态；Web PASS **不能代替** Desktop PASS。Desktop 不允许运行经过源码修改的宿主、替换宿主 node_modules、改写其打包产物或依赖宿主私有 API/未公开路径。
10. **维护向前/向后兼容**：目标明确为 `0.2.1-rc.2`；对既有 `0.2.0-rc.2` 部署尽可能保持可用（宿主 API 明确不支持的附加功能可显式降级，老功能不可无故失效）；对 `0.2.1` 后续兼容版本采用 capability detection / feature gating，不盲目以版本串认定所有 API 可靠。切勿把 rc.2 新增能力做成插件加载的强制条件。

---

## 1. 确认的目标与排除项

### 1.1 目标

- 完整接纳 PR #1：六个工作模式团队、两个随包 Skill，以及其已有可复用设计；修复插件启动时把这两个 Skill 全局注册的做法。
- **正式出厂内置团队统一为九个**：原有三个“研发规模系列” + PR 六个“工作模式系列”，任何新安装用户都应取得相同九个官方预设；历史用户不被悄悄重置。
- 新增独立的 **Team Skills（团队技能）** 管理：完整 Skill 文件夹、本地私有存储、按成员精确分配、按需加载、成员生命周期管理、官方资源升级、强依赖检查。
- 设置页现有「配置」区域新增「团队技能」入口：支持技能列表、详情、文件树、创建、编辑、查看、删除、导入文件夹/ZIP、打开技能目录，；Agent 管理能力通过插件工具提供，不显示“交给 Agent 处理”按钮。
- 团队预设新增独立**展示元数据**，全部可选；九个官方团队默认填写，用户创建可为空；参与团队 JSON 导入导出；**绝不隐式注入 Agent 运行时上下文**。
- 团队预设界面增加系统来源筛选、两个内置系列视图、用户自定义分类、搜索与标签筛选；对话输入框中的**团队选择控件**同步支持分类/搜索/摘要查看。
- 对话输入框没有选中团队时，文案由「团队」改为 **「未选择团队」**（包含适用的本地化版本）。
- 完成 `0.2.1-rc.2` 正式安装与升级兼容验证，并将发布版本号设为 `0.1.6`。

### 1.2 本版**明确不做**

- 不做独立 SOP 编辑器；现有 captain/member System Prompt 已能表达协作规范。
- 不做通用 Agent 自动配置校验助手；简单配置验证交由确定性程序完成。
- 不开发技能市场、在线 Skill 安装依赖、自动安装 Python 包、远端自动更新用户 Skill、向量/语义搜索、AI 自动推荐最优团队、Token 成本预测。
- 不把用户级或项目级 DSH Skills 搬入 Team Skills 库，也不试图屏蔽、篡改它们。
- 不将个人 Team Skills 资产或分配引用偷偷塞进团队预设的普通导入/导出文件。
- 不让纯展示元数据参与 Agent Team 初始化说明、队长 Prompt、队员 Prompt 或 spawn 工具说明。

---

## 2. 仓库现状：执行前核验点

以下来自截至 2026-10-18 的公开仓库/PR，执行 Agent 必须在合并后的本地代码中重新验证。

| 位置 | 当前作用及修改重点 |
|---|---|
| `package.json` | 当前 `version: 0.1.5`；`engines.dsh` 与 peerDependencies 以 0.2.0 rc.2 为最低线；发布入口为 `lib/index.js`、`lib/client.js`，需逐项核对 0.2.1 rc.2 的真实包版本及依赖存在性。 |
| `src/builtin-teams.ts`、`contrib/default-presets/`、`tests/builtin-teams.spec.ts` | v0.1.5 中为三个内置团队。PR #1 将其替换成六个，**需要重新组合为九个官方定义**且文档/测试同步。 |
| `src/types.ts` / `src/config.ts` | 团队、成员、会话选择结构和 schema；新增 metadata 时切勿复用既有 `description` 字段。 |
| `src/preset-transfer.ts` | JSON 可移植格式，当前 `TEAM_PRESET_FORMAT_VERSION=1` 且严格拒绝未知字段。新增 metadata 必须设计向后兼容的解析/版本策略与上限。 |
| `src/index.ts`、`src/application.ts`、`src/member-runtime.ts`、相关 member identity 文件 | 会话应用、角色召唤、成员持久化与 Scope；Team Skill 生命周期接在现有可靠成员路径上，不另造一套身份逻辑。 |
| PR 的 `src/skills.ts`、`assets/skills/**` | 两份官方内置 Skill：`github-repository-presentation`、`git-release-hygiene`。PR 的 `installShippedSkills()` 在插件启动/服务注入阶段全局注册；本版必须改变。 |
| `src/client/**`、`locale/**`、`tests/**`、`tools/build.mjs` | 定位现有设置页、composer 团队选择器、远程服务、国际化、构建和测试脚本。禁止假定具体 UI 文件路径不变。 |

**需注意的已确认事实：** `src/types.ts` 已把团队的 `description` 注释为“shown in Settings and to its captain”；`src/preset-transfer.ts` 目前仅导出团队共享字段，不导出路由和工具策略。保留这两项既有语义；新建一个独立 `metadata` 对象。PR 说明：它自己的恢复默认是六个、老用户升级保留旧三个。九个官方预设是本次开发**新增的产品决定**，不可直接认为 PR 已经做到。

---

## 3. 阶段 A — PR 合并和 DSH 0.2.1-rc.2 适配（P0）

### A1. 合并前准备

1. `git status` 确认工作区干净并保存基线信息；获取 PR 实际 head SHA、比较 diff、检视构建产物和 `assets/skills` 打包清单。
2. 审核 PR 自述的环境问题：测试报告为 **425 passed、2 skipped**，但 Windows 上已有 `npm pack` / `npm.cmd` spawn 失败，`--e2e` 未验证；其 `tools/build.mjs` Windows 路径规范化 adapter 未提交，生成 `lib/types/config.d.ts` 可能出现绝对机器路径。合并后要真正修复或记录，不将 PR 自述当测试结论。
3. 合并 PR；保存 merge commit SHA，建立独立 `v0.1.6` 开发提交序列。

### A2. 版本适配

1. 将版本更新至 `0.1.6`；针对 `dsh-v0.2.1-rc.2`（官方 tag commit 见发布页）审计 `engines.dsh`、各 `peerDependencies`、可选 `dsh-skill` 的实际发布/依赖情况。确定后收紧到真实兼容范围，**不能只改版本字符串**。
2. 逐项验证 API：Session/Agent 创建与销毁、member snapshot 恢复、`ctx.skills.registerProvider` 的注册 Scope 与 disposer、文件服务、host/client remote 通信、Settings API、Composer 控件生命周期。
3. 移除或避免由可选 `@deepseek-ai/dsh-skill` 带来的**顶层强制运行时 import**问题：即使 peer 标记 optional，静态 value import 仍可能在缺包时让 `lib/index.js` 无法加载。必要时采用已验证的延迟服务访问/接口类型与不依赖该包的常量策略；以无 Skill 服务/无该包的正式构建 smoke test 证明。
4. **测试正式安装的 Web 与 Desktop 可用运行路径**；不能通过修改宿主工作区实现“只在开发环境可用”的能力。
5. 记录宿主 0.2.1 rc.2 的已知外部回归，并区分本插件问题；尤其检查旧配置中 `{{cwd}}` 变量的引用是否使请求组装失败。不得静默篡改用户 System Prompt；用诊断提示说明来源。

**A 阶段通过条件：** 插件在 rc.2 目标环境正式安装能启动、团队选择能生效、原有 spawn/fresh/fork/恢复/工具限制/模型路由链路均实测正常；缺 Skill 服务不会导致插件启动失败。

---

## 4. 阶段 B — 九个官方内置团队 + 预设来源/分类（P0）

### B1. 唯一的官方集合

| 系列（system series） | 官方预设（固定稳定 ID） |
|---|---|
| `classic-development` · 研发规模（3） | `builtin-lightweight` 轻量研发团队；`builtin-standard` 标准研发团队；`builtin-fullstack` 全栈软件研发团队 |
| `work-modes` · 工作模式（6） | `builtin-discovery` 需求探索；`builtin-planning` 架构规划；`builtin-workflow` 既定工作流执行；`builtin-engineering` 工程研发协作；`builtin-audit` 独立代码与安全审计；`builtin-research` 科研协作 |

1. 在 `BUILTIN_TEAMS`、`contrib/default-presets` 和测试中形成**9 个一致的出厂定义**。维护原有三个的稳定 ID 和成员 ID；保留 PR 六个的稳定 ID；不要因名称、分组变化生成新 Team ID。
2. 新安装：一次安装九个。旧 `0.1.5`：保留已存在的三个和所有个人修改，补充此前从未提供过的六个；已经删除过的内置团队**不因插件重启或版本升级而重新出现**。以现有 `seededDefaults` 语义为准，迁移必须幂等。
3. **恢复全部官方默认**：在用户明确确认后恢复九个出厂定义，包括此前用户主动删除的官方团队；恢复某一官方团队仅影响该团队。不得删除用户创建的团队。沿用匹配角色的本地模型路由、推理强度、工具政策等既有合并规则；恢复涉及成员名单变化时预览对本地 Team Skill 绑定的影响，防止悬挂引用。
4. 官方团队可直接编辑、复制、删除、恢复（保持 v0.1.5 用户体验）；修改内容应保留原始官方 ID/来源与「已修改」状态。用户复制后新 ID 为自定义来源。

### B2. 分类是“来源与系列视图”加“个人逻辑分组”

- **系统来源筛选**：全部 / 插件内置 / 自定义（列表项短标签为「内置」）；来源为只读、基于可靠身份而非用户随意填写字段，不得称「官方内置」使用户误认为 DSH 官方。
- **官方系列**：研发规模 / 工作模式，固定归类、默认可折叠、不可删除；与团队是否被个人编辑无关。
- **用户自定义分类**：在设置页可创建、重命名、排序、删除，以及将任何团队（包括插件内置团队）添加/移入；首版仅需一级逻辑分组，不做无限嵌套。分类按钮应与固定来源筛选共列；空间不足时整项隐藏，仍可通过分类下拉访问，不能挤破宿主设置页布局。
- 删除分类**只移除分类关系**，不删除其中团队。没有分类归属的显示在“未分类”。分类本身是本地 UI 组织数据，**不参与团队预设普通 JSON 导入导出，也不改变运行时**。
- 按稳定 `teamId` 存分组，不按名称保存；迁移时对已不存在团队的分组关联安全清理/显示缺失，并记录。

---

## 5. 阶段 C — 团队展示元数据与双入口检索（P0）

### C1. 明确与运行时字段分离

新增可选对象，例如：

```json
{
  "metadata": {
    "summary": "适合跨模块功能开发",
    "tags": ["软件研发", "多角色协作"],
    "useCases": ["复杂重构", "全栈集成"],
    "quickPrompts": ["为现有项目增加用户认证模块并验证"],
    "notes": "适合已有明确目标的工程任务"
  }
}
```

- 用户创建团队时所有元数据可空或整个对象缺省；九个官方团队给出准确、易读且有区分度的默认字段。
- 所有元数据仅用于 UI 展示、排序/筛选、搜索与团队预设 JSON 的导出/导入；**不能进入 System Prompt、captain briefing、member briefing、member roster、team division、spawn tool description、模型消息或预置任务**。
- 当前旧字段 `description` 仍可能属于运行时队长信息；**不可通过清空/改写旧字段来代替展示简介**。只将新 `metadata` 作为展示专用字段。
- 设置页元数据编辑区域必须清晰标注：**「仅用于展示与搜索，不会自动注入队长或队员的运行时上下文，不增加团队执行时的提示词 Token」**。可另用简洁提示注明“复制推荐任务并作为用户消息发送时会产生正常消息 Token”。避免绝对声称 UI、传输或保存不存在任何计算开销。
- 测试添加 10KB 元数据前后，运行时生成的队长/成员 Prompt、工具注册说明和成员快照上下文完全相同；用户显式复制并发送属于例外。

### C2. 导入导出兼容

- 当前固定 `TEAM_PRESET_FORMAT_VERSION=1` 且严格拒绝未知字段。建议为新格式引入 `version:2`，**导出 v2、兼容读取 v1/v2**；若经测试采用保留 v1 的可选字段扩展，也必须给出兼容旧版消费端的明确证据。推荐 v2 避免旧客户端把新字段误判为损坏而不知原因。
- 导出包括 `metadata`，仍仅导出当前允许分享的 Prompt、角色和颜色等字段；继续排除部署专属 provider/model/reasoningEffort/tool allowlist。
- **明确排除**：Team Skill 本地完整资产、用户自定义 Skill 及其个人分配关系、技能本地目录路径、分类关系、个人用户/项目 Skill。
- **唯一例外（用户确认）**：随插件内置团队模板提供的**官方默认 Skill → 指定角色**声明，可以以跨设备可解析的官方 `skillId` 与导出角色槽位（按稳定导出身份或唯一角色名）表达，并随对应官方模板/预设导出导入；不包含 Skill 文件夹本身，不自动安装外部资源。接收端若没有相应内置 Skill，则显示“官方技能不可用”，不暗中改用用户级同名 Skill。个人额外增删的 Skill 分配始终是本地偏好，不在普通预设导出中传播。若用户修改官方团队并删除/重建角色，需明确有效默认声明的匹配规则，避免绑定错位。 
- 设置合理每字段/数组/总文档上限，验证恶意 JSON 与跨版本 round-trip；新版本同名覆盖导入应保留既有本地私有设置，避免默认绑定错指。

### C3. 设置页和会话 Composer 统一检索

两个界面共用**确定性的纯本地搜索/分类模型**，界面可以不同：

- 搜索字段：团队名称（最高）、`metadata.tags`、`summary`、`useCases`、`quickPrompts`、`notes`；可根据分类、来源和系统系列筛选。不默认索引完整 System Prompt、成员工具权限或敏感本地路径。
- 首版关键词/中文子串/空格词匹配即可，搜索结果稳定可解释、无 LLM API、无向量数据库；推荐任务只是搜索内容与点击复制的文本。
- 设置页：较完整的列表、分组管理、展示信息、编辑入口。Composer：轻量搜索框、系统/个人分类筛选、简短摘要和标签、实际“选择团队”操作；不把 CRUD 挤到 Composer 里。
- **「未选择团队」**作为会话选择器默认文案及固定顶栏选项，始终可见且不受搜索、分类筛选影响；选择后显示具体 Team 名称。清空选择只影响当前会话；如果正在等待会话空闲或宿主应用完成，显示实际“待应用/已应用”状态，不能提前声称已生效。
- 搜索状态、分类切换不会隐式改变会话 Team selection；不同会话选择互不串扰；刷新/切换后保留既有按 Session 保存的选择规则。

---

## 6. 阶段 D — Team Skills：资产、成员作用域与两条管理路径（P0）

### D1. 三种原生/专属范围不能混淆

| Skill 来源 | 谁管理 | 本插件行为 |
|---|---|---|
| DSH 用户级 Skill | DSH | 不接管、不移动、不重复注册为 Team Skill；继续受宿主原生继承规则约束 |
| DSH 项目级 Skill | DSH | 同上；特定项目的通用规范继续由项目级维护 |
| **Team Skill** | 本插件独立管理 | 私有资产库，仅向被分配的指定 Team 成员作用域注册；其他会话/角色不因插件注册而可见 |

- 用户不需要为了能分配 Team Skill，先把 Skill 安装到全局 `~/.dsh/skills` 或项目原生目录。
- **团队为组织容器，真正生效与隔离的最小单元为成员**：`teamId + roleId`；队长若分配，则使用独立的 captain slot identity，避免与普通成员混淆。不同团队可以复用同一份私有 Skill 资产。
- 所有 Team Skills 可选择性分配给队长、一个或多个成员，**不强制所有团队配置 Skill**。普通没有 Team Skill 的预设与 v0.1.5 一样正常。
- 如果同名 Skill 也存在用户级/项目级目录，不能宣称该名称在无关 Agent 上彻底消失；必须区分**插件所管理的 provider 无泄露**与**宿主原生已有同名资源**。做来源、命名冲突检测，使用稳定 asset ID，运行时解析遵照可验证的宿主 Scope 优先级规则；不偷偷覆盖用户的原生 Skill。
- **发现 ≠ 正文加载 ≠ 脚本执行**。仅目标成员允许发现候选信息；Agent 真正调用时才加载正文；脚本、模板、图片等资源通过安全的资源根目录按需访问，不自动运行 Python/Shell，也不放宽该成员已有工具权限。

### D2. 资产是**完整文件夹**

示例（相对路径完整保留）：

```text
<plugin-private-persistent-data>/agent-team-presets/
  skills/
    frontend-design/
      SKILL.md
      scripts/render.py
      scripts/build.sh
      references/guidelines.md
      assets/template.html
  manifest-or-registry.json
  member-skill-bindings.json
```

- 由目标宿主的官方持久化目录 API 提供根路径，禁止猜测通用全局技能目录；与插件**安装包的内置资源目录分离**，避免升级覆盖自定义资产。
- UI 支持：新建基础 `SKILL.md`、导入完整文件夹和 ZIP、查看资源目录/元信息、编辑文本资源、查看其他类型资源、删除、打开当前 Skill 文件夹。初版不造 IDE；可复用原生文件管理器/受控编辑器。Web 没有可靠原生“打开系统目录”能力时，提供受控目录浏览或路径复制与正确提示，不伪造点击动作。
- Agent 辅助管理复杂 Skill 的路径：用户在会话中明确提出管理要求，Agent 使用插件已提供且受控的管理工具；必要的 `team-skill-manager` 操作指导按宿主实际允许的显式、最小作用域机制提供，不在普通 Session 静默注册。设置页**不增加**“交给 Agent 处理”或打开专属 Agent 管理视图的按钮。没有可靠临时 Skill Scope API 时报告限制，不能回退到全局常驻；界面 CRUD 应仍可正常操作。
- 管理接口由 UI 与 Agent **共享同一后端**：包括 schema 校验、授权、并发修订号、唯一 ID、资源安全、安装/删除事务、依赖检查及审计日志。任何 Agent 指令都不能绕开后端判定完成删除。
- 文件导入安全：校验 frontmatter 名称/描述、路径规范、拒绝 `../` 路径穿越、绝对路径、符号链接逃逸、ZIP bomb、超大文件、恶意特殊文件；扫描/提示潜在秘密，要求用户确认安装来源和脚本风险；不得自动执行导入文件。
- 资源跨环境：Windows 宿主、Web 服务器、Ubuntu/子进程/容器中的可访问性与运行能力可能不同。`resourceBase` 指向目录并不自动授予执行权限；使用前检查或明确提示缺失运行依赖。

### D3. 内置 Team Skills：两份为第一批资产

- `github-repository-presentation`
- `git-release-hygiene`
- PR #1 的官方默认关联角色为 **「既定工作流执行」与「工程研发协作」中的 `repository-specialist`**；将两份 Skill 的出厂绑定只设置到这两个官方预设的相应角色。除非用户自行分配，其他内置团队、队长和普通 Session 都不获得这两项专属注册。

**PR 启动注册方式必须修复：** 不在插件 `apply()`/全局 `ctx.inject('skills')` 期间为所有普通 Session 安装一个可列出这两份技能的全局 provider。

期望生命周期：

1. 某个 Team 预设被选中，仅保存候选成员绑定；**仅选择 Team 不应令所有成员 Skill 全局可见**。
2. 仅在相应 `repository-specialist` 或用户指定的成员**实际创建/恢复**时，使用该成员自己的 `agent.ctx` 注册专属 Skill Provider；队长自己分配 Skill 时可在本会话根 agent 的作用域按独立规则注册。
3. 只向该成员暴露绑定的候选条目；真正调用再读取所选 Skill 正文及该版本的资源根路径。
4. 成员销毁、会话解除 Team、用户切换配置、插件卸载/热重载时释放相应注册；恢复会话后按稳定成员身份恢复正确 Scope，不能重复注册或泄露到其他成员。
5. 已加载进历史对话的内容不能通过注销消除；明确告知此限制，测试重点是**未来发现/加载**被撤销。
6. 若宿主的 Scoped Provider API 不提供上述严格能力，先通过最小探针在正式环境证实，报告阻碍并采取清晰的功能降级；**严禁全局注册冒充成员隔离**。
7. 角色 Prompt 可描述何时使用所分配技能，但不得将整个 Skill 正文复制进所有角色 Prompt；调整 PR 队长 Prompt 对技能归属的描述，避免队长误以为自己默认具有成员专属技能。

### D4. 删除：阻断级依赖检查

- **硬依赖**：当前 Skill 被一个或多个 `teamId + roleId` 绑定 → 删除拒绝，展示所有依赖团队/角色以及解除绑定入口。
- **活跃使用**：有运行中成员/会话引用该资产版本 → 删除拒绝（或显式安排安全撤销后再尝试）；运行中读到的资源不能中途消失。
- **资源间依赖**：注册表明确声明的跨技能依赖 → 删除拒绝；从 Markdown、脚本静态扫描到的疑似引用 → 警示、人工核实，不能宣称静态扫描完全可靠。
- **原子删除**：最后提交前后端重新检查绑定和占用状态，锁定/版本检查，失败不删半截目录；成功删除同时更新 registry 与 UI，不遗留孤儿绑定。Agent 管理入口执行同样规则。
- 官方只读原版不支持物理删除；允许停用、解除绑定或创建用户覆盖版；如选择停用但仍有角色依赖，显示清楚的运行效果，不能无告警制造不可用技能。

### D5. 内置 Skill 升级（P0，不可只做“版本号改了”）

**一致性原则：官方随插件发布的原版不可变，用户可编辑的是独立的本地覆盖版本；两者具有稳定 Skill ID 与完整版本信息。**

- 官方 Skill manifest：`skillId`、资源版本、来源、全目录相对文件清单、SHA-256 内容摘要/总摘要、兼容信息。不得只比较 `SKILL.md` 文本或依赖插件版本判断有无更新。
- `assets/skills/**` 官方原版随 `0.1.6` 安装包分发，原版只读。用户点“编辑内置 Skill”时，创建一个带 base-version 的本地覆盖资产，并将对应成员分配指向该可编辑版本；无需修改包内只读文件。
- 插件升级：未覆盖的官方 Skill 原版正常使用新版；有覆盖版则保留用户本地资源与绑定，提示官方新版已到，可比较差异、手动切换、恢复官方版本；**不自动三方合并 Python/Shell/Markdown/图片目录**。
- 全量目录版本化：脚本、references、assets 与正文是同一次发布的整体，原子切换并保留回滚快照；校验失败保持当前可用版本。需要防止启动时每次无条件复制覆盖旧用户数据。
- 活跃成员使用已绑定版本资源，不在会话中途被文件更新破坏；可以采用版本固定目录/资源引用计数或保守的“运行中禁止切换”方案，必须做恢复与升级测试。
- `npm pack --dry-run`/真实 npm 安装验证内置 Skill manifest 和所有资产完整进入 tarball；不能仅在源码 checkout 成功。

---

## 7. 阶段 E — UI、双语与可用性（P1，但属 0.1.6 发布范围）

### 设置页

1. 现有「配置」区域新增 **「团队技能 / Team Skills」** 入口；技能库以「插件内置」「自定义」来源区分（条目短标签显示「内置」）；每项显示名称、简述、来源、版本、绑定角色数与状态。
2. 点击技能查看目录树、`SKILL.md`、scripts/references/assets；用户自定义完整 CRUD；官方原版可查看、复制为覆盖版、比较/切换/恢复，不允许直接改写随包原版。
3. 在编辑 Team 角色的位置提供可见的**Team Skills 分配列表**，团队技能库负责存储，成员配置负责绑定；区分未分配、已分配、资源缺失、官方版本更新等状态。队长同理可单独配置。
4. 团队列表提供来源筛选、两个官方系列、自定义分类、搜索/排序；详情页显示独立展示元数据；新增团队可留空。标注“展示数据不会自动注入运行时上下文”。
5. 支持打开 Team Skills 文件夹；无权限或平台不支持时说明原因、提供真实可用的替代浏览方式。
6. **不提供“交给 Agent 处理”UI 按钮**。Agent 管理通过插件工具由用户在会话中发起，危险修改仍需实际授权；与可视化入口共用管理后端。

### 对话输入区团队选择器

1. 更改未选择状态为 **「未选择团队」**；对话框弹出的未选择选项固定顶部、始终可访问，不被搜索条件隐藏。
2. 提供关键词搜索、来源/官方系列/用户分类筛选、摘要和标签；选择 Team 之后显示 Team 名称，真正应用前不可误报状态。
3. 现有 Session selection、取消、切换、busy 延后应用、不同会话切换行为回归，不得因 UI 大改破坏消息输入区布局。
4. 无论设置页还是 Composer，检索与过滤一律不调用模型、不改 prompt、不可悄悄触发 Skill 加载。

### UI 质量

- 中英 locale、无障碍键盘操作、窄窗口弹层边界、暗色/亮色主题、长团队名/长 Skill 名、空态、重复名、读写失败、冲突提示与错误可恢复。
- 自定义类别删除前清楚说明“只删除分组，不删除团队”。删除 Skill 要列出阻断关系，按钮由后端实际安全规则决定，不仅仅前端禁用。

---

## 8. 数据模型与迁移设计建议（实现可等价，不可违背语义）

应分离四类事实源，避免重复来源：

1. **TeamPreset**：稳定 Team ID、既有运行字段与新增可选 `metadata`。**只有该对象的明确运行字段参与运行时。**
2. **Builtin Team Catalog**：官方 9 个稳定 ID、所属官方 series、随包模板与默认展示元数据。恢复默认的权威来源。
3. **Local View Preferences**：用户创建的 category ID/name/order、`teamId→categoryId` 映射；仅作为 UI 本地视图数据。
4. **Team Skill Store**：资产清单、来源、版本、原版/覆盖版、文件校验与版本固定；**Local Team Skill Bindings** 单独记录 `(teamId, roleId/captain)→skillAssetId/versionPolicy`。用户自定义绑定不随普通预设导出。

重要细节：现有 `src/types.ts` 的 `TeamAgentPreset` 定义看起来并未显式声明 `id`，但 `config.ts` 的 `memberSchema` 和持久化代码使用了 `id`。执行前核查真实类型与生成声明，确保新的成员绑定在 TS、存储与迁移中使用**同一个稳定 ID**；不得靠成员数组 index、中文名称推断身份。

迁移应幂等、可恢复、事务化：备份现有配置；解析 v0.1.5（含曾被删除/编辑的官方预设）、PR 中间态（若用户曾试装）、自定义预设与已存在选中 Session；重复启动、插件热重载不能重复播种或覆盖手改。发生损坏要明确报错，不要重置所有 Team 为官方默认。

---

## 8A. 跨版本兼容、绝对宿主隔离与发布硬闸门（新增硬性要求）

### 8A.1 绝不修改宿主源码（P0，零容忍）

- 插件所有能力只可通过 DSH **正式公开**的 Plugin API、Cordis Scope/Context、Settings、Remote、Composer 注入与官方文件持久化 API 实现；禁止修改 DSH 仓库源码、内部 manifest、原生 profile、宿主构建输出、用户宿主安装目录、node_modules 中的宿主包；禁止 monkey-patch、私自导入未公开内部路径、运行前复制“修复补丁”或修改宿主插件的代码。
- 允许修改**本插件**自身依赖、源码、配置、构建脚本、插件数据目录；开发调试需要临时插件侧 adapter 时，必须编译进正式插件产物并通过 Desktop 原装宿主验收。不得依靠 Web 开发环境中修改宿主才通过的行为。
- 执行 Agent 在任务开始、Webpack/tsdown 构建前、正式 Desktop 测试后分别记录：宿主 commit/tag 或发行版本、宿主工作区 `git status --porcelain`（如果可获得），宿主包校验或文件差异；**若发生任何意外宿主文件变化，标记 P0 FAIL，恢复宿主并复测**，不能将恢复行为记录成此前未发生。
- 宿主没有必要的 per-Agent 注册生命周期 API 时，按“功能不可用/已阻断”准确说明原因，不得退回全局注册来通过功能验收。Plugin 的加载与旧团队功能尽量仍可使用；隔离核心能力未通过时不得宣称 v0.1.6 完整验收通过。
- 测试分离：Web 插件源码热更新可调试，Desktop 必须通过 GUI/正式发行插件包（干净环境）安装后测试；同一份 `npm pack` 输出也要在可复现的 Web 正式插件加载路径测试，防止源码分支与发布包行为不一致。

### 8A.2 宿主和旧数据兼容策略

| 目标环境 | 本版承诺策略 | 需要执行的验收 |
|---|---|---|
| DSH `0.2.1-rc.2` · Web 开发 | 完整功能目标；仅改插件代码 | 调试、单测/E2E、配置/Scope/MCP 探针 |
| DSH `0.2.1-rc.2` · Desktop 生产 | **发布阻断级目标**；不改宿主 | GUI 安装/启停/升级/会话/Skill 完整回归 |
| DSH `0.2.0-rc.2` · 旧部署 | **尽力保持 v0.1.5 核心能力**；新增不支持能力明确降级 | 插件是否可加载、原三团队与原有模型/Prompt/工具能力是否稳定，差异与证据 |
| DSH 更新的兼容 rc/正式版 | 谨慎兼容、特性探测；不得保证未测试版本 | 至少在可取得的下一版执行冒烟检查，明确 supported/tested 分界 |

1. 启动顺序：探测服务/方法存在 → 验证语义（Scope 生命周期、disposer 生效）→ 注册相应能力；非关键扩展服务缺失时只隐藏该功能并给出说明，避免 `import` 阶段 Crash。
2. 配置格式：保留 `0.1.5` 旧数据原样迁移的可逆副本，迁移必须幂等；不能悄悄重置已编辑预设、路由、工具策略、已选 Session、自定义团队。
3. 声明范围：`package.json` 的 engines、peer 范围必须与**实际验证支持**一致。既不能虚称 `>=0.2.0` 的所有 RC 都完整支持，也不能无理由让仅有老核心功能的 rc.2 用户无法启用插件；采用兼容分支/渐进降级时明示功能差异。
4. 真实兼容测试需要覆盖：Windows Desktop 正式 GUI、Web 源码开发、Web 正式包加载、升级保留配置（带复杂 Skill）；如有 Linux Desktop 可测一并记录，不得将未执行平台填 PASS。

## 8B. 全量视图规范与 HTML 原型交接（新增）

**原型路径：** `DSH_AGENT_TEAM_PRESETS_v0.1.6_NATIVE_UI_PROTOTYPE_REVISED_V2.html`。单文件，内嵌 CSS/JS，离线可打开；其中示例状态均为 Mock，不与 DSH 宿主连通。开发 Agent 应复用现有 UI 组件、视觉语言、设置页布局和 Composer 扩展方式，实现同等级功能与交互；不要求把此 HTML 直接嵌入插件或逐像素照抄。

下列 UI 覆盖点以现有 DSH 设置弹窗、插件配置子页、团队/队员编辑页和 Composer 控件为基础；U15 是“**不得新增 Agent 管理按钮**”的约束，其余页面应能从现有入口导航到（不要求独立 route）：

| 视图编号 | 功能视图 | 强制表现/交互 | 对运行时影响 |
|---|---|---|---|
| U01 | 设置页总入口 | 原有团队配置 + 新增「团队技能」入口，支持中英文标签 | 无 |
| U02 | 团队预设列表 | 全部/插件内置/自定义（短标签：内置）、九个插件内置与两个固定系列、用户分组、搜索及数量；超出宽度的分类按钮隐藏但下拉可访问 | 无 |
| U03 | 分类管理 | 新建/重命名/删除/移动团队；删除只解除分组，不删团队 | 无 |
| U04 | 团队详情 | 团队名称旁标示运行时相关字段；团队用途说明下有明确提示块；摘要、标签、适用场景、推荐任务、备注和成员摘要分组展示 | 展示元数据不注入 |
| U05 | 团队编辑器 | 原 Prompt/模型/工具编辑能力保持；展示元数据单独区块且可空 | 非元数据字段按旧语义 |
| U06 | 元数据编辑 | 清楚标注「仅展示/搜索/分享，不注入运行时 Prompt」；标签用英文半角逗号 `,` 分隔，允许内容为空，支持长度验证 | **不注入** |
| U07 | 队长/成员 Skill 分配 | 沿用现有工具配置三列九宫格卡片勾选方式；来源小标签固定卡片左下角；仅选插件私有 Team Skill，显示内置/自定义及绑定、缺失和 MCP 状态 | 按实际成员 Scope |
| U08 | Team Skill 库 | 插件内置/自定义筛选、列表搜索、名称/来源/版本/绑定数/完整性状态 | 无 |
| U09 | Skill 详情/文件浏览 | 完整相对文件树、SKILL.md、scripts/references/assets、支持资源预览/编辑入口 | 无 |
| U10 | Skill 新建/导入 | 新建 SKILL.md、选择目录/ZIP、标准验证、风险警告、用户授权 | 导入后仍未自动分配 |
| U11 | Skill 编辑/内置覆盖 | 用户 Skill 可编辑；内置 Skill 只读且支持创建覆盖版/对比/切换/恢复 | 版本安全切换 |
| U12 | 删除与依赖阻断 | 显示哪些团队/成员/活跃会话/显式资产依赖阻断删除；后端强校验 | 不允许越权删除 |
| U13 | 内置 Skill 升级 | 官方版本差异、文件哈希、覆盖版保留、待更新、回滚 | 活跃引用版本固定 |
| U14 | MCP 与环境依赖 | Skill 所需 MCP serverName/工具/资源、依赖状态、作用域、手动连接或缺失提示 | 不得静默全局启用 |
| U15 | Agent 工具管理（无新增 UI） | 删除“交给 Agent 处理”按钮；Agent 可经插件工具按用户明确请求管理 Team Skill，不得全局静默注册管理 Skill | 受控权限 |
| U16 | 预设导入/导出 | 元数据随团队导入导出，自定义 Team Skills 与分配/路径不导出；官方默认绑定声明可导出 | 不影响默认 Session |
| U17 | Composer 团队选择器 | 默认「未选择团队」固定在最上，搜索与设置页同源、分类筛选、摘要、标签、选择/取消 | 仅显式选择后影响会话 |
| U18 | 空态/故障/兼容提示 | 无数据、长名称、重复、数据冲突、平台打开文件夹受限、Skill/MCP 服务缺失 | 清晰降级 |

设计原则：**以仓库 v0.1.5 实际 DSH 原生插件视图为准**，保留设置弹窗左侧宿主导航、现有三级编辑与底部保存栏，不做独立网站化面板。导航在设置页和 Composer 之间保持统一的分类名称；复杂资产行为在设置页完成，Composer 保持轻量；任何危险操作显示具体后果与撤销路径；涉及 MCP 凭据不得显示明文。原型不要求实现真实安装，但验收时须以实插件页面截图对照 U01-U18。UI 验收同时覆盖 1280px/900px/小窗口、浅色/暗色、中英 locale、Tab/Enter/Escape 键盘路径。

## 8C. Team Skill 标准、MCP 依赖与加载策略（新增）

### 8C.1 通用 Agent Skills 规范适配

参考 [Agent Skills 规范](https://agentskills.io/specification) 与 DSH 当前 [Skills 子系统](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/skills.md)，以目标 `0.2.1-rc.2` 实际代码为最终验收标准：

- 导入基本单位是**完整目录**，最小包含 `SKILL.md`；支持 YAML frontmatter 必填 `name`/`description`，规范 `name` 是 kebab-case，不自行删改合法的 `license`、`compatibility`、`metadata`、`allowed-tools` 等可选字段。通用规范允许自定义目录和文件，`scripts/`、`references/`、`assets/` 只是推荐，不应限制为唯一三个目录。
- 采用标准优先、宿主能力适配的原则；可以为内部资产 registry 增加**外部 manifest/sidecar**（稳定 ID、SHA-256、版本、来源、依赖、分配），但不要将插件私有字段强制写入第三方 `SKILL.md`，破坏跨 Agent 客户端可移植性。
- 导入允许 `.py` / `.sh` / `.js` / `.ts` / 模板 / 图片 / JSON 等任意受安全策略允许的资源并保留权限与相对路径；文本可编辑、二进制只预览/替换；不自动执行脚本/下载依赖，不把文件夹展开注入 Prompt。`allowed-tools` 仅能作为声明与提示，真实执行权限永远以 Harness 的工具策略为准。
- 针对 DSH 官方可以识别的目录 Skill、项目/用户/运行时候选源，保留来源标记；**不把已经在用户/项目原生目录注册的 Skill 搬入团队私库来伪装隔离**。
- 非标准但常见布局（flat `.md`、其他 Agent 框架 Skill manifests）允许**识别与解释**，仅在用户确认且可无损/安全转换时导入为标准 Team Skill 包；无法无损处理时拒绝并告知原因，不无声跳过额外资源。
- 静态检查脚本需要的可执行文件/依赖和路径访问性。安装包读取路径、Desktop 生产沙箱路径和 Web 容器路径必须分别验证；包含特权脚本或外部服务访问时显式提醒。

### 8C.2 MCP 不能等同 Skill；分离三类状态

**MCP server 是独立的连接/工具/资源提供者，Skill 可以依赖它，但一个 SKILL.md 的描述不意味着服务器自动安装、自动连接或自动加载。** DSH 官方 [MCP 文档](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/mcp.md) 描述：每个 server 通过 `@deepseek-ai/dsh-mcp-client` 配置成独立客户端；连接可产生工具、资源与 MCP server instructions，后者可能进入调用方 System Prompt。MCP 的生命周期、作用域和安全语义必须单独对待。

每个 Team Skill 可以在**插件侧依赖记录**中声明：

```json
{
  "skillAssetId": "team-skill:frontend-design",
  "dependencies": {
    "mcpServers": [
      {
        "serverName": "browser",
        "required": false,
        "capabilities": ["tools", "resources"],
        "toolNames": ["mcp__browser__snapshot"]
      }
    ],
    "executables": ["python3"],
    "pythonPackages": [],
    "otherSkills": []
  }
}
```

上例**仅为插件 registry 的建议 Schema，不是官方 `SKILL.md` / MCP 协议格式**。没有对应声明的第三方 Skill 不应推断出完整 MCP 依赖；静态从说明文档发现的名称只作为“疑似依赖”，用户确认后才能存为正式依赖。

| 状态层次 | P0 必须行为 | 不允许的行为 |
|---|---|---|
| 依赖声明与发现 | 在 Skill 详情和成员绑定视图展示需要哪些 MCP server/tools/resources；检查当前宿主**可见**连接是否满足 | 将文本提及的服务器默认为已装好 |
| 预检/缺失提示 | 缺少必要 MCP 时提示不可用或限制相关能力，列出修复方法；不保存明文 Token/KEY | 自动安装/连接、改用户级 MCP 配置或泄露密钥 |
| 角色作用域动态加载 | **仅在公开 API 允许按 Agent Scope 安全加载并能注销时才允许实施**；单独探针验证 `stdio`/HTTP、工具隔离、server instructions、失败重连/卸载 | 全局注册后宣称只对某成员可见；跳过 Tools 权限/宿主授权 |

- 如果 DSH `0.2.1-rc.2` 无稳定公共接口从插件动态挂载 per-Agent `mcp-client`，v0.1.6 至少交付**MCP 依赖声明、可见性检查、状态 UI 和用户手动配置指引**；明确把“插件自动按成员启停 MCP 连接”标记 **Blocked / 未实现**。用户级既有 MCP 仍由宿主管理，可被成员按宿主规则继承；不要为了 Skill 隔离去关闭用户已有 MCP。
- MCP 出厂默认：**无自动连接**。用户为 Team Skill 提供的 stdio command、HTTP URL、密钥引用属于环境配置，**与普通团队 JSON 预设分发隔离**。绝不在公开 Git 仓库、日志、导出文件、Error toast 中复制密钥；环境变量/Secret Reference 优先。
- 若确有 per-Agent 动态挂载：加载必须由用户显式允许的成员配置触发；缺依赖失败不能污染其他 Agent；注销后后续工具发现和 server instructions 不再注入（历史 Prompt 不能回收）。与 Team Skill 的 provider 生命周期分离，避免卸载 Skill 时误关闭别的角色或用户共享 MCP 连接。
- 远程 MCP 的 HTTPS/TLS、allowlist 和授权遵循宿主策略。对于未建立连接的服务**不能宣称“已加载”**。有风险操作须沿用宿主工具授权，而非仅凭 Skill 文本授予权限。

### 8C.3 全量 Team Skill / MCP 实验组合（单测 + Web + Desktop）

1. 只有 SKILL.md 的最小标准包；多级文档/脚本/图片资源包；含可选 `allowed-tools` 与 `compatibility` 的包；未知 metadata 保留。
2. MCP server 已配置、未配置、连接失败、无权限、同名不同 Scope；测试依赖显示与成员实际工具发现一致，确保**能力不可用**不会被错误标记为可用。
3. 带 MCP required / optional 的 Skill：required 缺失时给出阻断或明确降级，optional 缺失只提醒；**不在未授权时偷偷启动任何服务器**。
4. Script 运行环境缺失 / Shell 被成员工具策略拒绝；检查 Skill 可读取与脚本不可执行的区别。
5. MCP server instructions 可进入运行时上下文：与展示 metadata 不进入上下文的断言分别测试；成员没被分配/未授权时不得发生专属 MCP Prompt 注入。
6. Desktop Windows 的 stdio executable 路径、凭据引用、MCP 连接重连、网络不可用，必须在**原装生产安装**中记录结果；无法测试的内容标 `Not run` 或 `Blocked`，绝不能误标 Pass。

## 8D. 文档治理与公开仓库清洁度（开发完成后再执行）

- **文档重写在代码/测试基本稳定之后**。先审计公开仓现有 README、中文 README 的真实名称（当前为 `README.zh.md`，不是 `README_zh.md`）、安装章节、截图、示例预设、常见问题、引用链接、`package.json` 描述/版本、release notes 与 contrib 文档。
- README.md / README.zh.md 由当前**实际实现和已实测的发布包**驱动，不把 Handoff、内部测试日记、阶段迭代历史、调试命令堆在首页；面向普通用户回答五个问题：这是什么、适用宿主版本、如何安装、如何选择/编辑团队、Team Skill 怎样使用及权限限制。
- 对外界面文案以「插件内置 / 自定义」为来源筛选，条目短标签用「内置」，避免“官方内置”引发宿主官方误解。清理或修正 v0.1.5 截图、`0.2.0-rc.2` 最低兼容表述、三个内置团队数量、过期 API/CLI 参数、失效链接；新增 9 个团队/两系列、团队元数据不注入运行时、Team Skills 原生/团队三类 Scope、内置 Skill 升级原则、与 MCP 的真实区别。不要在 README 宣称未经 Desktop 验证的功能。
- 对公开仓保留简洁、稳定、真正有用户价值的 `README.md` / `README.zh.md`、截图和必要 usage/reference；`IMPLEMENTATION_REPORT.md`、`TEST_REPORT.md`、`*_HANDOFF.md`、`*_ACCEPTANCE.md` 等**执行过程文件应存放在开发交付目录或私有交接目录**，原则上不要随主分支对最终用户公开展示。若仓库贡献政策要求公开测试文件，可置于维护者文档目录并避免开发者对话、个人路径、凭据、机器标识、历史失败流水账。
- Markdown 语言切换链接对称、翻译内容功能上等价、截图使用实际新 UI；删除无效/重复入口以降低理解成本。变更日志写用户可见变更、升级行为和限制，不发布开发过程细枝末节。
- 文档 Gate：先编译通过 → Web 功能测试 → Desktop 生产兼容测试 → 按实情更新 README 和截图 → 链接检查 → 发布候选内容复核。任何主功能未过 Desktop Gate，README 必须反映尚未发布/未验证，不得以“已支持”表述。

## 9. 必须执行的测试矩阵

### T0. 基础工程与发布包

- [ ] 在 `dsh-v0.2.1-rc.2` 实际 checkout/已安装包环境执行 `npm test`、`npm run typecheck`、`npm run bundle`、`npm pack` 和适用 E2E；记录命令、退出码、环境及失败原由。
- [ ] Windows / Ubuntu 至少覆盖目标使用环境中的真实构建、安装与基本运行；对 PR 的 Windows `npm.cmd` 与 build path 问题给出修复或可证明的不阻断结论。
- [ ] `lib/` 与源码一致，tarball 确认 `assets/skills/**` 和所有必要声明包含在内；生成声明中无开发机绝对路径；没有以修改宿主代码作为成功前提。
- [ ] 缺失/禁用 Skill 服务或 optional package 时，插件仍能正常启动并使用普通团队能力。

### T1. 九团队与恢复

- [ ] 全新安装得到 9 个且无重复；官方系列分别 3 和 6；顺序与标签正确。
- [ ] `0.1.5 → 0.1.6`：已有团队（含重命名、Prompt 改写、路由/工具策略修改）保留，新增六个；不会重复原来三个。
- [ ] 老用户曾删除某官方团队：升级和反复重启都不悄悄复活；主动恢复全部则恰好得到九个官方团队，且自定义团队仍存在。
- [ ] 恢复单个、全部、复制/删除/编辑官方预设不破坏其他团队绑定；恢复时本地成员模型/工具策略按既有规则保留。
- [ ] `seededDefaults`、官方来源和本地自定义分类在重复迁移、重启、热重载后不漂移。

### T2. Metadata 与预设传输

- [ ] 九个官方默认带元数据，用户自建为空时合法；中英界面展示正确。
- [ ] 新格式导出→导入 round-trip、旧格式 v1 导入、非法格式拒绝、超长数据拒绝；导出仍无 provider/model/tools/本地 Skill 路径与自定义分配；**官方模板默认的角色 Skill 声明**可跨设备解析、缺少官方 Skill 时仅提示不可用。
- [ ] 新元数据无论多长，不改变 agent prompt、captain/member briefing、spawn 描述或模型输入；编写严格等值断言。
- [ ] 分类归属始终只在本地，团队导入导出后不携带个人分类；系统内置来源标识不被输入 JSON 伪造。

### T3. UI 搜索与选择

- [ ] 设置页与 Composer 按名称/标签/简介/场景/推荐任务搜索、中文关键词、清空、无结果、排序与分类筛选均正确；不查询 systemPrompt。
- [ ] 「未选择团队」在所有搜索/分类下可见；选中→取消→切换会话/重开会话结果正确。
- [ ] busy 状态切换提示正确，实际生效后才标记已应用；设置页和 Composer 一致；搜索不改变运行状态。
- [ ] 适配 Web/Desktop、窗口窄宽、中文/英文、明暗主题、键盘与长文本。

### T4. Skill 严格隔离

- [ ] 普通根 Session、未选团队：两份官方 Team Skills 在**本插件 provider** 下不可发现且不可 `get`；完整正文未注入。
- [ ] 选择某 Team 但未创建目标成员：不会给其他成员/普通 Session 全局注册该 Skill。
- [ ] 目标成员实际创建/恢复后，只有按绑定要求的成员作用域能发现、按需加载完整 Skill；同团队其他角色、另一团队的相同显示名成员均不通过此 provider 获取。
- [ ] 队长单独分配时只在所属 Session 生效；fork/fresh、重复召唤、会话重启、插件热重载、成员销毁、团队切换均不泄露或漏注册。
- [ ] 用户/项目级存在同名 Skill 时能够正确识别来源和优先级；不误删、不重定向宿主原生同名资源。
- [ ] Skill 正文加载时验证版本固定和资源相对路径可用；脚本未被自动执行，实际执行只在工具权限允许时发生。

### T5. Skill CRUD/依赖/升级

- [ ] 新建、导入完整 ZIP/目录、浏览/编辑/删除包含 `.md`、`.py`、`.sh`、图片/二进制资源的复杂文件夹，文件层级和校验完整。
- [ ] 路径穿越/符号链接逃逸/ZIP bomb/异常文件、名字冲突、无读写权限、磁盘/解压失败被安全拒绝，原配置未损坏。
- [ ] 被任一成员绑定/被运行成员占用/被显式依赖引用时删除**后端强阻断**，UI 与 Agent 管理路径相同；解除后才可删，删除事务可回滚。
- [ ] 官方只读 Skill 被编辑时创建独立覆盖版；官方随插件升级后覆盖版保持；可比对/选择新版/恢复官方/回滚，资源整包一致。
- [ ] 管理 Skill 仅显式会话启用；未激活时普通会话无法通过本插件发现它；UI 与 Agent 操作得到相同数据和错误规则。

### T6. 回归与安全

- [ ] 原模型路由/推理强度、captain 选择会话模型、工具限制、成员快照恢复、spawn 拒绝路径、跨团队 Session 隔离均无回归。
- [ ] 权限不足时停止危险修改并展示用户可理解的失败说明；无宿主能力时有清晰的未支持状态，不执行静默全局降级。
- [ ] 现有用户配置完整备份+升级+回退演练；未合并完成、测试未跑、未验证的部分明确标记。

---

## 10. 验收闸门 / 阶段顺序

1. **Gate A：** PR 合并记录、宿主 0.2.1 rc.2 版本差异与正式加载通过；构建依赖、可选 Skill 服务问题有实证。
2. **Gate B：** 九团队/播种/恢复、元数据传输与只读运行边界通过；旧用户迁移可靠。
3. **Gate C：** 独立 Team Skill 库、成员 Scope 及完整目录资源可以在生产安装中严格隔离；缺宿主 API 不得跳过此闸门而声称功能完成。
4. **Gate D：** UI/Agent 双入口、CRUD、强依赖阻断、官方 Skill 升级回滚及搜索/Composer 体验完成。
5. **Gate E：** 自动化测试 + 真实 Web/Desktop 体验测试 + npm 打包安装测试 + README（中英）、更新日志、截图/示例、`0.1.6` 版本号一致；**暂不自动发布**。

若 Scope 严格隔离在 `0.2.1-rc.2` 的公开 API 下确实不可实现，不能用全局注册替代；在交付报告中明确：宿主能力证据、已验证替代方案、尚未完成的门槛、对 0.1.6 是否可发布的影响，交由维护者做发布决策。其余已通过模块可以独立完成、测试并提交。

---

## 11. 执行完成应交付的文件和说明

- 完整代码、迁移逻辑、所有需要的 `lib/` 发布产物、内置九团队 JSON 与两份官方 Skill 资源包。
- `IMPLEMENTATION_REPORT.md`：PR merge SHA、宿主 rc.2 SHA、文件变更、模型/工具/Skill 生命周期设计、数据模型与迁移策略、已完成/偏差。
- `TEST_REPORT.md`：从 `DSH_AGENT_TEAM_PRESETS_v0.1.6_ACCEPTANCE.md` 复制或逐项填充的测试矩阵（Pass/Fail/Blocked/Not run）、实际命令、平台、生产包安装来源、截图/日志、异常复现和风险。Web 开发与 Desktop 生产是两套独立结论；未运行绝不标记 Pass。
- README.md 与 README.zh.md：**开发及验收完成后**按真实实现更新 v0.1.6、目标宿主版本、九团队与两系列、团队分类/元数据（不入上下文）、Team Skills 三层边界和 MCP 依赖说明；更新真实截图及用户示例，移除过期说明，不向普通用户倾倒内部开发日志。
- 最终状态报告明确：**PR 是否真实合并、插件是否已发布、正式安装环境是否验证、哪些功能尚未完成**。

---

## 12. 相关核查资料（供执行 Agent 到源码复查）

- 插件仓库： https://github.com/bloodarea/dsh-agent-team-presets
- PR #1 说明、三个提交、Windows 构建注意事项： https://github.com/bloodarea/dsh-agent-team-presets/pull/1
- 当前插件 v0.1.5 原型源码：
  - https://github.com/bloodarea/dsh-agent-team-presets/blob/main/src/types.ts
  - https://github.com/bloodarea/dsh-agent-team-presets/blob/main/src/config.ts
  - https://github.com/bloodarea/dsh-agent-team-presets/blob/main/src/preset-transfer.ts
  - https://github.com/bloodarea/dsh-agent-team-presets/blob/main/src/builtin-teams.ts
  - https://github.com/bloodarea/dsh-agent-team-presets/blob/main/src/index.ts
  - https://github.com/bloodarea/dsh-agent-team-presets/blob/main/src/application.ts
- PR Skill Provider 参考（需要改掉全局注册）： https://github.com/HaoyanZhang123/dsh-agent-team-presets/blob/feat/v7-team-presets/src/skills.ts
- 目标 DSH 官方 Release： https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.2.1-rc.2
- DSH 官方 Skill 设计说明： https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/skills.md
- DSH 官方 MCP 子系统： https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/mcp.md
- 通用 Agent Skills 规范： https://agentskills.io/specification
- DSH 0.2.1 系列旧 `{{cwd}}` 变量兼容性讨论（诊断参考，须自己复测）： https://github.com/deepseek-ai/deepseek-harness/discussions/9962

> **一句话产品原则：** 预设决定团队和角色；展示元数据只帮助人类发现团队；Skill 资产独立存储、只按成员分配、按需读取；运行时协作仍交给 DSH Harness。

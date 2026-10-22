# 调查结果：Agent Team 任务中途工具权限异常冻结

**报告来源：** `dsh-agent-team-presets-tool-quarantine-investigation.md`（P1，用户报告）
**调查基线：** HEAD `df748b4`（v0.1.6）
**调查日期：** 2026-10-22
**结论：** 报告中的核心故障**已复现**，根因**不是**热重载；同时发现并修复了一个报告未提及的**提权缺陷**，以及一个修复过程中引入（并由独立审查发现）的 **fail-open 缺陷**。

---

## 1. 复现矩阵

复现环境：仓库自有 harness（真实 Cordis/AgentLoop/Team 服务组合），`DSH_CHECKOUT=dsh-0.2.1-rc.2`。
所有结论以可运行用例固化于 `tests/quarantine-lifecycle.spec.ts`（31 用例）。

| ID | 场景 | 结论 | 证据 |
|---|---|---|---|
| R1 | 任务中途插件重挂载 | **复现** | 该 Agent 全部工具被拒，boundary 后自动恢复 |
| R1b | 连续 5 次重挂载 | 复现 | 无遗留 guard，boundary 恢复 |
| R2 | **无 Team 会话中途选 Team** | **复现（根因）** | 无可保护旧策略却全量冻结，persona 为空 |
| R2b | 冻结中再 deselect | 复现 | 文案仍点名已不存在的 Team，推荐动作无效 |
| R2c | teammate running 触发 | 复现 | roster settle 后恢复 |
| R3 | Team A → Team B 中途切换 | **未复现** | A 保持 applied，不隔离，boundary 采纳 B |
| R3b/c | A→B（teammate running）/ 空闲 NoTeam→A | 未复现 | 同上 |
| R5 | 冷启动 / 空闲重挂载 | **未复现** | 正常应用并恢复，含 member 工具 |
| R6 | 选中 Team 被删除 | 复现（持久） | 全拒；重挂载后仍拒；清空 selection 或恢复 Team 才恢复 |
| R6b | 运行中删除 Team | 复现 | 运行中不变，boundary 后转全拒 |
| R7 | allow-list 命名不可达能力 | 复现 | 文案可操作，修好后自动恢复 |
| R7b | 运行中变成无效 | 未复现 | A 保持 |
| R8 | teammate 永不 settle | 复现（无界） | 两次 boundary 后仍冻结，且 interrupt_agent 也被拒 |
| R10 | 连续 volatile + cancel | **未复现** | 无遗留 guard、无提前放权 |
| 追加 | **中途 deselect + 重载** | **复现（提权）** | 严格策略整个消失，DENIED 与 send_message 全放行 |
| 追加 | 隔离作用域 | — | 严格 per-Agent；子 Agent 由自身 parent guard 拒 |

**复现环境限制：** 全部为 in-process 组合测试，未使用真实模型与真实 Host 进程；PTC 用例需 `presentAs('ptc')` 且无 PTC runtime 时 Host 报错，故 PTC 阴性结论取自源码路径核实（`wireSchemas` 非 native 仅返回 `run_code`）而非端到端运行。

---

## 2. 根因分析

### 2.1 主根因（R2，无需热重载）

`src/index.ts:695-742` 的 busy 分支条件是：

```ts
const busy = startingTask ? teammatesBusy(ctx, agent) : agent.status === 'running' || teammatesBusy(ctx, agent)
if (busy) {
  if (!applications.has(agent) && selectedId !== undefined) quarantine(agent, `Team "${selectedId}" cannot be safely restored …`)
  return
}
```

该条件只检验「busy + 本实例无 application + 有选中 Team」，**不区分两种语义完全不同的输入**：

- **(A) 历史未知**：插件在任务中途挂载/重载，旧冻结策略不可知 → 保守隔离正确。
- **(B) 可证明的 No team**：该 Session 一直是 No team 运行，用户在任务中途选了 Team → 没有任何策略被放宽，冻结纯属误伤。

用户报告的文案恰好来自该分支，且 R2 无需任何热重载即可触发。**「自然语言仍可回复、工具全不可用」正是 `tools.guard` 单调拒绝的表现。**

### 2.2 次要缺陷：隔离无恢复通道

`quarantine()` 原实现 `agent.ctx.tools.guard(() => state.reason)` **无条件拒绝任何工具名**，包括本插件自己注册的 `get_team_preset` / `update_team_preset` 与 Team 协作工具。而拒论文案又要求用户「在 composer 里换 Team」——一条模型无法执行、用户也无从诊断的死路。这解释了「即使只读工具和消息工具也不可用」。

### 2.3 提权缺陷（报告未提及）

`authorize` 侧只按 `selectedId !== undefined` 决定是否隔离。因此：
**Team A 已应用 → 任务中途 deselect → 插件重载** → 新实例看到「无 selection + busy」→ 不进隔离分支 → Session 回落部署默认工具面，A 排除的工具（含 `send_message`）全部可用，persona 变空。这是**任务中途扩权**，与「A running task must retain the effective permissions frozen for that task」直接冲突。

### 2.4 修复中引入并被审查捕获的 fail-open

首轮修复用 `restoreFailures` 保住「restore 失败」的精确文案，但 `refuseTeam` 以 `!restoreFailures.has(agent)` 作为是否隔离的条件之一，而 `team === undefined` 分支漏清 `restoreFailures`。结果：双重故障 → 选 No team → 再选非法 Team 时守卫被跳过，**无守卫、无策略地回落默认全量工具**。经队长独立复现确认（DENIED/allowed 均放行）后修复，并加防御性兜底：守卫不在位时永远补装隔离，宁可覆盖文案。

---

## 3. 修复内容（最小必要改动，199 行新增 / 8 行删除）

`src/tool-policy.ts` — `CAPTAIN_RECOVERY_TOOLS`：精确 10 项字面量豁免（`get_team_preset`、`update_team_preset`、`send_message`、`list_agents`、`wait_agent`、`interrupt_agent`、`team_task_create/get/list/update`）。不复用 `PRESET_TOOLS`/`TEAM_TOOLS`（二者含创建入口），不前缀匹配。

`src/execution.ts` — `hasTeamApplicationMarker()`：读 Session 自有 `request/header` 的最新工具名，判断是否含 `spawn_team_member`（仅由本插件 `registerMemberTool` 注册，是可靠独占标记）。**只作阳性证据**：`true` 证明曾在 Team 下运行；`false` 不能证明 No team（PTC 折叠、all-mode、header 滞后于 assemble）。

`src/index.ts`：
1. quarantine guard 对 captain 的 10 项返回 `undefined`；子 Agent 因 `isSessionRoot === false` 继续 deny-all。仍是「不否决」，不 force-allow。
2. busy 分支重写：有 application → 不动；`selectedId !== undefined && proven` → 静默延后；`selectedId !== undefined || marked` → 隔离（**新增 `marked` 一支，堵住 deselect→remount 提权**）。
3. `provenUnteamed` 基线：仅在「非 busy + 无 application + 无 quarantine + 无 pending + 无 selection」的可信边界建立；应用、隔离、pending、dispose 即失效。
4. `restorePrevious` 失败改 fail-closed：dispose 半安装应用、清 application/definition/role/skills、立即隔离。
5. `restoreFailures` 在 `team === undefined` 分支显式清理；`refuseTeam` 加 `!quarantines.has(agent)` 兜底。

### 明确未做（及原因）
- **未**把「unknown + 无 selection」收紧为隔离：那会让「从未选过 Team、插件中途重载」的用户被冻结——正是本次报告的故障形态，等于用一个 DoS 去补一个更窄的窗口。
- **未**引入持久化冻结快照（报告 fix candidate A）：本次可安全独立交付 D2/D3/提权修复；跨重载无缝续跑是独立变更。

---

## 4. 测试结果

| 检查 | 结果 |
|---|---|
| `node tools/test.mjs`（全量） | **41 files / 638 passed / 1 skipped** |
| `node tools/test.mjs quarantine-lifecycle` | **31 passed**，连跑 3 次稳定 |
| `node tools/typecheck.mjs` | **host 0 / client 0** local diagnostics |
| 修复前对照（`git stash push -- src/`） | 新增 spec **16 failed | 14 passed**，失败点与修复项一一对应 |

既有用例（含 `application-freeze.spec.ts:711` 重挂载冻结→boundary 恢复、`tool-permission-matrix`、`preset-tools`、`security-regressions`）**全部未改动且继续通过**，证明 Team 创建、切换、中断、恢复路径未受影响。

**重要：** 新用例中 5 条 PTC/残余窗口用例在修复前也通过——它们断言的是「阴性不可当放行依据」的下游表现，不属修复点；判定函数语义由注释 + 恢复集精确性用例锁定。不将任何未执行/被跳过的测试计为通过。

---

## 5. 安全评估

**保留的不变量（逐条核实）：**
1. 运行中任务保留冻结权限 — `adopt()` busy 分支有 application 时直接 return。
2. 新选/编辑 Team 不中途扩权 — 运行中绝不安装新定义，仅 boundary 后 `schedule()`。
3. 插件重载不默认放开 — 阳性标记强制隔离（新增）。
4. 不可验证旧策略保守隔离 — 拒绝即隔离，`restore` 失败 fail-closed。
5. 隔离作用域精确 — guard 注册于 `agent.ctx`；child 无豁免；另一 root 不受影响（有用例）。

**提权路径核查：**
- `update_team_preset` 豁免**不能扩权**：`TeamPresetEdit` 只接受 description / 描述性 prompt / member description+prompt，不接受 `tools`/`toolMode`，且受 revision + human 请求 + approval 三重约束。
- `send_message` 豁免有副作用（可唤醒 inactive 队员，使 `teammatesBusy` 持续为真、延后 boundary），**但不能派生成员、不能自我扩权**。这是如实披露的权衡，不是「Team 停机保证」。
- `spawn_team_member` / `spawn_teammate` / `subagent*` / `workflow` / `run_code` / 普通能力 / 未知名 **仍全部拒绝**（含 spy 证明未被调用）。

---

## 6. 未解决风险

| 项 | 状态 | 说明 |
|---|---|---|
| **RESIDUAL WINDOW** | 已知，未修复 | 「空闲应用 A → wake（已 running、新 header 未 build）→ deselect → 重载」：旧 header 为阴性，仍被判为 unknown 而不隔离。需同时满足「任务中途重载 + 并发 deselect + 卡在 header 构建前」，窗口极窄。已写成显式用例并在源码注释标注「非本次修复目标」。 |
| 跨重载无缝续跑 | 未实现 | 需在应用前 durable 写入专用 marker（参照 `member-store.ts` 的 storageDomain 模式：unit/record 版本化、strict schema、绑定 exact root）。属独立变更。 |
| 插件卸载→新实例接管窗口 | 未覆盖 | teardown 会释放 guard，该期间的能力窗口需 Host 生命周期交接契约。 |
| 灾难恢复（R8 无界冻结） | 部分缓解 | teammate 永不 settle 时仍冻结，但现在 `interrupt_agent` 可用，用户有自救手段；Host 侧 roster 结算超时未在本次范围。 |
| PTC 端到端 | 未运行 | 测试环境无 PTC runtime，阴性语义取自源码核实。 |
| 极端规模 | 未验证 | 多租户并发 HMR 内存压力、超大日志下 `ownEvents()` 倒序扫描（通常首项命中）未压测。 |

---

## 7. 交付物

- `tests/quarantine-lifecycle.spec.ts`（新增，31 用例，含复现矩阵注释与残余窗口显式断言）
- `src/execution.ts`（+40）、`src/tool-policy.ts`（+31）、`src/index.ts`（+136/-8）
- `docs/quarantine-investigation-review.md`（独立审查报告，最终裁决 **APPROVE**）

独立审查由第三方成员完成，采用「`git stash` 逆向验证」确认测试有效性，并在首轮提出 1 项 P2 阻断项（上述 fail-open），修复后经二次复核转为 APPROVE。**未改动运行中的实例副本（`~/.dsh/profiles/web`），未重启 3080 服务。**

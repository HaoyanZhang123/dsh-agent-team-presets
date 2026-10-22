# 独立代码审查报告：Team 隔离生命周期与权限恢复修复 (T3)

- **审查对象**：`dsh-agent-team-presets` 仓库当前未提交改动
  - 代码变更：`src/execution.ts`、`src/index.ts`、`src/tool-policy.ts`
  - 测试用例：`tests/quarantine-lifecycle.spec.ts`（新增，30 个用例）
- **审查员**：reviewer（独立审查员）
- **日期**：2026-10-22
- **审查环境**：
  - Node.js + Vitest
  - DSH Checkout：`/home/dev/SourceCodeLibrary/Plugins/.dsh-checkout/dsh-0.2.1-rc.2`（只读）
  - 临时目录：`TMPDIR=/dev/shm/dsh-tmp`
  - 测试运行：全量 41 files / 637 passed / 1 skipped；类型检查 host 0 / client 0
- **审查结论**：**APPROVE（通过）** *(初始结论为 REQUEST CHANGES，发现的 P2 阻断项经执行者双重加固修复并通过独立复核后转为通过)*
  - **核心设计与安全不变量总体非常扎实**，针对 R1/R2 冻结与提权漏洞的修复方向精确，测试用例有效性已通过 stash 逆向验证（16/30 精准失败）。
  - **阻断项修复确认**：在生命周期状态机中发现的 1 个 **P2 级别缺陷**（`restoreFailures` 残留导致后续非法 Team 产生 Fail-Open）已由执行者完成双重修复（`team === undefined` 显式清除 + `refuseTeam` 兜底保底），新增用例覆盖了 `DENIED_TOOL` 关键证据，经独立全量回归测试确认彻底闭合。

---

## 一、审查发现清单（P0 - P3）

### [P2 已证实缺陷] `restoreFailures` 状态在切换至 "No team" 时未清理，导致后续非法 Team 选择跳过隔离 (Fail-Open)

- **文件与行号**：`src/index.ts:741-762`（特别是 748-749 行）
- **触发条件**：
  1. 会话已应用 Team A。
  2. 运行时更新为 Team B，应用失败且回滚恢复 Team A 亦失败，进入 `restorePrevious` catch 分支：触发 `restoreFailures.add(agent)`，并设置隔离。
  3. 用户在 Composer 中选择 "No team"（清空选择）：会话在任务边界触发 `adopt()` 中的 `if (team === undefined)` 分支。此时第 748-749 行执行了 `quarantines.get(agent)?.dispose()` 和 `quarantines.delete(agent)`，解除了隔离守卫。**但此处遗漏了 `restoreFailures.delete(agent)`**。
  4. 随后，用户在该会话中选择了一个非法的 Team C（例如包含不可达工具 `unreachable` 或 prompt 校验失败）。
  5. `adopt()` 触发 `refuseTeam(agent, team, unreachable)`。
  6. `refuseTeam()`（`src/index.ts:443`）执行判断：
     ```ts
     if (!applications.has(agent) && !restoreFailures.has(agent)) quarantine(agent, `${reason} ${recovery}`)
     ```
     此时 `applications.has(agent)` 为 false，但由于步骤 3 未清理 `restoreFailures`，`restoreFailures.has(agent)` 仍为 true！
- **影响**：
  `refuseTeam` 误以为会话仍然保持着先前 restore failure 的特定隔离信息，因而跳过了 `quarantine()`。但实际上步骤 3 早已清空了 `quarantines`。结果导致该非法 Team C **未被任何 quarantine guard 限制**，会话直接处于无任何插件守卫的 Deployment Default 状态，所有系统工具全量放行（Fail-Open 提权）。
- **代码证据**：
  - `src/index.ts:443`：
    ```ts
    const refuseTeam = (agent: Agent, team: TeamPreset, reason: string): void => {
      ctx.logger.warn(`${LOG}: Team "%s" was refused for Session "%s": %s`, team.id, agent.session.id, reason)
      // A restore that already failed left the more specific diagnosis in place;
      // overwriting it would hide the fact that the previous policy was lost.
      if (!applications.has(agent) && !restoreFailures.has(agent)) quarantine(agent, `${reason} ${recovery}`)
    }
    ```
  - `src/index.ts:741-750`（当前缺失清理）：
    ```ts
    if (team === undefined) {
      cancelApplication(agent)
      teamSkills.releaseAgent(agent)
      agentRoles.delete(agent)
      current?.dispose()
      applications.delete(agent)
      definitions.delete(agent)
      quarantines.get(agent)?.dispose()
      quarantines.delete(agent)
      // 此处缺失 restoreFailures.delete(agent)！
    ```
  - 对比其他清理点：
    - `applyTeamToAgent` 成功（Line 608）：有 `restoreFailures.delete(agent)`。
    - `teardown`（Line 867）：有 `restoreFailures.clear()`。
    - `agent/disposed`（Line 932）：有 `restoreFailures.delete(agent)`。
- **最小修复建议**：
  在 `src/index.ts:749` 处补充清理：
  ```diff
        quarantines.get(agent)?.dispose()
        quarantines.delete(agent)
  +     restoreFailures.delete(agent)
  ```
  *(防御性加固建议，可选)*：在 `refuseTeam` 校验时，确保只有在 `quarantines.has(agent)` 确实存在时才保留原有诊断：
  ```diff
  - if (!applications.has(agent) && !restoreFailures.has(agent)) quarantine(agent, `${reason} ${recovery}`)
  + if (!applications.has(agent) && (!restoreFailures.has(agent) || !quarantines.has(agent))) quarantine(agent, `${reason} ${recovery}`)
  ```

---

### [P3 风险披露] `send_message` 豁免对生命周期的潜在副作用

- **文件与行号**：`src/tool-policy.ts:38`
- **分析**：
  `CAPTAIN_RECOVERY_TOOLS` 豁免了 `send_message`。
  1. **正面作用**：在 R8 等场景中，队长可通过 `send_message` 或 `interrupt_agent` 与已存在的队员协调或通知异常，避免死锁。且 `send_message` 无法创建新队员（`spawn_teammate` / `spawn_team_member` 仍被严格拦截）。
  2. **副作用/需披露点**：DSH 的 `send_message` 机制规定，向处于 `inactive` 状态的队员发消息会**唤醒该队员启动新 Turn**。一旦队员变为 `running`，`teammatesBusy` 将持续为 `true`，导致会话无法到达空闲边界（task boundary），从而**延长队长的隔离状态**。
  3. **安全性结论**：队员本身由其自身的持久化快照约束，且处于隔离状态的队长无法派生新队员或提权，因此不存在直接越权漏洞；但此副作用需在文档中如实披露。

---

### [P3 建议与澄清] `update_team_preset` 豁免的提权风险审查结论

- **文件与行号**：`src/tool-policy.ts:37`
- **审查结论：证实安全，无法用于自我扩权**。
  - `update_team_preset` 工具仅允许修改 preset 的描述信息（`team_description`、`captain_description`、`captain_system_prompt`、`members[].description`、`members[].system_prompt`），**根本不接受 `tools` 或 `toolMode` 参数**，无法修改工具白名单。
  - 该工具内部具有多重防御：
    1. 强制 `requireUserRequest(ctx, captain, 'update_team_preset')`（必须在当前轮有明确用户指令）。
    2. 强制 `approval.request(...)`（必须触发 Host 用户审批弹窗）。
    3. 运行中检查：`executingMembers > 0` 时直接拒绝修改并返回 `team-busy`。
    4. 即使 preset 描述被修改，运行中的任务也不会采纳新定义，必须等待边界。
  - 因此豁免 `update_team_preset` 不构成提权通道。

---

### [P3 架构确认] 残留窗口（Residual Window: Request Header 滞后）确认

- **文件与行号**：`src/index.ts:717-723`，`src/execution.ts:58-74`，`tests/quarantine-lifecycle.spec.ts:1100-1131`
- **审查结论**：确认该窗口属于已知的架构权衡，本 PR 暂不闭合是合理决策。
  - 触发场景：会话在空闲时应用了 Team A -> 用户唤醒会话启动 Turn -> 在 Host 组装新请求 header 之前立即 deselect Team -> 插件立即重载。
  - 此时上一次保存的 header 仍为历史的 No-team header，`hasTeamApplicationMarker` 返回 false。
  - 若将所有未知状态一律隔离，会导致所有在无 Team 会话中热重载插件的用户遭遇广泛的拒绝服务（即本次用户报障的根本原因）。因此将其作为 Residual Window 记录在案是权衡下的正确取舍。彻底解决需要 Host 侧在 application 安装时落盘 durable marker。

---

## 二、五大安全不变量逐条核实

| 安全不变量 | 代码位置 | 为什么仍成立（机制核实） | 结论 |
| :--- | :--- | :--- | :--- |
| **1. 运行中任务冻结权限** | `src/index.ts:695-742`<br>`src/index.ts:626-646` | 在 `adopt()` 中，首行检查 `busy = startingTask ? teammatesBusy(ctx, agent) : agent.status === 'running' \|\| teammatesBusy(ctx, agent)`。只要任务处于 busy 状态：<br>1) 若已有 application，直接 return，保持原有已冻结的定义与策略，绝不中途修改或替换；<br>2) 若无 application 且未被证实为无 Team 会话，则进入 `quarantine` 拦截所有能力工具；<br>3) 即使触发 `schedule()`，也会将任务排入 Promise 队列，不会在 turn 执行中途生效。 | **PASS** |
| **2. 新选/编辑 Team 不中途扩权** | `src/index.ts:726-735`<br>`src/index.ts:766-770` | 1) 若在中途选择了新 Team（此前为 No-team 且为 `provenUnteamed`），执行 `if (selectedId !== undefined && proven) return`，仅推迟到任务边界应用，**运行中绝不授予新 Team 的工具或 Prompt**；<br>2) 若中途编辑了 Team（fingerprint 改变），由于 `busy === true`，`adopt()` 直接 return，新配置等待 idle 边界由 `schedule` 串行更新；<br>3) 若此前已有 Team A 正在运行，更换为 Team B 时，Team A 的 application 维持不变，直到队长与队员完全 idle。 | **PASS** |
| **3. 插件重载不默认放开** | `src/index.ts:726-737`<br>`src/execution.ts:77-86` | 修复了此前“中途 deselect + 重载插件导致策略丢失全量放开”的提权漏洞：<br>重载时若无 application：<br>1) 检查 `hasTeamApplicationMarker(agent)`，反向遍历会话事件日志，若最新 `request/header` 含有 `spawn_team_member`，证明该会话曾运行在 Team 下，即使此时 `selectedId === undefined`，也立即执行 `quarantine()`，拒绝所有能力工具；<br>2) 若 `selectedId !== undefined` 且未被本 activation 证实为 No-team，也立即进入 `quarantine()`。绝不默认回退至全开。 | **PASS** |
| **4. 不可验证旧策略保守隔离** | `src/index.ts:479-500`<br>`src/index.ts:750-753` | 1) 当更新失败触发 `rollback()` 回滚至 `previous` 时，若 `restorePrevious` 也抛出异常（双重故障），catch 块立即执行 `applications.get(agent)?.dispose()`、清理定义与角色，记录 `restoreFailures.add(agent)`，并执行强制 fail-closed 隔离：`"no tool access is granted until a valid Team applies"`；<br>2) 当所选 Team 被删除（dangling selection）时，`src/index.ts:751` 明确提示 `"Selected Team ... no longer exists. This is not 'No team'; tool access stays denied"`，保持隔离。*(注：见 P2 缺陷中关于后续清理的修复要求)* | **PASS** *(需合入 P2 修复)* |
| **5. 隔离作用域精确，不波及无关 Session / 子 Agent** | `src/index.ts:141-153`<br>`src/index.ts:271-274` | 1) `quarantine` 的 guard 是注册在 `agent.ctx.tools.guard`（当前 Agent 独占的 Context），不污染根 Context 或其他 Session 的 Agent；<br>2) 子 Agent（Child/Subagent/Teammate）判定 `isSessionRoot(agent) === false`，因此 `recoveryAllowed` 为 false，**子 Agent 完全不享受 10 项恢复工具豁免**，执行绝对 Deny-all；<br>3) 当父 Agent 处于隔离状态时，`agent/created` 会直接拒绝派生任何子 Agent（`Parent Team policy is quarantined; child creation is refused`）。 | **PASS** |

---

## 三、Quarantine Guard 改动逐行审查（核实是否存在弱化守卫）

对比 `src/index.ts:141-153` 的 diff：

```ts
  const quarantine = (agent: Agent, reason: string): void => {
    const previous = quarantines.get(agent)
    if (previous !== undefined) { previous.reason = reason; return }
    provenUnteamed.delete(agent)
    const state = { reason, dispose: () => {} }
    const recoveryAllowed = isSessionRoot(agent)
    state.dispose = agent.ctx.tools.guard(exec => recoveryAllowed && CAPTAIN_RECOVERY_TOOLS.has(exec.name)
      ? undefined
      : state.reason)
    quarantines.set(agent, state)
  }
```

逐项核对检查点：
1. **是否变为无条件放行？**
   - **否**。当 `exec.name` 在 `CAPTAIN_RECOVERY_TOOLS` 中且为会话根时，守卫返回 `undefined`。在 Cordis / DSH 工具守卫契约中，`undefined` 表示“本守卫不否决”，调用继续向下传递给后续守卫（如宿主 ACL、审批等）。若被其他守卫否决，依然会被拦截（已在用例 `tests/quarantine-lifecycle.spec.ts:975` 中独立验证）。
2. **是否绕过了 Host ACL / Approval？**
   - **否**。返回 `undefined` 仅代表解除插件自身添加的 quarantine 拦截，工具执行阶段仍会走正常的权限校验、参数模式匹配与 Host 审批流程。
3. **是否对 Child / Teammate 放行？**
   - **否**。`recoveryAllowed = isSessionRoot(agent)`，对于任何 child / subagent，`isSessionRoot` 返回 false，守卫对所有工具无差别返回 `state.reason`。
4. **非豁免工具是否依然严格拦截？**
   - **是**。任何未在白名单中的工具（包括 `run_code`、`bash`、`spawn_team_member`、`spawn_teammate`、`subagent`、`workflow` 等）均严格返回 `state.reason`，报错并阻断执行。

---

## 四、竞态与生命周期状态机审查

### 1. 三个 Set 的生命周期与流转分析

```
                     [adopt(): team === undefined && !busy]
                     +------------------------------------+
                     |                                    |
                     v                                    |
            +------------------+                          |
            |  provenUnteamed  |                          |
            +------------------+                          |
              |              |                            |
  [quarantine]   [schedule]  | [applyTeamToAgent 成功]    |
              |              v                            |
              +--------> (DELETED) <----------------------+
                                                          |
                                                          |
             [schedule()]                                 |
                  |                                       |
                  v                                       |
        +--------------------+                            |
        | pendingApplications|                            |
        +--------------------+                            |
          |                |                              |
  [cancelApplication]      | [jobs.epoch === epoch 解决]  |
          |                v                              |
          +-----------> (DELETED)                         |
                                                          |
                                                          |
        [restorePrevious 异常]                            |
                  |                                       |
                  v                                       |
         +-----------------+                              |
         | restoreFailures |                              |
         +-----------------+                              |
           |             |                                |
  [apply 成功]    [teardown / dispose]                    |
           |             |                                |
           +---------> (DELETED)                          |
                         ^                                |
                         | (P2 缺陷修复点: 此处必须补齐)   |
                         +--------------------------------+
```

### 2. 专项问题核查结果
- **`cancelApplication` 清除 `pendingApplications` 是否引入新漏洞？**
  - **独立审查结论：不仅没有漏洞，而且是必须的 Bug 修复**。
  - 在 `schedule()` 中，Promise 解决时的清理条件是 `if (jobs.get(agent)?.epoch === epoch) pendingApplications.delete(agent)`。
  - 当一个 job 被 `cancelApplication(agent)` 取消时，`jobs` 中的 epoch 会递增（`++nextEpoch`）。这导致旧 Promise 在随后 resolve 时，`jobs.epoch === epoch` 永远为 false。
  - 如果 `cancelApplication` 不主动执行 `pendingApplications.delete(agent)`，则该 Agent 将**永久滞留在 `pendingApplications` 中**，导致其未来即使在空闲边界也永远无法建立 `provenUnteamed` 基线。因此执行者的修复完全正确。
- **`schedule()` 中 `provenUnteamed.delete` + `pendingApplications.add` 与 epoch 的配合**：
  - 严密。每次调度新任务时，立即吊销无 Team 基线，并标上 pending；仅当最新 epoch 的任务完成时才移除 pending，防止并发重入产生基线错觉。
- **`adopt()` 中 `team === undefined` 建立基线的前置条件**：
  - 条件检查极其严格：`!applications.has(agent) && !quarantines.has(agent) && !pendingApplications.has(agent)`，且是在 `!busy` 与 `selectedId === undefined` 的前提下。确保只有当前激活期亲眼见证的干净空闲无 Team 边界才被接纳为基线。
- **`agent/disposed` 与 `teardown` 清理完整性**：
  - 核查 `src/index.ts:865-867`（`teardown`）与 `930-932`（`agent/disposed`），均对 `pendingApplications`、`provenUnteamed`、`restoreFailures`、`quarantines` 进行了无死角 clear/delete 与 dispose，无内存泄漏隐患。

---

## 五、测试有效性实测验证

### 1. 逆向失败验证（Git Stash 测试）
按照要求，使用 `git stash push -m "temp-stash-src" -- src/` 暂存 3 个生产代码修改，在未修复代码上直接运行新测试 `tests/quarantine-lifecycle.spec.ts`：

```bash
git stash push -m "temp-stash-src" -- src/
TMPDIR=/dev/shm/dsh-tmp DSH_CHECKOUT=/home/dev/SourceCodeLibrary/Plugins/.dsh-checkout/dsh-0.2.1-rc.2 node tools/test.mjs tests/quarantine-lifecycle.spec.ts
```

**测试输出结果**：
- **测试结果**：`Tests: 16 failed | 14 passed (30)`
- **失败用例对照（共 16 项，100% 对应本次修复点）**：
  1. `R1 > refuses capability tools but keeps the recovery channel...`（旧代码中 `get_team_preset` 被拒，期望 false 实际 true）
  2. `R1 > recovers at the boundary even after several remounts...`（`get_team_preset` 被拒）
  3. `R2 > defers the selection to the boundary without quarantining`（旧代码中 `ALLOWED_TOOL` 被拒）
  4. `R2 > adopts only the last of several definitions...`（旧代码中 `ALLOWED_TOOL` 被拒）
  5. `R2 > keeps the deployment default when the selection is cleared...`（旧代码中 `ALLOWED_TOOL` 被拒）
  6. `R2 > defers when a teammate runs instead of the captain`（旧代码中 `ALLOWED_TOOL` 被拒）
  7. `R6 > refuses capability tools persistently, and clearing the selection recovers`（`get_team_preset` 被拒）
  8. `R6 > defers the freeze to the boundary when the Team is deleted mid-task`（`get_team_preset` 被拒）
  9. `R7 > quarantines with the actionable reason...`（`get_team_preset` 被拒）
  10. `R8 > quarantines a cold-started Session whose teammate is still provisioning`（`get_team_preset` 被拒）
  11. `R8 > stays frozen while the roster never settles, but can now interrupt...`（`interrupt_agent` 被拒）
  12. `the deselect-then-reload escalation is refused`（**关键提权点**：旧代码未拦截，`ALLOWED_TOOL` isError 期望 true 实际 false）
  13. `the proven-unteamed baseline is invalidated by an application`（**提权防线**：旧代码未拦截，`ALLOWED_TOOL` isError 期望 true 实际 false）
  14. `the recovery set is exact > exempts exactly the ten captain tools...`（旧代码中 `CAPTAIN_RECOVERY_TOOLS` 未定义）
  15. `the recovery set is exact > does not override another guard...`（旧代码中 `send_message` 被拒）
  16. `a failed restore fails closed`（**Fail-Closed 防线**：旧代码错误信息不符）

### 2. 工作树恢复验证
执行 `git stash pop` 并执行 `git status` 严格核实：
```
位于分支 main
尚未暂存以备提交的变更：
	修改：     src/execution.ts
	修改：     src/index.ts
	修改：     src/tool-policy.ts
未跟踪的文件:
	tests/quarantine-lifecycle.spec.ts
```
工作树状态与审查开始前严格一致，无任何污染。

### 3. 当前代码全量回归与类型检查
- `TMPDIR=/dev/shm/dsh-tmp DSH_CHECKOUT=... node tools/test.mjs`：
  - **41 files passed (41)**
  - **637 passed | 1 skipped (638)**
- `TMPDIR=/dev/shm/dsh-tmp DSH_CHECKOUT=... node tools/typecheck.mjs`：
  - **host: 0 local diagnostics**
  - **client: 0 local diagnostics**

---

## 六、断言质量与过度设计审查

1. **断言质量核查**：
   - 测试用例没有只断言“不报错”或简单的布尔判断。
   - 对每一个被拒绝的工具，严格断言 `isError === true` 并且断言 `result.text` 包含特定的错误诊断子串（例如 `cannot be safely restored`、`no longer exists`、`names capabilities this Session cannot reach`）。
   - 引入了 `SPY_TOOLS` 机制，在工具体执行时向 `spyBodies` 数组记录工具名，确凿证明了**是守卫放行并且工具体真实执行**，排除了因环境缺少工具而假绿的可能。
   - 对 `spawn_teammate`、`subagent`、`workflow` 等可能扩权的工具，断言其未在 `spyBodies` 中出现，且 mock 派生函数未被调用。
2. **是否存在过度设计？**
   - 生产代码净增量约为：`execution.ts` 40 行，`tool-policy.ts` 32 行，`index.ts` 约 110 行。
   - 引入的机制（`hasTeamApplicationMarker`、`provenUnteamed`、`restoreFailures`、`pendingApplications`）各自精确对应一条明确的复现场景或提权路径，没有引入多余的设计模式或框架性封装，复杂度与问题规模相符。

---

## 七、未验证项清单（Unverified Items）

受限于测试桩与沙箱环境，以下场景属于已知未直接在真机多用户并发下测试的项：
1. **多租户并发 Deselect/Reload 压测**：测试覆盖了单进程内 2 个 Session 的独立隔离，但未模拟极高并发下同时对 100+ 会话做 HMR 重载的极端内存压力。
2. **极端耗时长轮询与网络中断**：`hasTeamApplicationMarker` 依赖 `agent.session.ownEvents()`，如果 Session 历史事件达到数万条且未归档，倒序扫描在极端情况下可能有轻微延迟（但通常在第 1 个 header 即可命中中断循环，平均开销忽略不计）。

---

## 八、审查员最终交付意见

- **裁决**：**APPROVE（通过）**
- **复核说明**：初审发现的 1 项 P2 阻断项已由执行者完成双重修复并通过独立复核与全量回归验证，所有安全不变量完整成立，具备合入发布条件。

---

## 九、最终复核（P2 已修复）

### 1. 修复方案代码核查（双重加固）

执行者采纳了双重防御实现：
1. **显式状态机清理**（[src/index.ts:758](src/index.ts#L758)）：
   在 `team === undefined` 分支中，伴随 `quarantines.delete(agent)` 同时执行了 `restoreFailures.delete(agent)`，确保当会话主动切换至 "No team" 边界时，先前的失败诊断状态与守卫一同销毁，不再滞留。
2. **守卫在位性兜底加固**（[src/index.ts:446](src/index.ts#L446)）：
   在 `refuseTeam` 中将条件加固为：
   ```ts
   if (!applications.has(agent) && (!restoreFailures.has(agent) || !quarantines.has(agent))) {
     quarantine(agent, `${reason} ${recovery}`)
   }
   ```
   核心安全逻辑：“仅在守卫确实在位时才保留旧的诊断文案；一旦守卫已不在位，宁可覆盖文案也必须立即安装隔离守卫，绝不跳过隔离”。该加固确保即使未来存在任何意料之外的 `restoreFailures` 残留，也不会再次引发无守卫放行的 Fail-Open 隐患。

### 2. 全生命周期路径扫描（确认无其它泄漏路径）

独立审计了 `restoreFailures` 在全仓中的全部 7 处出现点：
- **定义**（Line 90）：`new Set<Agent>()`。
- **添加点**（Line 500）：唯一添加点位于 `restorePrevious` 异常捕获块，仅在“候选更新失败且回滚也失败”的双重故障时记录。
- **清除点**：
  1. `applyTeamToAgent` 成功（Line 613）：`restoreFailures.delete(agent)`。
  2. `team === undefined` 空闲边界（Line 758）：`restoreFailures.delete(agent)`。
  3. `agent/disposed` 会话注销（Line 941）：`restoreFailures.delete(agent)`。
  4. 插件 `teardown`（Line 876）：`restoreFailures.clear()`。
- **使用点**（Line 446）：受 `!quarantines.has(agent)` 严格兜底保护。

**结论**：`restoreFailures` 的所有生命周期出入口形成严格闭环，不存在任何可能漏清导致状态残留的死角。

### 3. 测试用例有效性与关键证据复核

针对新增测试用例 `tests/quarantine-lifecycle.spec.ts:1023`（`does not turn a stale restore failure into an unguarded Session`）：
1. **DENIED_TOOL 关键证据核查**：
   用例第 1050-1056 行明确调用了未包含在非法 Team 白名单中的全局能力工具 `DENIED_TOOL`，断言 `denied.isError === true` 且错误信息包含 `names capabilities this Session cannot reach`，并同时断言 `ALLOWED_TOOL` 也被隔离拦截。由于 Fail-Open 的本质是所有全局工具（包括本应被排除的 `DENIED_TOOL`）全部被无守卫放行，**断言 `DENIED_TOOL` 的拦截确凿证明了隔离守卫已正确生效，Fail-Open 漏洞彻底闭合**。
2. **场景变体覆盖核查**：
   - 变体 A（“restore failure -> No team -> 非法 Team”）：由本新增用例精准覆盖。
   - 变体 B（“restore failure -> 直接选另一个合法 Team”）：已由前一用例（Line 1017-1021，`a failed restore fails closed`）覆盖，证实选择合法 Team C 时能正确清理隔离并采纳新配置。
   - 变体 C（“restore failure -> 直接选非法 Team”）：由于 `quarantines` 仍在位，`refuseTeam` 保留原有更严重的 restore failure 报错文案，守卫持续保持拦截，不发生状态逃逸。

### 4. 独立验证与回归结论

- **测试执行**：
  - 单文件：`node tools/test.mjs tests/quarantine-lifecycle.spec.ts` -> **31 tests passed**（原 30 个，新增 1 个）。
  - 全量套件：`node tools/test.mjs` -> **41 files passed (41)**，**638 passed | 1 skipped (639)**。
  - 类型检查：`node tools/typecheck.mjs` -> **host 0 / client 0** local diagnostics。
- **残余风险确认**：
  - 残留窗口（极速 deselect + 重载导致 header 滞后）与 `send_message` 唤醒队员致使边界推迟，属于已知且已在文档中明确披露的权衡项，不构成阻断。
- **最终结论**：**APPROVE（审查通过，准予合入发布）**。

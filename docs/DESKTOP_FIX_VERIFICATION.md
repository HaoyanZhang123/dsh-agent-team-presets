# Desktop 缺陷修复与复测交接

本次依据 Windows 11 x64 / DSH Desktop `0.2.1-rc.2` 的 v0.1.6 独立验收报告完成代码修复，交付 **0.1.6 修复构建**（版本号保持不变）。外部报告保留为原始证据，仓库[Desktop 验收清单](<DSH_AGENT_TEAM_PRESETS_v0.1.6_DESKTOP_ACCEPTANCE.md>)保留为待填写清单。以下本地验证不代表 Windows 实机验收通过；未发布 npm，未部署本次 Host 修复到当前 3080 实例或远端 Desktop。

## 已核对的技能数量

- 包内只有两项内置技能：[github-repository-presentation](<../assets/skills/github-repository-presentation/SKILL.md>)、[git-release-hygiene](<../assets/skills/git-release-hygiene/SKILL.md>)；[官方技能 ID](<../src/team-skills/index.ts>)与[官方默认绑定](<../src/team-catalog.ts>)一致。[README](<../README.md>)与[中文 README](<../README.zh.md>)已列出这两项，无需修改数量描述。
- 三个研发规模团队的 `executor` 默认各绑定这两项；「既定工作流执行」与「工程研发协作」默认绑定给 `repository-specialist`。角色可见的 Team Skill 以其当前绑定为准，全局技能另计。
- 原清单 D-R04 的“14 项”无实现依据，已修正为按绑定名称核对；干净安装或恢复默认后的「标准研发团队」`executor` 预期为上述两项。该文档错误不抵消报告中“成员 Team Skill 注入为 0”的运行时失败。

## 本轮修复目标与判定

| 项目 | 判定与交接 |
|---|---|
| **P0-A：资产 ID 中的冒号进入 Windows 目录名** | **代码已修，本地回归通过；Windows 待复测**。资产/manifest 的逻辑 ID 与磁盘名分离；含冒号、大写、DOS 保留字、尾点和长组件使用确定性编码，JSON/绑定 ID 保持不变。旧 POSIX 当前及历史版本目录通过事务迁移，新旧冲突拒绝覆盖。 |
| **P1-B：受信任根目录的 junction 被拒绝** | **代码已修，Linux 祖先链接等价场景通过；Windows junction 待复测**。打开时固定 `DSH_HOME`／包来源的实际祖先，bindings 使用同一根路径；保留根自身、库内目录/文件、导入根与 inbox 的链接拒绝。根解析错误在异步启动内返回具体故障，普通会话和插件加载可降级。 |
| **环境 BLOCKED** | 报告中 `ui-settings.enabled=false` 导致的设置页/主题入口不可达，以及缺少 tarball 的安装步骤受阻，属于环境与交付材料限制，**不是插件 bug**。保留 BLOCKED 并在具备条件的环境补测。 |
| **D-U04 选择器未展开** | 自动点击未展开的原因尚不确定；需远端 Windows 人工或可靠输入链路复测，不能据此直接判为插件缺陷或 PASS。 |
| **安装包** | [dsh-agent-team-presets-0.1.6.tgz](<evidence/desktop-0.1.6-fix/dsh-agent-team-presets-0.1.6.tgz>)，803750 字节；**版本号保持 0.1.6**（工作区修复构建，未提交/发布），内容与本仓库 `lib/` 一致。SHA-256 见下方。 |

## 安装包与本地验证

```text
包版本：0.1.6（未升版本；与 0.1.6 发布包同版本号、不同构建内容）
SHA-256：0ddcb460d81283d2a719f67c24a474ce425847b70dca943f8de35026d334dfc4
```

- `npm run bundle`：成功；本插件 Host/Client 均零诊断。依赖 checkout 既有诊断按工具既定策略过滤，不算全 checkout 类型通过。
- `npm run typecheck`：本插件 Host/Client 均零诊断。
- `npm run test:e2e`：43 个测试文件通过，**611 项通过、1 项跳过**。跳过的是 Windows 专属 drive-relative 恢复坐标拒绝用例；当前 Linux 环境不能执行它。覆盖生产 Loader/设置写入、角色注入与隔离、删除阻断、并发写入及真实进程 SIGKILL 恢复。
- 新增路径回归覆盖：两项随包资产真实安装、保留逻辑 ID、Windows 安全磁盘名、祖先链接、固定根不随原链接改指向、bindings/inbox 内部链接拒绝、旧布局与历史版本迁移、冲突不覆盖、迁移已提交/未提交恢复、原子 manifest 临时文件不阻塞打开、启动失败对页面/工具可见。
- 新增 **D-R04 注入回归**：在 home 与包来源都经链接（junction 等价）的部署上安装两项官方技能、绑定 `executor`，再用真实 `SkillRegistry` 验证被绑定角色可见并读取到两项技能正文与资源目录，未绑定成员和全局层均为空——即报告里“注入为 0”的复现路径现已被自动化覆盖。
- 从交付 tarball 实际解包并运行其中已编译 store：两项官方技能安装、home/包来源祖先链接、本地副本编辑和重开通过。未替换 YAML 桩；未打宿主补丁。此定点检查使用仓库 node_modules 解析发射模块依赖；完整宿主组合由上面的生产 Loader 测试覆盖，仍不能代替 Windows tarball GUI 安装。
- 范围说明：没有重命名技能包内部资源（避免破坏脚本相对引用），也没有新增会拒绝历史 POSIX 包的资源名规则。第三方包含 Windows 不支持的资源名仍可能导入失败，不能据本轮资产 ID 修复声称任意第三方包均可跨平台。
- 私有库存储布局会在首次打开时迁移；复测前请备份该插件数据目录。本构建保留逻辑 ID 和历史版本，但**迁移前**的构建（同为 0.1.6 版本号的旧包）不认识编码布局；回退须一起恢复备份，避免只替换程序包。

## 远端 Windows 复测顺序

1. 使用 lead 交付的同一安装包，在独立 Desktop 测试 profile 中记录宿主版本、Windows 版本、安装包 SHA-256 与实际安装来源。使用 Settings 正常开启的环境；不要为通过验收修改宿主内部文件。
2. **P0-A**：`DSH_HOME` 使用真实目录，确认官方技能安装成功，registry 保留两项 `builtin:<skillId>` 逻辑 ID，资产与 manifest 路径可读取；干净库的 `list_team_skills` 应发现两项内置技能。
3. **P1-B**：在 `DSH_HOME` 为 junction 的部署上重复安装、读取与重启检查，并覆盖包来源路径位于 junction 下的情形；确认内部恶意链接/路径逃逸仍被拒绝。
4. 回归 **G05/G06、D-S01～D-S05、D-R04**：验证技能库、只读原版、本地副本、恢复默认、复制路径与删除阻断；核对「标准研发团队」`executor` 当前绑定和成员实际技能名称，默认应为两项，队长和未绑定成员不获得这些 Team Skill。执行相关任务核对实际按需调用。
5. 在 Settings 可达的环境补测原报告的其余 BLOCKED 项与 **D-U04**；完成正式包安装、停用/重启、卸载/重装生命周期。逐项记录 PASS/FAIL/BLOCKED/NOT_RUN 和证据。

远端 Windows 实测仍待执行；本地静态核对或测试通过均不能代替 Desktop 复测签署。

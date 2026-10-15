/**
 * The Team presets this plugin ships as its own defaults.
 *
 * A deployment that installs this plugin gets three ready Teams before its user
 * has read anything about Team presets: a lightweight one for a small module, a
 * standard one for a medium feature or a refactor, and a full-stack one for work
 * that spans web, desktop, and Android. They are ordinary stored Teams in every
 * other respect — editable, duplicable, selectable, and deletable — so the
 * shipped set is a starting point rather than a fixed policy. The one thing that
 * makes them special is that this plugin knows their exact content, which is
 * what lets Settings put them back.
 *
 * Two rules keep that knowledge from becoming a trap:
 *
 * - Installing a shipped preset never overwrites a stored one. Seeding appends a
 *   preset the deployment does not hold and records its identity in
 *   `seededDefaults`, so a shipped preset the user deletes or edits stays
 *   exactly as they left it across restarts. Restoring it is a deliberate act.
 * - Restoring a shipped preset replaces the fields a shared document carries —
 *   the name, the purpose, every standing prompt, the accent colors, and the
 *   roster — and keeps the fields it does not: a member's model route and every
 *   slot's tool policy. A document that never carried a route cannot be evidence
 *   for discarding one, exactly as the import path already treats it.
 *
 * The documents below are the shipped source of truth. `contrib/default-presets`
 * holds the same three documents as JSON for readers of this repository, and
 * `tests/builtin-teams.spec.ts` proves the two cannot drift.
 * @module dsh-agent-team-presets/builtin-teams
 */

import { applySharedFields, captainFromTransfer, slotNameKey } from './preset-transfer.ts'
import { TEAM_PRESET_FORMAT, TEAM_PRESET_FORMAT_VERSION } from './preset-transfer.ts'
import type { TeamPresetTransfer, TeamSlotTransfer } from './preset-transfer.ts'
import { toolMode } from './presets.ts'
import type { TeamAgentPreset, TeamPreset, TeamSlotPreset } from './types.ts'

/** Identity the lightweight Team is stored under. */
export const LIGHTWEIGHT_TEAM_ID = 'builtin-lightweight'

/** Identity the standard Team is stored under. */
export const STANDARD_TEAM_ID = 'builtin-standard'

/** Identity the full-stack Team is stored under. */
export const FULLSTACK_TEAM_ID = 'builtin-fullstack'

/** The lightweight Team, exactly as it ships. */
const LIGHTWEIGHT: TeamPresetTransfer = {
  format: TEAM_PRESET_FORMAT,
  version: TEAM_PRESET_FORMAT_VERSION,
  team: {
    name: '轻量研发团队',
    description: '适合小型功能与模块迭代。队长划分任务，架构顾问按需处理技术决策，研发执行者承担编码、调试、测试与修复。',
    captain: {
      name: 'team-lead',
      description: '确定目标、任务写入边界和验收证据，按需调度与最终风险裁决。',
      systemPrompt: '你是工程团队队长，负责范围、调度、依赖、风险和最终验收。具体实现交执行者，专业决策咨询对应顾问。\n1. 仅在用户明确要求团队协作时召集成员；先确认目标平台、项目规则、权限与实际可用工具、验收标准。不得假定服务、浏览器或设备可用，不索取明文秘密。\n2. 任务板按切片记录交付物、验收、依赖、负责人及文件写入范围；仅并行互不冲突的工作。接口契约未确定不得盲目实现；已有任务不重复派发，以消息和状态事件推进，避免空转查询。\n3. 按任务召集 executor 完成实现和验证；涉及新模块、跨层契约或关键技术阻塞时，再咨询 fullstack-advisor。顾问不参与常规调试循环，队长依据测试证据验收。\n4. 交接优先使用变更路径、简要差异、测试命令和结果、证据位置、待决风险；详情按需读取，不要求复制完整日志。共享浏览器实行单操作者交接；视觉结论需实际查看落盘截图，缺少证据则标记未验证。\n5. 高风险问题修复后复验；同一问题两轮未解决须重新分析根因。必要验收缺证据不得放行；仍有运行中成员或未闭环任务时不得宣布完成。\n6. 最终汇总交付内容、验证结果、未验证项及风险。Git 暂存与提交遵守项目规则和用户授权；push、发布、改写历史分别取得授权。成员默认不继续委派，例外需明确授权并确认工具支持及隔离范围。',
      color: '#4c8dff',
    },
    members: [
      {
        name: 'fullstack-advisor',
        description: '按需提供跨层技术方案与可执行验收契约，不负责具体编码。',
        systemPrompt: '你是全栈架构顾问，负责技术方案与实施契约，不修改生产代码、测试或生成脚本。\n1. 围绕具体问题查阅项目规则、相关实现与必要文档，沿用既有技术栈，不扩大重构范围。\n2. 按需确定模块边界、数据流、接口字段与错误语义，并提示涉及的权限、安全、迁移兼容及性能风险；列出假设和待决事项。\n3. 输出给执行者的简洁契约：关键决定、关联文件或接口、验收条件、阻塞及风险。仅在关键技术取舍、方案变更或明确阻塞时重新介入。\n4. 只写获指派的契约文档；静态分析不能冒充运行验证。默认不继续委派，也不接管常规编码、调试和测试。',
        color: '#e0a43c',
      },
      {
        name: 'executor',
        description: '负责具体编码、调试、测试、修复与验证交接。',
        systemPrompt: '你是研发执行者，负责获派范围的编码、调试、测试、修复和必要生成脚本。\n1. 先核对任务、项目规则、相关实现、接口契约、文件归属与验收要求；业务歧义交队长澄清，不自行补造规则。\n2. 按最小可验证切片实施，覆盖必要校验、错误处理和回归测试；遵循现有技术栈，不改无关文件或覆盖他人产物。默认不继续委派。\n3. 运行适用的 lint、测试、构建和必要的真实链路，记录命令、结果、失败原因与验证范围；mock 通过不能替代关键真实路径。重要修复补负例，测试失败不得报通过。\n4. 每个检查点交接变更路径、简要差异、测试证据、风险与待决事项；长日志只传位置。按审查意见定点修复，同一问题两轮失败则报告根因并交队长协调。\n5. 生成物按项目流程产生，不手改；提交前核对暂存范围并遵守授权，push 与发布另需授权。浏览器或设备操作先确认能力及交接；视觉相关任务保留页面、视口、状态和落盘截图，未实际验证不宣称通过。',
        color: '#4c8dff',
      },
    ],
  },
}

/** The standard Team, exactly as it ships. */
const STANDARD: TeamPresetTransfer = {
  format: TEAM_PRESET_FORMAT,
  version: TEAM_PRESET_FORMAT_VERSION,
  team: {
    name: '标准研发团队',
    description: '适合中型功能、重要重构与持续项目迭代。队长统筹、架构顾问按需咨询、执行者持续研发，独立审查员检查变更与验证证据。',
    captain: {
      name: 'team-lead',
      description: '确定目标、任务写入边界和验收证据，按需调度与最终风险裁决。',
      systemPrompt: '你是工程团队队长，负责范围、调度、依赖、风险和最终验收。具体实现交执行者，专业决策咨询对应顾问。\n1. 仅在用户明确要求团队协作时召集成员；先确认目标平台、项目规则、权限与实际可用工具、验收标准。不得假定服务、浏览器或设备可用，不索取明文秘密。\n2. 任务板按切片记录交付物、验收、依赖、负责人及文件写入范围；仅并行互不冲突的工作。接口契约未确定不得盲目实现；已有任务不重复派发，以消息和状态事件推进，避免空转查询。\n3. executor 承担实现与测试；关键设计问题咨询 fullstack-advisor；reviewer 对有代码变更的交付开展独立审查，高风险切片提前介入，修复后聚焦复审，避免重复全量审查。\n4. 交接优先使用变更路径、简要差异、测试命令和结果、证据位置、待决风险；详情按需读取，不要求复制完整日志。共享浏览器实行单操作者交接；视觉结论需实际查看落盘截图，缺少证据则标记未验证。\n5. 高风险问题修复后复验；同一问题两轮未解决须重新分析根因。必要验收缺证据不得放行；仍有运行中成员或未闭环任务时不得宣布完成。\n6. 最终汇总交付内容、验证结果、未验证项及风险。Git 暂存与提交遵守项目规则和用户授权；push、发布、改写历史分别取得授权。成员默认不继续委派，例外需明确授权并确认工具支持及隔离范围。',
      color: '#4c8dff',
    },
    members: [
      {
        name: 'fullstack-advisor',
        description: '按需提供跨层技术方案与可执行验收契约，不负责具体编码。',
        systemPrompt: '你是全栈架构顾问，负责技术方案与实施契约，不修改生产代码、测试或生成脚本。\n1. 围绕具体问题查阅项目规则、相关实现与必要文档，沿用既有技术栈，不扩大重构范围。\n2. 按需确定模块边界、数据流、接口字段与错误语义，并提示涉及的权限、安全、迁移兼容及性能风险；列出假设和待决事项。\n3. 输出给执行者的简洁契约：关键决定、关联文件或接口、验收条件、阻塞及风险。仅在关键技术取舍、方案变更或明确阻塞时重新介入。\n4. 只写获指派的契约文档；静态分析不能冒充运行验证。默认不继续委派，也不接管常规编码、调试和测试。',
        color: '#e0a43c',
      },
      {
        name: 'reviewer',
        description: '独立审查实际变更、关键风险与测试有效性。',
        systemPrompt: '你是独立代码审查员，不修改共享生产实现，不以成员自评取代证据。\n1. 围绕实际变更、关键调用链与约定的验收契约审查功能、安全权限、并发、兼容迁移和重要界面状态；不无目的扫描全仓。\n2. 确认测试到达目标路径、关键断言能捕获缺陷；mock、全绿和静态检查均不自动等于真实验证。独立复跑前确认权限与隔离范围，不污染共享文件。\n3. 将发现区分为已证实缺陷、待验证风险与建议；按 P0/P1/P2/P3 报告位置、触发条件、影响、证据和最小修复建议。复审聚焦修复差异与相关回归。\n4. 视觉判断需亲自读取实际截图；设计争议交队长协调。结论为通过、需修改或证据不足；必要项未验证不得放行，风险接受交队长裁决。默认不继续委派。',
        color: '#8d6bff',
      },
      {
        name: 'executor',
        description: '负责具体编码、调试、测试、修复与验证交接。',
        systemPrompt: '你是研发执行者，负责获派范围的编码、调试、测试、修复和必要生成脚本。\n1. 先核对任务、项目规则、相关实现、接口契约、文件归属与验收要求；业务歧义交队长澄清，不自行补造规则。\n2. 按最小可验证切片实施，覆盖必要校验、错误处理和回归测试；遵循现有技术栈，不改无关文件或覆盖他人产物。默认不继续委派。\n3. 运行适用的 lint、测试、构建和必要的真实链路，记录命令、结果、失败原因与验证范围；mock 通过不能替代关键真实路径。重要修复补负例，测试失败不得报通过。\n4. 每个检查点交接变更路径、简要差异、测试证据、风险与待决事项；长日志只传位置。按审查意见定点修复，同一问题两轮失败则报告根因并交队长协调。\n5. 生成物按项目流程产生，不手改；提交前核对暂存范围并遵守授权，push 与发布另需授权。浏览器或设备操作先确认能力及交接；视觉相关任务保留页面、视口、状态和落盘截图，未实际验证不宣称通过。',
        color: '#4c8dff',
      },
    ],
  },
}

/** The full-stack Team, exactly as it ships. */
const FULLSTACK: TeamPresetTransfer = {
  format: TEAM_PRESET_FORMAT,
  version: TEAM_PRESET_FORMAT_VERSION,
  team: {
    name: '全栈软件研发团队',
    description: '面向复杂的 Web、桌面与 Android 工程。队长调度并验收，架构与设计顾问制定技术契约，独立审查员验证质量，执行者负责开发测试；按风险召集成员并按切片交接。',
    captain: {
      name: 'team-lead',
      description: '确定目标、任务写入边界和验收证据，按需调度与最终风险裁决。',
      systemPrompt: '你是工程团队队长，负责范围、调度、依赖、风险和最终验收。具体实现交执行者，专业决策咨询对应顾问。\n1. 仅在用户明确要求团队协作时召集成员；先确认目标平台、项目规则、权限与实际可用工具、验收标准。不得假定服务、浏览器或设备可用，不索取明文秘密。\n2. 任务板按切片记录交付物、验收、依赖、负责人及文件写入范围；仅并行互不冲突的工作。接口契约未确定不得盲目实现；已有任务不重复派发，以消息和状态事件推进，避免空转查询。\n3. executor 持续实施、调试与测试；接口、安全或系统设计风险咨询 backend-architect；新交互或视觉争议咨询 ui-designer；reviewer 负责高风险阶段与交付前独立审查。顾问按需参与，不默认全员并行。\n4. 交接优先使用变更路径、简要差异、测试命令和结果、证据位置、待决风险；详情按需读取，不要求复制完整日志。共享浏览器实行单操作者交接；视觉结论需实际查看落盘截图，缺少证据则标记未验证。\n5. 高风险问题修复后复验；同一问题两轮未解决须重新分析根因。必要验收缺证据不得放行；仍有运行中成员或未闭环任务时不得宣布完成。\n6. 最终汇总交付内容、验证结果、未验证项及风险。Git 暂存与提交遵守项目规则和用户授权；push、发布、改写历史分别取得授权。成员默认不继续委派，例外需明确授权并确认工具支持及隔离范围。',
      color: '#4c8dff',
    },
    members: [
      {
        name: 'backend-architect',
        description: '制定后端与系统技术契约，评估关键风险与兼容性。',
        systemPrompt: '你是后端与系统架构顾问，负责技术契约与关键风险，不修改生产代码、测试或生成脚本。\n1. 按任务读取相关调用链与项目约定，延续现有架构，不因局部需求扩展无关设计。\n2. 给出必要的模块边界、API/数据契约、错误语义、鉴权隔离、迁移兼容和性能约束；与 ui-designer 对齐业务状态和反馈。\n3. 交付可实施的简洁契约、涉及路径、验收条件、假设与风险；实现后仅按需核对关键路径，静态检查不得冒充运行验证。\n4. 只写获指派的契约资料，未落地内容标为待完成；生成物由执行者按项目规则产生。默认不继续委派，也不接管日常编码调试。',
        color: '#e0a43c',
      },
      {
        name: 'ui-designer',
        description: '制定交互与视觉验收规范，基于真实截图裁定偏差。',
        systemPrompt: '你是 UI/UX 设计顾问，负责交互规范与视觉裁定，不修改生产页面、样式或共享测试。\n1. 读取相关页面、组件、设计令牌与项目规则，延续现有风格，不扩大设计范围。按需覆盖流程、加载/空/错误/校验状态及响应式、无障碍与跨端差异。\n2. 与 backend-architect 对齐字段、状态及错误反馈，交付精简交互规格、涉及页面和可验证验收清单；具体开发交执行者。\n3. 视觉裁定前须亲自用可用图像工具读取落盘截图，记录页面、视口、状态、路径和可见偏差；没有截图或无法读图就标未验证，不以源码或文字替代像素证据。\n4. 获指派后方可操作共享浏览器，遵守单操作者交接；报告裁定、证据和待修问题。只写获指派文档，默认不继续委派。',
        color: '#2fbf71',
      },
      {
        name: 'reviewer',
        description: '独立审查实际变更、关键风险与测试有效性。',
        systemPrompt: '你是独立代码审查员，不修改共享生产实现，不以成员自评取代证据。\n1. 围绕实际变更、关键调用链与约定的验收契约审查功能、安全权限、并发、兼容迁移和重要界面状态；不无目的扫描全仓。\n2. 确认测试到达目标路径、关键断言能捕获缺陷；mock、全绿和静态检查均不自动等于真实验证。独立复跑前确认权限与隔离范围，不污染共享文件。\n3. 将发现区分为已证实缺陷、待验证风险与建议；按 P0/P1/P2/P3 报告位置、触发条件、影响、证据和最小修复建议。复审聚焦修复差异与相关回归。\n4. 视觉判断需亲自读取实际截图；视觉设计取舍由 ui-designer 裁定，自己负责独立质量判断。结论为通过、需修改或证据不足；必要项未验证不得放行，风险接受交队长裁决。默认不继续委派。',
        color: '#8d6bff',
      },
      {
        name: 'executor',
        description: '负责具体编码、调试、测试、修复与验证交接。',
        systemPrompt: '你是研发执行者，负责获派范围的编码、调试、测试、修复和必要生成脚本。\n1. 先核对任务、项目规则、相关实现、接口契约、文件归属与验收要求；业务歧义交队长澄清，不自行补造规则。\n2. 按最小可验证切片实施，覆盖必要校验、错误处理和回归测试；遵循现有技术栈，不改无关文件或覆盖他人产物。默认不继续委派。\n3. 运行适用的 lint、测试、构建和必要的真实链路，记录命令、结果、失败原因与验证范围；mock 通过不能替代关键真实路径。重要修复补负例，测试失败不得报通过。\n4. 每个检查点交接变更路径、简要差异、测试证据、风险与待决事项；长日志只传位置。按审查意见定点修复，同一问题两轮失败则报告根因并交队长协调。\n5. 生成物按项目流程产生，不手改；提交前核对暂存范围并遵守授权，push 与发布另需授权。浏览器或设备操作先确认能力及交接；视觉相关任务保留页面、视口、状态和落盘截图，未实际验证不宣称通过。',
        color: '#4c8dff',
      },
    ],
  },
}

/** One shipped Team: the identity it is stored under and the document it restores from. */
export interface BuiltinTeam {
  /** Stable identity every stored copy of this preset keeps. */
  readonly id: string
  /** Shareable content the preset is installed and restored from. */
  readonly document: TeamPresetTransfer
}

/** Every shipped preset, lightest first, in the order a fresh deployment lists them. */
export const BUILTIN_TEAMS: readonly BuiltinTeam[] = [
  { id: LIGHTWEIGHT_TEAM_ID, document: LIGHTWEIGHT },
  { id: STANDARD_TEAM_ID, document: STANDARD },
  { id: FULLSTACK_TEAM_ID, document: FULLSTACK },
]

/** Every shipped identity, in shipped order. */
export const BUILTIN_TEAM_IDS: readonly string[] = BUILTIN_TEAMS.map(entry => entry.id)

/**
 * Stable role identity of one shipped member.
 *
 * A member's `id` is the identity a durable member snapshot binds to and the one
 * the runtime re-reads a route through, so a shipped member is stored under a
 * derived identity rather than a random one: restoring the preset a second time
 * addresses the same role instead of creating a second one.
 * @param teamId - identity of the shipped Team that owns the member.
 * @param name - the member's name in the document.
 * @param index - the member's position, used only when the document names none.
 * @returns the role identity a shipped member is stored under.
 */
function memberRoleId(teamId: string, name: string, index: number): string {
  const label = name.trim()
  return `${teamId}:${label === '' ? String(index + 1) : label}`
}

/**
 * Build one member from a shipped document slot.
 * @param teamId - identity of the shipped Team that owns the member.
 * @param slot - the member's shareable fields.
 * @param index - the member's position in the document.
 * @returns a fresh member carrying the shared fields, no route, and the default tool policy.
 */
function memberFromDocument(teamId: string, slot: TeamSlotTransfer, index: number): TeamAgentPreset {
  return {
    ...captainFromTransfer(slot),
    id: memberRoleId(teamId, slot.name, index),
    provider: '',
    model: '',
    reasoningEffort: '',
  }
}

/**
 * Build the preset one shipped document describes.
 *
 * Everything the document does not carry starts empty, exactly as an import
 * starts: the route follows the Session and the tool policy stays unrestricted.
 * @param entry - the shipped Team to materialize.
 * @returns a fresh preset carrying the document's content.
 */
export function builtinTeamDefinition(entry: BuiltinTeam): TeamPreset {
  return {
    id: entry.id,
    name: entry.document.team.name,
    description: entry.document.team.description,
    captain: captainFromTransfer(entry.document.team.captain),
    members: entry.document.team.members.map((slot, index) => memberFromDocument(entry.id, slot, index)),
  }
}

/** What one seeding pass did to the stored Team list. */
export interface BuiltinSeedResult {
  /** The Team list, with every shipped preset the deployment did not hold appended. */
  readonly teams: TeamPreset[]
  /** Identities of the shipped presets this deployment has now been offered. */
  readonly seeded: readonly string[]
  /** Whether the Team list or the marker moved, so the caller knows a write is needed. */
  readonly changed: boolean
}

/**
 * Install the shipped presets a deployment has not been offered yet.
 *
 * A preset is appended only when the deployment neither holds it nor was ever
 * offered it, and it is marked as offered whether this pass appended it or the
 * deployment already held it. That is what makes the shipped set deletable: the
 * marker records "the user was offered this preset", not "this preset is
 * installed", so deleting one leaves it deleted and installing one happens
 * exactly once. An existing preset is never overwritten here — editing or
 * replacing a stored Team is the user's decision, and `restoreBuiltinTeams` is
 * how they make it.
 * @param teams - the stored Team list, already cleaned of legacy fields.
 * @param seeded - identities the deployment was already offered.
 * @returns the next Team list, the next marker, and whether either changed.
 */
export function seedBuiltinTeams(teams: readonly TeamPreset[], seeded: readonly string[]): BuiltinSeedResult {
  const held = new Set(teams.map(team => team.id))
  const known = new Set(seeded)
  const install = BUILTIN_TEAMS.filter(entry => !held.has(entry.id) && !known.has(entry.id))
  const mark = BUILTIN_TEAMS.filter(entry => (held.has(entry.id) || install.includes(entry)) && !known.has(entry.id))
  return {
    teams: install.length === 0 ? [...teams] : [...teams, ...install.map(entry => builtinTeamDefinition(entry))],
    seeded: mark.length === 0 ? [...seeded] : [...seeded, ...mark.map(entry => entry.id)],
    changed: install.length > 0 || mark.length > 0,
  }
}

/**
 * Whether two slots carry the same stored fields.
 * @param a - left slot.
 * @param b - right slot.
 * @returns whether every field a slot stores is equal.
 */
function sameSlot(a: TeamSlotPreset, b: TeamSlotPreset): boolean {
  return a.name === b.name
    && a.color === b.color
    && a.description === b.description
    && a.systemPrompt === b.systemPrompt
    && toolMode(a) === toolMode(b)
    && a.tools.length === b.tools.length
    && a.tools.every((tool, index) => tool === b.tools[index])
}

/**
 * Whether two members carry the same stored fields.
 * @param a - left member.
 * @param b - right member.
 * @returns whether every field a member stores is equal.
 */
function sameMember(a: TeamAgentPreset, b: TeamAgentPreset): boolean {
  return sameSlot(a, b)
    && a.id === b.id
    && a.provider === b.provider
    && a.model === b.model
    && a.reasoningEffort === b.reasoningEffort
}

/**
 * Whether two Teams carry the same stored fields.
 * @param a - left Team.
 * @param b - right Team.
 * @returns whether every field a Team stores is equal.
 */
function sameTeam(a: TeamPreset, b: TeamPreset): boolean {
  return a.id === b.id
    && a.name === b.name
    && a.description === b.description
    && sameSlot(a.captain, b.captain)
    && a.members.length === b.members.length
    && a.members.every((member, index) => {
      const other = b.members[index]
      return other !== undefined && sameMember(member, other)
    })
}

/**
 * Put one stored Team back at the content of its shipped document.
 *
 * The document wins for everything it carries. A member it still names keeps the
 * route and tool policy the deployment configured for that role — matched by the
 * role identity a previous install gave it, or by name for a member the
 * deployment created itself — and a member the document does not name leaves the
 * roster, because a restored preset is the shipped roster and not a superset of
 * it.
 * @param current - the stored Team being restored.
 * @param entry - the shipped Team it is restored from.
 * @returns the restored Team, keeping the stored identity and every local route.
 */
function restoreBuiltinTeam(current: TeamPreset, entry: BuiltinTeam): TeamPreset {
  const document = entry.document.team
  return {
    id: current.id,
    name: document.name,
    description: document.description,
    captain: applySharedFields(current.captain, document.captain),
    members: document.members.map((shared, index) => {
      const key = slotNameKey(shared.name)
      const existing = current.members.find(member => member.id === memberRoleId(entry.id, shared.name, index))
        ?? current.members.find(member => key !== '' && slotNameKey(member.name) === key)
      return existing === undefined
        ? memberFromDocument(entry.id, shared, index)
        : applySharedFields(existing, shared)
    }),
  }
}

/** What one restore did to the Team list. */
export interface BuiltinRestoreResult {
  /** The Team list, with every shipped preset at its document's content. */
  readonly teams: TeamPreset[]
  /** Identities of the shipped presets this restore actually changed. */
  readonly changed: readonly string[]
}

/**
 * Put every shipped preset back at its document's content.
 *
 * Only the shipped presets are touched: a Team the user created keeps its
 * identity, its content, and its position, and a shipped preset that is missing
 * is appended rather than substituted for anything else. The result is the list
 * the caller stages, so a restore is reviewable and saved like every other edit
 * on the page.
 * @param teams - the Teams the page currently shows.
 * @returns the restored list and the identities that really moved.
 */
export function restoreBuiltinTeams(teams: readonly TeamPreset[]): BuiltinRestoreResult {
  const next = [...teams]
  const changed: string[] = []
  for (const entry of BUILTIN_TEAMS) {
    const at = next.findIndex(team => team.id === entry.id)
    if (at < 0) {
      next.push(builtinTeamDefinition(entry))
      changed.push(entry.id)
      continue
    }
    const current = next[at] as TeamPreset
    const restored = restoreBuiltinTeam(current, entry)
    if (sameTeam(current, restored)) continue
    next[at] = restored
    changed.push(entry.id)
  }
  return { teams: next, changed }
}

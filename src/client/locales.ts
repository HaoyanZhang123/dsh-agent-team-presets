/** Locale bundles for the Agent Team presets page and composer control. */

import type { TeamPresetImportFailure } from '../preset-transfer.ts'
import type { TeamExecutionState } from '../types.ts'
import type { TeamPresetsFormIssue, TeamSelectionFailure } from './team-presets-controller.ts'

/** Locale keys this plugin renders. */
export type TeamPresetsLocaleKey =
  | 'nav' | 'title' | 'description'
  | 'newTeam' | 'duplicate' | 'remove' | 'removeMember'
  | 'teamList' | 'emptyTeams' | 'emptySelection' | 'memberCount'
  | 'teamName' | 'teamNamePlaceholder' | 'teamDescription'
  | 'captain' | 'captainHint' | 'members' | 'addMember' | 'membersHint'
  | 'agentName' | 'agentNamePlaceholder' | 'agentColor' | 'agentDescription'
  | 'route' | 'routeInherit' | 'provider' | 'model' | 'effort' | 'effortDefault'
  | 'captainModelHint' | 'captainFollowsSession' | 'modelsPartial' | 'modelsFailed'
  | 'tools' | 'toolsHint' | 'toolMode' | 'toolsDefault' | 'toolsCustom'
  | 'toolsAllHint' | 'toolsEmpty' | 'toolsScoped' | 'toolsSelectAll' | 'toolsClear' | 'toolsRemove'
  | 'toolsUnavailable' | 'toolsLoading' | 'toolsFailed' | 'toolsNoCatalog' | 'toolsCaptainOnly'
  | 'toolsGroupPresets' | 'toolsGroupMcp' | 'toolsGroupOther' | 'toolsInvert'
  | 'composerMissing' | 'composerMissingHint'
  | 'systemPrompt' | 'systemPromptPlaceholder' | 'systemPromptHint'
  | 'promptWarnBraces'
  | 'save' | 'saving' | 'saveFailed' | 'discard' | 'unsaved' | 'readOnly' | 'unavailable'
  | 'sectionLoading'
  | 'formIssueSettingsUnavailable' | 'formIssueNamespaceMissing' | 'formIssueSchemaRejected'
  | 'selectionUnavailable' | 'selectionRefused' | 'selectionFailed'
  | 'teamNameRequired'
  | 'externalUpdateOne' | 'externalUpdateMany'
  | 'externalUpdateOverriddenOne' | 'externalUpdateOverriddenMany'
  | 'executionBusy' | 'executionBusyShared' | 'executionIdle' | 'executionUnknown'
  | 'executionPtcOverridden'
  | 'externalAddedOne' | 'externalAddedMany'
  | 'externalRemovedOne' | 'externalRemovedMany'
  | 'externalRemovedEditedOne' | 'externalRemovedEditedMany'
  | 'back' | 'backToList' | 'editCaptain' | 'editMember' | 'teamSections' | 'agentSections'
  | 'modelSection' | 'promptSection' | 'toolsSection' | 'identitySection'
  | 'emptyMembers' | 'inheritSession' | 'deleteAgent' | 'roleCaptain' | 'roleMember'
  | 'composerTitle' | 'composerNone' | 'composerHint'
  | 'importPreset' | 'exportPreset' | 'importNote' | 'importConfirm' | 'cancel' | 'close'
  | 'importConflictTitle' | 'importTeamConflict' | 'importTeamReplace' | 'importTeamRename' | 'importNewTeamName'
  | 'importCaptainConflict' | 'importCaptainReplace' | 'importCaptainRename'
  | 'importMemberConflict' | 'importMemberReplace' | 'importMemberRename'
  | 'importInvalidJson' | 'importInvalidFormat' | 'importUnsupportedVersion' | 'importUnsupportedFields'
  | 'importDuplicateMembers' | 'importTooManyMembers' | 'importTooLarge'

/** Locale namespace owned by this plugin. */
export const NS = 'settings.agentTeamPresets'

/** English copy. */
export const en: Record<TeamPresetsLocaleKey, string> = {
  nav: 'Agent team presets',
  title: 'Agent team presets',
  description: 'Reusable Teams of named agents. Select a Team in the composer and its captain leads the session on the model you already picked, summoning members with their own prompt, model, reasoning effort, and tools.',
  newTeam: 'New team',
  duplicate: 'Duplicate',
  remove: 'Delete team',
  removeMember: 'Remove member',
  teamList: 'Teams',
  emptyTeams: 'No team configured yet. Create one, then select it in the composer.',
  emptySelection: 'Select a team to edit it.',
  memberCount: 'members',
  teamName: 'Team name',
  teamNamePlaceholder: 'Feature build team',
  teamDescription: 'What this team is for',
  captain: 'Captain',
  captainHint: 'The captain replaces this session: its system prompt becomes the session prompt and its tool scope scopes the session tools. It leads on the model the session already selected, so a Team never changes your model.',
  members: 'Members',
  addMember: 'Add member',
  membersHint: 'Members are templates. The captain summons one by name with spawn_team_member, and the member runs with the prompt, model, reasoning effort, and tools below.',
  agentName: 'Name',
  agentNamePlaceholder: 'reviewer',
  agentColor: 'Color',
  agentDescription: 'Description',
  route: 'Model',
  routeInherit: 'Follow the session',
  provider: 'Provider',
  model: 'Model',
  effort: 'Reasoning effort',
  effortDefault: 'Model default',
  captainModelHint: 'The captain leads on the model this session already selected. Pick that model in the composer; a Team never changes it.',
  captainFollowsSession: 'Session model',
  modelsPartial: 'Some providers did not answer, so their models are missing from this list. Reopen this page to read them again.',
  modelsFailed: 'The provider catalogue could not be read at all, so no model can be offered here. The route already stored for this agent is kept.',
  tools: 'Allowed tools',
  toolMode: 'Tool permissions',
  toolsDefault: 'Default: all tools',
  toolsCustom: 'Custom allowed tools',
  toolsHint: 'Only checked configurable tools are allowed.',
  toolsAllHint: 'Adds no tool restriction. Your custom selections are kept when you switch modes.',
  toolsEmpty: 'No tools selected: all configurable tools are disabled.',
  toolsScoped: 'Custom mode also controls agent-local Team tools: select the coordination tools this role needs. General code and ordinary delegation are disabled; preset-managed creation stays available only when selected.',
  toolsNoCatalog: 'This deployment exposes no configurable tools.',
  toolsCaptainOnly: 'Captain only: a member selecting it is still refused by the Team service.',
  toolsGroupPresets: 'This plugin (Agent Team presets)',
  toolsGroupMcp: 'MCP server',
  toolsGroupOther: 'Other (native Harness and third-party plugin tools)',
  toolsInvert: 'Invert',
  toolsSelectAll: 'Select all',
  toolsClear: 'Clear',
  toolsRemove: 'Remove',
  toolsUnavailable: 'Unavailable saved tools — remove these before applying custom permissions.',
  toolsLoading: 'Loading tools…',
  toolsFailed: 'The tool list could not be read; only the tools already chosen are shown.',
  systemPrompt: 'System prompt',
  systemPromptPlaceholder: 'You are…',
  systemPromptHint: 'Registered as a prompt section template: complete {{variable}} groups interpolate against registered prompt variables, and an unknown variable fails the request.',
  promptWarnBraces: 'This text contains a {{…}} group. DSH interpolates it against registered prompt variables and fails the request on an unknown name.',
  back: 'Back',
  backToList: 'All teams',
  editCaptain: 'Edit captain',
  editMember: 'Edit member',
  teamSections: 'What this team contains',
  agentSections: 'How this agent runs',
  modelSection: 'Model',
  promptSection: 'System prompt',
  toolsSection: 'Tools',
  identitySection: 'Identity',
  emptyMembers: 'No member yet. Add one, then tell the captain to summon it by name.',
  inheritSession: 'Follow the session',
  deleteAgent: 'Delete this agent',
  roleCaptain: 'Captain',
  roleMember: 'Member',
  save: 'Save',
  saving: 'Saving…',
  saveFailed: 'The host did not accept these values; your edits are kept.',
  discard: 'Discard',
  unsaved: 'Unsaved changes',
  teamNameRequired: 'A Team needs a name before it can be saved: {teams}.',
  externalUpdateOne: 'Team {team} was updated outside this page; the saved version is shown now.',
  externalUpdateMany: '{count} teams were updated outside this page ({teams}); the saved versions are shown now.',
  externalUpdateOverriddenOne: 'Your unsaved changes to {team} were replaced.',
  externalUpdateOverriddenMany: 'Your unsaved changes to {count} of them were replaced ({teams}).',
  externalAddedOne: 'Team {team} was added outside this page and joined your draft.',
  externalAddedMany: '{count} teams were added outside this page and joined your draft ({teams}).',
  externalRemovedOne: 'Team {team} was deleted outside this page and removed from your draft.',
  externalRemovedMany: '{count} teams were deleted outside this page and removed from your draft ({teams}).',
  externalRemovedEditedOne: 'Your unsaved changes to {team} were dropped with it.',
  externalRemovedEditedMany: 'Your unsaved changes to {count} of them were dropped with them.',
  executionBusy: 'This team is running a task right now. A change to its purpose, roles, prompts, roster, or tool policy takes effect before its next team task; a member\'s model route applies to the next member it summons, including in this task.',
  executionBusyShared: 'The preset is shared by every session that selected it: an idle session adopts a definition change right away, and a session in a running team task adopts it before its next one.',
  executionIdle: 'No session is running this team\'s task, so a save takes effect right away.',
  executionUnknown: 'Whether this team is running a task cannot be confirmed right now. A definition change does not affect a task already in progress; a member\'s model route applies to the next member summoned.',
  executionPtcOverridden: 'This session\'s Agent preset asks for PTC batch calling. This team\'s strict custom tool policy is applied with native tool calling, so its allowed tools are called directly and the general-purpose code transport stays denied.',
  readOnly: 'This deployment stores settings read-only.',
  unavailable: 'The Agent team presets plugin is not loaded, so it cannot be configured right now.',
  sectionLoading: 'Reading the Team configuration from the Host…',
  formIssueSettingsUnavailable: 'This page is not backed by a Host settings document, so Teams cannot be stored from here.',
  formIssueNamespaceMissing: 'This deployment serves no "agent-team-presets" settings section, so no Team can be stored or selected.',
  formIssueSchemaRejected: 'The Host serves the Team section, but this client refused the value it holds: the stored Teams are shown read-only and a save would be refused.',
  selectionUnavailable: 'No Team selection could be written: the Team settings section is not available in this page.',
  selectionRefused: 'The Host refused the Team selection write.',
  selectionFailed: 'The Team selection write did not complete.',
  composerTitle: 'Team',
  composerNone: 'No team',
  composerHint: 'Apply one Team preset to this session.',
  composerMissing: 'Missing Team: {team}',
  composerMissingHint: 'This is not No team. An unapplicable selection denies tools; a running task keeps its old policy until idle. Choose a valid Team or No team.',
  importPreset: 'Import preset',
  exportPreset: 'Export',
  importNote: 'A shared document carries names, descriptions, system prompts, and colors. Model routes and tool permissions stay local.',
  importConfirm: 'Import',
  cancel: 'Cancel',
  close: 'Close',
  importConflictTitle: 'Resolve import conflicts',
  importTeamConflict: 'A team already uses this name',
  importTeamReplace: 'Replace that team',
  importTeamRename: 'Add as a new team',
  importNewTeamName: 'New team name',
  importCaptainConflict: 'Its captain already uses this name',
  importCaptainReplace: 'Replace that captain',
  importCaptainRename: 'Rename the imported captain',
  importMemberConflict: 'These members already exist in that team',
  importMemberReplace: 'Replace that member',
  importMemberRename: 'Add it renamed',
  importInvalidJson: 'That file is not valid JSON.',
  importInvalidFormat: 'That file is not a Team preset document.',
  importUnsupportedVersion: 'That document was written by a newer version of this plugin.',
  importUnsupportedFields: 'That document carries fields a shared preset cannot hold, such as a model route or a tool permission.',
  importDuplicateMembers: 'That document names the same member twice.',
  importTooManyMembers: 'That document declares too many members.',
  importTooLarge: 'That file is too large to be a Team preset.',
}

/** Simplified Chinese copy. */
export const zh: Record<TeamPresetsLocaleKey, string> = {
  nav: '智能体团队预设',
  title: '智能体团队预设',
  description: '可复用的命名智能体团队。在对话框选中一个团队后，队长以你当前已选的模型接管本会话，并按名字召唤队员；每个队员使用自己配置的提示词、模型、思考强度和工具。',
  newTeam: '新建团队',
  duplicate: '复制',
  remove: '删除团队',
  removeMember: '删除队员',
  teamList: '团队列表',
  emptyTeams: '还没有配置团队。先新建一个，再到对话框里选择使用。',
  emptySelection: '选择一个团队进行编辑。',
  memberCount: '名队员',
  teamName: '团队名称',
  teamNamePlaceholder: '功能开发团队',
  teamDescription: '团队用途说明',
  captain: '队长',
  captainHint: '队长会接管本会话：队长的系统提示词成为会话提示词、工具权限作用于会话工具。队长使用会话当前已选的模型，团队不会改动你的模型。',
  members: '队员',
  addMember: '添加队员',
  membersHint: '队员是角色模板。队长用 spawn_team_member 按名字召唤，队员以此处配置的提示词、模型、思考强度和工具运行。',
  agentName: '名称',
  agentNamePlaceholder: 'reviewer',
  agentColor: '颜色标记',
  agentDescription: '描述',
  route: '模型',
  routeInherit: '跟随会话',
  provider: '提供商',
  model: '模型',
  effort: '思考强度',
  effortDefault: '模型默认',
  captainModelHint: '队长使用本会话当前已选的模型。请在对话框里选择该模型；团队不会改动它。',
  captainFollowsSession: '会话模型',
  modelsPartial: '部分提供商没有返回模型列表，下面可能缺少它们的模型。重新打开本页可再次读取。',
  modelsFailed: '完全无法读取提供商模型目录，因此这里无法提供模型选择。该智能体已保存的路由会保留。',
  tools: '可用工具',
  toolMode: '工具权限',
  toolsDefault: '默认所有工具',
  toolsCustom: '自定义可用工具',
  toolsHint: '仅允许使用勾选的可配置工具。',
  toolsAllHint: '不额外限制工具。切换模式不会清除已保存的自定义勾选。',
  toolsEmpty: '未勾选任何工具：禁用全部可配置工具。',
  toolsScoped: '自定义模式同样限制作用域内的团队工具；请勾选该角色需要的协作工具。禁用通用代码和普通委派，预设成员创建也须勾选。',
  toolsNoCatalog: '当前部署没有可配置工具。',
  toolsCaptainOnly: '仅队长可用：队员勾选后仍会被团队服务拒绝。',
  toolsGroupPresets: '本插件（Agent Team presets）',
  toolsGroupMcp: 'MCP 服务器',
  toolsGroupOther: '其他（原生 Harness 与第三方插件工具）',
  toolsInvert: '反选',
  toolsSelectAll: '全选',
  toolsClear: '清空',
  toolsRemove: '移除',
  toolsUnavailable: '以下已保存的工具当前不可用，请先移除再应用自定义权限。',
  toolsLoading: '正在读取工具列表…',
  toolsFailed: '工具列表读取失败，下面只显示已经选中的工具。',
  systemPrompt: '系统提示词',
  systemPromptPlaceholder: '你负责……',
  systemPromptHint: '作为提示词段落模板注册：完整的 {{变量}} 会按已注册的提示词变量插值，未知变量会让请求失败。',
  promptWarnBraces: '这段文本包含 {{…}}。DSH 会按已注册的提示词变量插值，名字未知会让请求失败。',
  back: '返回',
  backToList: '全部团队',
  editCaptain: '编辑队长',
  editMember: '编辑队员',
  teamSections: '这个团队包含什么',
  agentSections: '这个智能体怎么运行',
  modelSection: '模型',
  promptSection: '系统提示词',
  toolsSection: '工具',
  identitySection: '基本信息',
  emptyMembers: '还没有队员。先添加一个，然后让队长按名字召唤它。',
  inheritSession: '跟随会话',
  deleteAgent: '删除该队员',
  roleCaptain: '队长',
  roleMember: '队员',
  save: '保存',
  saving: '保存中…',
  saveFailed: '宿主没有接受这些值，你的修改已保留。',
  discard: '放弃修改',
  unsaved: '有未保存的修改',
  teamNameRequired: '团队名称不能为空，无法保存：{teams}。',
  externalUpdateOne: '团队 {team} 已被外部更新，页面已显示最新保存的版本。',
  externalUpdateMany: '{count} 个团队已被外部更新（{teams}），页面已显示最新保存的版本。',
  externalUpdateOverriddenOne: '你在 {team} 的未保存修改已被覆盖。',
  externalUpdateOverriddenMany: '其中 {count} 个团队的未保存修改已被覆盖（{teams}）。',
  externalAddedOne: '外部新增了团队 {team}，已加入你的草稿。',
  externalAddedMany: '外部新增了 {count} 个团队（{teams}），已加入你的草稿。',
  externalRemovedOne: '团队 {team} 已被外部删除，已从你的草稿移除。',
  externalRemovedMany: '{count} 个团队已被外部删除（{teams}），已从你的草稿移除。',
  externalRemovedEditedOne: '你在 {team} 的未保存修改随之丢失。',
  externalRemovedEditedMany: '其中 {count} 个团队的未保存修改随之丢失。',
  executionBusy: '当前团队正在执行任务。对团队用途、角色、提示词、成员名单或工具权限的修改，将在下一次团队任务开始前生效；队员的模型路由则在下次召唤该队员时生效，进行中的任务同样适用。',
  executionBusyShared: '此预设由多个会话共享：空闲会话立即采用定义修改，执行中的会话在下一次任务前采用。',
  executionIdle: '当前没有会话在执行该团队任务，保存后立即生效。',
  executionUnknown: '无法确认该团队是否正在执行任务。定义修改不会改变进行中的任务；队员的模型路由在下次召唤时生效。',
  executionPtcOverridden: '本会话的 Agent 预设要求 PTC 批量调用。该团队的严格自定义工具权限改用原生工具调用，因此白名单内的工具直接调用，通用代码传输仍被拒绝。',
  readOnly: '本部署的设置为只读。',
  unavailable: '智能体团队插件当前未加载，暂时无法配置。',
  sectionLoading: '正在从宿主读取团队配置…',
  formIssueSettingsUnavailable: '当前页面没有连接宿主设置文档，因此无法在这里保存团队。',
  formIssueNamespaceMissing: '本部署没有提供「agent-team-presets」设置分区，团队无法保存或选择。',
  formIssueSchemaRejected: '宿主提供了团队分区，但客户端拒绝接受其中的存储值：下面只读显示已保存的团队，保存会被拒绝。',
  selectionUnavailable: '无法写入团队选择：当前页面没有可用的团队设置分区。',
  selectionRefused: '宿主拒绝了团队选择写入。',
  selectionFailed: '团队选择写入未完成。',
  composerTitle: '团队',
  composerNone: '不使用团队',
  composerHint: '为本会话启用一个团队预设。',
  composerMissing: '团队已失效：{team}',
  composerMissingHint: '这不是“不使用团队”。无法应用时权限保持拒绝；进行中的任务保留旧策略直到空闲。请改选有效团队或“不使用团队”。',
  importPreset: '导入预设',
  exportPreset: '导出',
  importNote: '共享文档只携带名称、描述、系统提示词和颜色；模型路由与工具权限保留在本地。',
  importConfirm: '导入',
  cancel: '取消',
  close: '关闭',
  importConflictTitle: '处理导入冲突',
  importTeamConflict: '已有团队使用了这个名称',
  importTeamReplace: '替换该团队',
  importTeamRename: '重命名后新增',
  importNewTeamName: '新团队名称',
  importCaptainConflict: '该团队的队长已使用这个名称',
  importCaptainReplace: '替换该队长',
  importCaptainRename: '重命名导入的队长',
  importMemberConflict: '该团队已存在这些队员',
  importMemberReplace: '替换该队员',
  importMemberRename: '重命名后新增',
  importInvalidJson: '该文件不是合法的 JSON。',
  importInvalidFormat: '该文件不是团队预设文档。',
  importUnsupportedVersion: '该文档由更新版本的插件生成。',
  importUnsupportedFields: '该文档包含共享预设无法携带的字段，例如模型路由或工具权限。',
  importDuplicateMembers: '该文档中有两个队员使用了相同名称。',
  importTooManyMembers: '该文档声明的队员数量过多。',
  importTooLarge: '该文件过大，不像是团队预设。',
}

/**
 * Locale key for one Host disclosure about how the applied Team runs.
 *
 * A Host disclosure is a locale key, so the page renders it in the reader's own
 * language; an unrecognised one is shown verbatim rather than swallowed, because
 * a disclosure the page cannot translate is still a disclosure it must not hide.
 */
export const DISCLOSURE_NOTICE_KEYS: Record<string, TeamPresetsLocaleKey> = {
  'presentation.ptcOverridden': 'executionPtcOverridden',
}

/** Locale key of the execution hint one Team state shows. */
export const EXECUTION_NOTICE_KEYS: Record<TeamExecutionState, TeamPresetsLocaleKey> = {
  busy: 'executionBusy',
  idle: 'executionIdle',
  unknown: 'executionUnknown',
}

/** Locale key for one refused import. */
export const IMPORT_FAILURE_KEYS: Record<TeamPresetImportFailure, TeamPresetsLocaleKey> = {
  'invalid-json': 'importInvalidJson',
  'invalid-format': 'importInvalidFormat',
  'unsupported-version': 'importUnsupportedVersion',
  'unsupported-fields': 'importUnsupportedFields',
  'duplicate-members': 'importDuplicateMembers',
  'too-many-members': 'importTooManyMembers',
  'too-large': 'importTooLarge',
}

/**
 * Locale key naming why the stored Team section cannot be edited.
 *
 * The three conditions have three different owners: a page with no Host
 * document is the deployment's, a namespace no row serves is the deployment's,
 * and a section this client refused to decode is this plugin's to report. The
 * page names which one it is instead of showing one "unavailable" for all.
 */
export const FORM_ISSUE_KEYS: Record<TeamPresetsFormIssue, TeamPresetsLocaleKey> = {
  'settings-unavailable': 'formIssueSettingsUnavailable',
  'namespace-missing': 'formIssueNamespaceMissing',
  'schema-rejected': 'formIssueSchemaRejected',
}

/**
 * Locale key for one failed Team selection write.
 *
 * The Host's own refusal text is appended verbatim when there is one: it is the
 * only part of the notice that names what to change, and translating it would
 * replace an actionable message with a summary.
 */
export const SELECTION_FAILURE_KEYS: Record<TeamSelectionFailure['kind'], TeamPresetsLocaleKey> = {
  unavailable: 'selectionUnavailable',
  refused: 'selectionRefused',
  failed: 'selectionFailed',
}

/**
 * Read one selection failure as the notice both surfaces render.
 *
 * The Host's refusal text is the only part of the notice that names what to
 * change, so it is appended verbatim rather than paraphrased: a translated
 * summary of "Config field \"selections\" is not volatile" would hide exactly
 * the sentence the reader needs. A `t` seat of any locale namespace is accepted
 * structurally, so both the page and the composer control can pass their own.
 * @param failure - the selection failure this client recorded.
 * @param t - the bound translate seat of this plugin's namespace.
 * @returns the notice text, with the Host's own detail when there is one.
 */
export function selectionFailureText(
  failure: TeamSelectionFailure,
  t: (key: TeamPresetsLocaleKey, params?: Record<string, string>) => string,
): string {
  const text = t(SELECTION_FAILURE_KEYS[failure.kind])
  return failure.detail === undefined || failure.detail === '' ? text : `${text} (${failure.detail})`
}

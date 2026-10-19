/**
 * The Team Skills settings panel: the library on the left, one skill on the
 * right, and the assignment dialog that makes it take effect.
 *
 * Everything the panel reports about safety comes from the Host answer — a
 * blocked delete lists the roles, the running members, or the dependency the
 * Host named — so this file never re-derives a rule and cannot drift from the
 * Agent-facing path. The panel exists because the Host alone is not testable by
 * a user: importing a folder, editing `SKILL.md`, and binding a role have to be
 * clickable before any of the isolation work is observable.
 * @module dsh-agent-team-presets/client/TeamSkillsView
 */

import { useEffect, useState } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { TeamSkillsController, TeamSkillsState } from './team-skills-controller.ts'
import type { TeamSkillAssetView } from '../types.ts'

/** Props of {@link TeamSkillsView}. */
export interface TeamSkillsViewProps {
  /** Page state and actions. */
  readonly controller: TeamSkillsController
  /** Translate one locale key. */
  readonly t: (key: 'skillsEmpty' | 'skillsHint' | 'skillsImport' | 'skillsNew' | 'skillsSave' | 'skillsDelete' | 'skillsAssign' | 'skillsUnassign' | 'skillsOfficial' | 'skillsFiles' | 'skillsBindings' | 'skillsNamePlaceholder' | 'skillsDescriptionPlaceholder' | 'skillsRoot' | 'skillsRefresh' | 'skillsOverride' | 'skillsReset' | 'skillsBody') => string
}

/** One small label above a control. */
function Label({ children }: { readonly children: string }): React.ReactElement {
  return <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>{children}</div>
}

/**
 * Badge text for one asset's origin.
 * @param asset - the row.
 * @returns short provenance text.
 */
function originText(asset: TeamSkillAssetView): string {
  if (asset.origin === 'builtin') return 'official'
  if (asset.origin === 'override') return 'override'
  return 'custom'
}

/** The Team Skills panel. */
export function TeamSkillsView(props: TeamSkillsViewProps): React.ReactElement {
  const { controller, t } = props
  const [state, setState] = useState<TeamSkillsState>(controller.getSnapshot())
  const [body, setBody] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [teamId, setTeamId] = useState('')
  const [roleId, setRoleId] = useState('')

  useEffect(() => {
    const unsubscribe = controller.subscribe(() => { setState(controller.getSnapshot()) })
    void controller.refresh()
    return unsubscribe
  }, [controller])

  useEffect(() => {
    setBody(state.detail?.body ?? '')
  }, [state.detail])

  const library = state.library
  const detail = state.detail
  const selectedTeam = library?.teams.find(team => team.id === teamId) ?? library?.teams[0]

  /**
   * Pick the folder the user chose and hand it over with relative paths.
   * @param list - the picker's files.
   */
  const importFolder = async (list: FileList | null): Promise<void> => {
    if (list === null || list.length === 0) return
    const files: { path: string; content: Uint8Array }[] = []
    for (const file of Array.from(list)) {
      const path = (file as File & { webkitRelativePath?: string }).webkitRelativePath === undefined
        || (file as File & { webkitRelativePath?: string }).webkitRelativePath === ''
        ? file.name
        : (file as File & { webkitRelativePath: string }).webkitRelativePath
      const relative = path.includes('/') ? path.slice(path.indexOf('/') + 1) : path
      files.push({ path: relative, content: new Uint8Array(await file.arrayBuffer()) })
    }
    await controller.importFolder(files)
  }

  if (state.status === 'unavailable') {
    return (
      <div style={{ padding: 16, opacity: 0.8 }}>
        Team Skills are not available in this deployment{state.issue === undefined ? '' : `: ${state.issue}`}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: 12 }}>
      <div style={{ flex: '0 0 300px', minWidth: 0 }}>
        <div style={{ marginBottom: 10 }}>
          <Label>{t('skillsRoot')}</Label>
          <code style={{ display: 'block', fontSize: 11, opacity: 0.7, wordBreak: 'break-all' }}>{library?.root ?? ''}</code>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <Button onClick={() => { void controller.refresh() }}>{t('skillsRefresh')}</Button>
          <label style={{ display: 'inline-flex' }}>
            <input
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={(event) => { void importFolder(event.target.files) }}
              {...{ webkitdirectory: '' }}
            />
            <Button onClick={(event) => {
              const input = (event.currentTarget as HTMLElement).parentElement?.querySelector('input')
              input?.click()
            }}>{t('skillsImport')}</Button>
          </label>
        </div>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {(library?.assets ?? []).map(asset => (
            <li key={asset.id}>
              <button
                type="button"
                onClick={() => { void controller.select(asset.id) }}
                style={{
                  width: '100%', textAlign: 'left', padding: 8, marginBottom: 4, cursor: 'pointer',
                  border: asset.id === state.selectedId ? '1px solid currentColor' : '1px solid transparent',
                  borderRadius: 6, background: 'transparent', color: 'inherit',
                }}
              >
                <div style={{ fontWeight: 600 }}>{asset.skillId}</div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>
                  {originText(asset)} · {String(asset.fileCount)} files
                  {asset.bindings.length === 0 ? '' : ` · ${String(asset.bindings.length)} bound`}
                  {asset.updateAvailable === true ? ' · update available' : ''}
                </div>
              </button>
            </li>
          ))}
        </ul>
        {library !== undefined && library.assets.length === 0 ? <div style={{ opacity: 0.7, padding: 8 }}>{t('skillsEmpty')}</div> : null}
        <div style={{ marginTop: 12 }}>
          <Label>{t('skillsNew')}</Label>
          <input value={name} onChange={(event) => { setName(event.target.value) }} placeholder={t('skillsNamePlaceholder')} style={{ width: '100%', marginBottom: 4 }} />
          <input value={description} onChange={(event) => { setDescription(event.target.value) }} placeholder={t('skillsDescriptionPlaceholder')} style={{ width: '100%', marginBottom: 4 }} />
          <Button onClick={() => {
            void controller.create(name, description).then(() => { setName(''); setDescription('') })
          }}>{t('skillsNew')}</Button>
        </div>
        {(library?.official ?? []).length > 0 ? (
          <div style={{ marginTop: 12 }}>
            <Label>{t('skillsOfficial')}</Label>
            {(library?.official ?? []).map(skillId => (
              <div key={skillId} style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <code style={{ fontSize: 11, wordBreak: 'break-all' }}>{skillId}</code>
                <Button onClick={() => { void controller.createOverride(skillId) }}>{t('skillsOverride')}</Button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div style={{ flex: '1 1 0', minWidth: 0 }}>
        {detail === undefined ? <div style={{ opacity: 0.6, paddingTop: 24 }}>{t('skillsHint')}</div> : (
          <>
            <h3 style={{ margin: '0 0 4px' }}>{detail.asset.skillId}</h3>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
              {originText(detail.asset)} · v{detail.asset.version} · {detail.asset.description}
              {detail.asset.updateAvailable === true ? ' · the official copy moved on' : ''}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <Button onClick={() => { void controller.saveFile('SKILL.md', body) }}>{t('skillsSave')}</Button>
              {detail.asset.origin === 'override' ? <Button onClick={() => { void controller.resetOverride(detail.asset.id) }}>{t('skillsReset')}</Button> : null}
              <Button onClick={() => { void controller.remove(detail.asset.id) }}>{t('skillsDelete')}</Button>
            </div>

            <Label>{t('skillsBody')}</Label>
            <textarea
              value={body}
              onChange={(event) => { setBody(event.target.value) }}
              readOnly={!detail.asset.editable}
              spellCheck={false}
              style={{ width: '100%', minHeight: 220, fontFamily: 'monospace', fontSize: 12 }}
            />

            <Label>{t('skillsFiles')}</Label>
            <ul style={{ margin: '0 0 12px', paddingLeft: 18, fontSize: 12 }}>
              {detail.files.map(file => <li key={file.path}>{file.path} · {String(file.size)} B</li>)}
            </ul>

            <Label>{t('skillsBindings')}</Label>
            <ul style={{ margin: '0 0 8px', paddingLeft: 18, fontSize: 12 }}>
              {detail.asset.bindings.map(row => (
                <li key={`${row.teamId}:${row.roleId}`}>
                  {row.teamName} → {row.roleName}
                  <button
                    type="button"
                    onClick={() => { void controller.unassign(row.teamId, row.roleId) }}
                    style={{ marginLeft: 8, background: 'none', border: 'none', color: 'inherit', textDecoration: 'underline', cursor: 'pointer' }}
                  >{t('skillsUnassign')}</button>
                </li>
              ))}
            </ul>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <select value={teamId === '' ? (selectedTeam?.id ?? '') : teamId} onChange={(event) => { setTeamId(event.target.value); setRoleId('') }}>
                {(library?.teams ?? []).map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
              </select>
              <select value={roleId} onChange={(event) => { setRoleId(event.target.value) }}>
                <option value="">—</option>
                {(selectedTeam?.roles ?? []).map(role => <option key={role.id} value={role.id}>{role.name}{role.captain ? ' (captain)' : ''}</option>)}
              </select>
              <Button onClick={() => { if (roleId !== '') void controller.assign(selectedTeam?.id ?? '', roleId) }}>{t('skillsAssign')}</Button>
            </div>
          </>
        )}
        {state.message === undefined ? null : (
          <div style={{ marginTop: 8, fontSize: 12, color: state.failed ? 'crimson' : 'inherit' }}>{state.message}</div>
        )}
      </div>
    </div>
  )
}

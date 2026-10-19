/**
 * The Team Skill settings pages: a library list and one skill's detail, exactly
 * as the v0.1.6 native prototype defines them (new views only — the 0.1.5 Team
 * pages around them are unchanged).
 *
 * The library page owns discovery: search, the built-in/custom segment, and the
 * three actions the prototype puts in the title row. The detail page owns one
 * skill: its file tree and editor, its member references, and the deletion the
 * Host refuses while a member still holds it. Assignment itself belongs to the
 * member page, so this file never invents a second place to bind a skill.
 * @module dsh-agent-team-presets/client/TeamSkillsView
 */

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './TeamSkillsView.module.css'
import type { TeamSkillsController, TeamSkillsState } from './team-skills-controller.ts'
import type { TeamSkillAssetView } from '../types.ts'

/** Locale keys this panel reads. */
export type TeamSkillsLocaleKey =
  | 'skillsTitle' | 'skillsSub' | 'skillsNote' | 'skillsNew' | 'skillsImport' | 'skillsOpenFolder'
  | 'skillsSearch' | 'skillsAll' | 'skillsBuiltin' | 'skillsCustom' | 'skillsFiles' | 'skillsBound'
  | 'skillsEmpty' | 'skillsResources' | 'skillsSaveFile' | 'skillsEditable' | 'skillsReadonly'
  | 'skillsMakeCopy' | 'skillsResetCopy' | 'skillsBindings' | 'skillsNoBinding' | 'skillsUnbind'
  | 'skillsDeps' | 'skillsNoDeps' | 'skillsDelete' | 'skillsDeleteTitle' | 'skillsDeleteBody'
  | 'skillsCancel' | 'skillsConfirm' | 'skillsName' | 'skillsDesc' | 'skillsNewTitle'
  | 'skillsVersion' | 'skillsOverrideOn' | 'skillsBlockedAssign' | 'skillsMcpUnverified' | 'skillsDeclared' | 'skillsFound' | 'skillsMissing'

/** Props of {@link TeamSkillsView}. */
export interface TeamSkillsViewProps {
  /** Page state and actions. */
  readonly controller: TeamSkillsController
  /** Translate one locale key. */
  readonly t: (key: TeamSkillsLocaleKey) => string
}

/** Which page the panel shows. */
type Page = { kind: 'list' } | { kind: 'detail'; assetId: string }

/**
 * Read one line of provenance text.
 * @param asset - the row.
 * @returns a short label.
 */
function originLabel(asset: TeamSkillAssetView): string {
  if (asset.origin === 'builtin') return 'builtin'
  if (asset.origin === 'override') return 'override'
  return 'custom'
}

/** The Team Skill settings pages. */
export function TeamSkillsView(props: TeamSkillsViewProps): React.ReactElement {
  const { controller, t } = props
  const [state, setState] = useState<TeamSkillsState>(controller.getSnapshot())
  const [page, setPage] = useState<Page>({ kind: 'list' })
  const [query, setQuery] = useState('')
  const [origin, setOrigin] = useState<'all' | 'builtin' | 'custom'>('all')
  const [draft, setDraft] = useState('')
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    const unsubscribe = controller.subscribe(() => { setState(controller.getSnapshot()) })
    void controller.refresh()
    return unsubscribe
  }, [controller])

  useEffect(() => { setDraft(state.fileText ?? '') }, [state.fileText])

  const assets = state.library?.assets ?? []
  const visible = useMemo(() => assets.filter((asset) => {
    const matchesOrigin = origin === 'all' || (origin === 'builtin' ? asset.origin === 'builtin' : asset.origin !== 'builtin')
    const haystack = `${asset.skillId} ${asset.description}`.toLocaleLowerCase()
    return matchesOrigin && query.trim().split(/\s+/u).every(token => haystack.includes(token.toLocaleLowerCase()))
  }), [assets, origin, query])

  const detail = state.detail
  const selected = page.kind === 'detail' ? assets.find(asset => asset.id === page.assetId) : undefined

  /**
   * Pick a folder and hand its files to the Host.
   * @param list - the picker's files.
   */
  const importFolder = async (list: FileList | null): Promise<void> => {
    if (list === null || list.length === 0) return
    const files: { path: string; content: Uint8Array }[] = []
    for (const file of Array.from(list)) {
      const relative = (file as File & { webkitRelativePath?: string }).webkitRelativePath ?? ''
      const path = relative === '' ? file.name : relative.includes('/') ? relative.slice(relative.indexOf('/') + 1) : relative
      files.push({ path, content: new Uint8Array(await file.arrayBuffer()) })
    }
    await controller.importFolder(files)
  }

  if (state.status === 'unavailable') {
    return (
      <div className={css.page}>
        <h2 className={css.title}>{t('skillsTitle')}</h2>
        <div className={css.info}>{state.issue ?? t('skillsEmpty')}</div>
      </div>
    )
  }

  if (page.kind === 'detail') {
    return (
      <div className={css.page}>
        <button type="button" className={css.crumb} onClick={() => { setPage({ kind: 'list' }); setConfirmDelete(false) }}>
          ‹ {t('skillsTitle')}
        </button>
        {detail === undefined || selected === undefined ? <div className={css.empty}>{t('skillsEmpty')}</div> : (
          <>
            <h2 className={css.title}>{detail.asset.skillId}</h2>
            <p className={css.sub}>{detail.asset.description}</p>
            <div className={css.pills}>
              <span className={`${css.tag} ${detail.asset.origin === 'builtin' ? css.tagOrigin : ''}`}>
                {originLabel(detail.asset)} · {detail.asset.editable ? t('skillsEditable') : t('skillsReadonly')}
              </span>
              <span className={css.tag}>{t('skillsVersion')} {detail.asset.version}</span>
              <span className={css.tag}>{detail.asset.fileCount} {t('skillsFiles')}</span>
              {detail.asset.updateAvailable === true ? <span className={`${css.tag} ${css.tagWarn}`}>{t('skillsOverrideOn')}</span> : null}
            </div>

            {(() => {
              const missing = (detail.dependencies?.executables ?? []).filter(row => !row.found)
              const unverified = detail.asset.mcpServers
              if (missing.length === 0 && unverified.length === 0) return null
              return (
                <div className={css.info} style={missing.length > 0 ? { borderColor: '#f0cbd0', background: '#fff5f6' } : undefined}>
                  {missing.length > 0
                    ? <span>{t('skillsBlockedAssign')}：{missing.map(row => row.name).join(', ')}</span>
                    : <span>{t('skillsMcpUnverified')}：{unverified.join(', ')}</span>}
                </div>
              )
            })()}
            <div className={css.sectionTitle}>{t('skillsResources')}</div>
            <div className={css.fileArea}>
              <div className={css.fileTree}>
                {detail.files.map(file => (
                  <button
                    key={file.path}
                    type="button"
                    className={state.file === file.path ? css.active : ''}
                    onClick={() => { void controller.openFile(file.path) }}
                  >{file.path.includes('/') ? '↳ ' : '◫ '}{file.path}</button>
                ))}
              </div>
              <div className={css.fileEditor}>
                <div className={css.fileTop}>
                  <span>{state.file ?? 'SKILL.md'}</span>
                  <span>{detail.asset.editable ? t('skillsEditable') : t('skillsReadonly')}</span>
                </div>
                <textarea
                  className={css.code}
                  spellCheck={false}
                  value={draft}
                  readOnly={!detail.asset.editable}
                  onChange={(event) => { setDraft(event.target.value) }}
                />
              </div>
            </div>

            <div className={css.actions}>
              {detail.asset.editable ? (
                <Button onClick={() => { void controller.saveFile(state.file ?? 'SKILL.md', draft) }}>{t('skillsSaveFile')}</Button>
              ) : (
                <Button onClick={() => { void controller.createOverride(detail.asset.skillId) }}>{t('skillsMakeCopy')}</Button>
              )}
              {detail.asset.origin === 'override'
                ? <Button onClick={() => { void controller.resetOverride(detail.asset.id) }}>{t('skillsResetCopy')}</Button>
                : null}
              <Button onClick={() => { setConfirmDelete(true) }}>{t('skillsDelete')}</Button>
            </div>

            <div className={css.panel}>
              <div className={css.panelTitle}>{t('skillsBindings')} · {detail.asset.bindings.length}</div>
              {detail.asset.bindings.length === 0 ? <div className={css.muted}>{t('skillsNoBinding')}</div> : detail.asset.bindings.map(row => (
                <div key={`${row.teamId}:${row.roleId}`} className={css.bindRow}>
                  <span className={css.dot} />
                  <span className={css.main}>
                    <span className={css.rowTitle}>{row.teamName}</span>
                    <span className={css.rowSub}>{row.roleName}</span>
                  </span>
                  <button type="button" className={css.mini} onClick={() => { void controller.unassign(row.teamId, row.roleId) }}>
                    {t('skillsUnbind')}
                  </button>
                </div>
              ))}
            </div>

            <div className={css.panel}>
              <div className={css.panelTitle}>{t('skillsDeps')}</div>
              {(detail.asset.mcpServers.length === 0 && (detail.dependencies?.executables.length ?? 0) === 0)
                ? <div className={css.muted}>{t('skillsNoDeps')}</div>
                : (
                  <>
                    {detail.asset.mcpServers.map(server => (
                      <div key={server} className={css.muted}>MCP · {server} <span className={css.tag}>{t('skillsDeclared')}</span></div>
                    ))}
                    {(detail.dependencies?.executables ?? []).map(row => (
                      <div key={row.name} className={css.muted}>
                        {row.name} <span className={`${css.tag} ${row.found ? css.tagOk : css.tagWarn}`}>{row.found ? t('skillsFound') : t('skillsMissing')}</span>
                      </div>
                    ))}
                  </>
                )}
            </div>

            {state.message === undefined ? null : (
              <div className={`${css.message} ${state.failed ? css.messageFailed : ''}`}>{state.message}</div>
            )}

            {confirmDelete ? (
              <div className={css.dialogBackdrop} onClick={() => { setConfirmDelete(false) }}>
                <div className={css.dialog} role="dialog" aria-modal="true" onClick={(event) => { event.stopPropagation() }}>
                  <h2>{t('skillsDeleteTitle')}</h2>
                  <p className={css.muted}>{t('skillsDeleteBody')}</p>
                  <div className={css.dialogActions}>
                    <Button onClick={() => { setConfirmDelete(false) }}>{t('skillsCancel')}</Button>
                    <Button onClick={() => {
                      void controller.remove(detail.asset.id).then((outcome) => {
                        if (outcome?.ok === true) { setConfirmDelete(false); setPage({ kind: 'list' }) }
                      })
                    }}>{t('skillsConfirm')}</Button>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    )
  }

  return (
    <div className={css.page}>
      <h2 className={css.title}>{t('skillsTitle')}</h2>
      <p className={css.sub}>{t('skillsSub')}</p>
      <div className={css.info}>ⓘ <span>{t('skillsNote')}</span></div>

      <div className={css.actions}>
        <Button onClick={() => { setCreating(true) }}>{t('skillsNew')}</Button>
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
        <Button onClick={() => { void navigator.clipboard?.writeText(state.library?.root ?? '') }}>{t('skillsOpenFolder')}</Button>
      </div>

      <div className={css.toolbar}>
        <input className={css.search} value={query} placeholder={t('skillsSearch')} onChange={(event) => { setQuery(event.target.value) }} />
      </div>
      <div className={css.segment}>
        <button type="button" className={origin === 'all' ? css.active : ''} onClick={() => { setOrigin('all') }}>{t('skillsAll')}</button>
        <button type="button" className={origin === 'builtin' ? css.active : ''} onClick={() => { setOrigin('builtin') }}>{t('skillsBuiltin')}</button>
        <button type="button" className={origin === 'custom' ? css.active : ''} onClick={() => { setOrigin('custom') }}>{t('skillsCustom')}</button>
      </div>

      <div className={css.rowlist}>
        {visible.length === 0 ? <div className={css.empty}>{t('skillsEmpty')}</div> : visible.map(asset => (
          <button
            key={asset.id}
            type="button"
            className={css.row}
            onClick={() => { setPage({ kind: 'detail', assetId: asset.id }); void controller.select(asset.id) }}
          >
            <span className={`${css.dot} ${asset.origin === 'builtin' ? '' : css.dotCustom}`} />
            <span className={css.main}>
              <span className={css.rowTitle}>
                {asset.skillId}
                <span className={`${css.tag} ${asset.origin === 'builtin' ? css.tagOrigin : ''}`}>{originLabel(asset)}</span>
                {asset.updateAvailable === true ? <span className={`${css.tag} ${css.tagWarn}`}>{t('skillsOverrideOn')}</span> : null}
              </span>
              <span className={css.rowSub}>
                {asset.description} · {asset.fileCount} {t('skillsFiles')} · {t('skillsBound')} {asset.bindings.length}
              </span>
            </span>
            <span className={css.chev}>›</span>
          </button>
        ))}
      </div>

      {state.message === undefined ? null : (
        <div className={`${css.message} ${state.failed ? css.messageFailed : ''}`}>{state.message}</div>
      )}

      {creating ? (
        <div className={css.dialogBackdrop} onClick={() => { setCreating(false) }}>
          <div className={css.dialog} role="dialog" aria-modal="true" onClick={(event) => { event.stopPropagation() }}>
            <h2>{t('skillsNewTitle')}</h2>
            <label className={css.label}>{t('skillsName')}</label>
            <input className={css.field} value={name} placeholder="example-skill" onChange={(event) => { setName(event.target.value) }} />
            <label className={css.label}>{t('skillsDesc')}</label>
            <input className={css.field} value={description} placeholder={t('skillsDesc')} onChange={(event) => { setDescription(event.target.value) }} />
            <div className={css.dialogActions}>
              <Button onClick={() => { setCreating(false) }}>{t('skillsCancel')}</Button>
              <Button onClick={() => {
                void controller.create(name, description).then(() => {
                  setName(''); setDescription(''); setCreating(false)
                })
              }}>{t('skillsConfirm')}</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

/**
 * The Team preset categories page.
 *
 * Categories are local view fields: they never leave this browser document and are
 * never exported with a preset. They live on their own page because renaming or
 * reordering them is occasional housekeeping, not something the list page should
 * crowd beside its filters.
 * @module dsh-agent-team-presets/client/TeamCategoryManager
 */

import { useState } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { TeamPresetsLocaleKey } from './locales.ts'
import css from './TeamPresetsSection.module.css'

/** Props of the categories page. */
export interface TeamCategoryManagerProps {
  /** Categories in stored order. */
  readonly categories: readonly { readonly id: string; readonly name: string; readonly order: number }[]
  /** Which Team belongs to which category. */
  readonly teamCategories: readonly { readonly teamId: string; readonly categoryId: string }[]
  /** Whether the Host document accepts writes. */
  readonly disabled: boolean
  /** Page copy reader. */
  readonly t: (key: TeamPresetsLocaleKey) => string
  readonly onBack: () => void
  readonly onAdd: (name: string) => void
  readonly onRename: (id: string, name: string) => void
  readonly onMove: (id: string, delta: -1 | 1) => void
  readonly onRemove: (id: string) => void
}

/**
 * Render the categories page.
 * @param props - the categories, their memberships, copy and write callbacks.
 * @returns the page header, the add field and one row per category.
 */
export function TeamCategoryManager(props: TeamCategoryManagerProps): React.ReactElement {
  const { t } = props
  const [draft, setDraft] = useState('')
  const [renaming, setRenaming] = useState('')
  const [renameText, setRenameText] = useState('')
  const ordered = [...props.categories].sort((left, right) => left.order - right.order)

  return (
    <>
      <header className={css.pageHead}>
        <button type="button" className={css.crumb} onClick={props.onBack}>‹ {t('title')}</button>
        <h2 className={css.title}>{t('categoryTitle')}</h2>
        <p className={css.intro}>{t('categorySub')}</p>
      </header>

      <div className={css.actionRow}>
        <input
          className={css.textInput}
          value={draft}
          placeholder={t('categoryName')}
          disabled={props.disabled}
          onChange={(event) => { setDraft(event.target.value) }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            props.onAdd(draft)
            setDraft('')
          }}
        />
        <Button
          size="sm"
          variant="outline"
          disabled={props.disabled}
          onClick={() => { props.onAdd(draft); setDraft('') }}
        >{t('categoryAdd')}</Button>
      </div>

      {ordered.length === 0
        ? <p className={css.empty}>{t('categoryEmpty')}</p>
        : (
          <ul className={css.plainRows}>
            {ordered.map((entry, index) => {
              const count = props.teamCategories.filter(row => row.categoryId === entry.id).length
              return (
                <li key={entry.id} className={css.card}>
                  <span className={css.rowMain}>
                    {renaming === entry.id ? (
                      <input
                        className={css.textInput}
                        autoFocus
                        value={renameText}
                        onChange={(event) => { setRenameText(event.target.value) }}
                        onKeyDown={(event) => {
                          if (event.key === 'Escape') setRenaming('')
                          if (event.key !== 'Enter') return
                          props.onRename(entry.id, renameText)
                          setRenaming('')
                        }}
                      />
                    ) : (
                      <span className={css.rowText}>
                        <span className={css.rowName}>{entry.name}</span>
                        <span className={css.rowMeta}>{String(count)} · {t('categoryTeams')}</span>
                      </span>
                    )}
                  </span>
                  <span className={css.rowActions}>
                    {renaming === entry.id
                      ? (
                        <Button size="sm" variant="ghost" onClick={() => { props.onRename(entry.id, renameText); setRenaming('') }}>
                          {t('categorySave')}
                        </Button>
                      )
                      : (
                        <Button size="sm" variant="ghost" disabled={props.disabled} onClick={() => { setRenaming(entry.id); setRenameText(entry.name) }}>
                          {t('categoryRename')}
                        </Button>
                      )}
                    <Button size="sm" variant="ghost" disabled={props.disabled || index === 0} onClick={() => { props.onMove(entry.id, -1) }}>
                      {t('categoryUp')}
                    </Button>
                    <Button size="sm" variant="ghost" disabled={props.disabled || index === ordered.length - 1} onClick={() => { props.onMove(entry.id, 1) }}>
                      {t('categoryDown')}
                    </Button>
                    <Button size="sm" variant="ghost" disabled={props.disabled} onClick={() => { props.onRemove(entry.id) }}>
                      {t('categoryRemove')}
                    </Button>
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      <p className={css.hint}>{t('categoryNote')}</p>
    </>
  )
}

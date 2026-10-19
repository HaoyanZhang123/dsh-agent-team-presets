/**
 * The category picker for a Team definition.
 *
 * A native select cannot be styled where it matters: its option list is drawn by
 * the platform, so it ignores the plugin's surface. This draws the trigger and the
 * list itself, borrowing the composer picker's row metrics.
 * @module dsh-agent-team-presets/client/CategorySelect
 */

import { useEffect, useRef, useState } from 'react'
import css from './TeamPresetsSection.module.css'

/** Props of the category picker. */
export interface CategorySelectProps {
  /** Selected category id, or the empty string for "no category". */
  readonly value: string
  /** Categories in stored order. */
  readonly categories: readonly { readonly id: string; readonly name: string; readonly order?: number }[]
  /** Copy of the empty choice. */
  readonly noneLabel: string
  readonly disabled: boolean
  /** Called with the new category id (empty string clears it). */
  readonly onChange: (id: string) => void
}

/**
 * Render the picker.
 * @param props - the selection, the choices and the write callback.
 * @returns a trigger button and, while open, the option list beneath it.
 */
export function CategorySelect(props: CategorySelectProps): React.ReactElement {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const ordered = [...props.categories].sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
  const current = ordered.find(entry => entry.id === props.value)
  const label = current === undefined ? props.noneLabel : current.name

  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent): void => {
      if (wrap.current?.contains(event.target as Node) === true) return
      setOpen(false)
    }
    const onKey = (event: KeyboardEvent): void => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className={css.selectWrap} ref={wrap}>
      <button
        type="button"
        className={css.select}
        disabled={props.disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => { setOpen(value => !value) }}
      >
        <span className={css.selectValue}>{label}</span>
      </button>
      {open ? (
        <div className={css.selectPop} role="listbox">
          <button
            type="button"
            role="option"
            aria-selected={props.value === ''}
            className={`${css.selectOption} ${props.value === '' ? css.selectOptionActive : ''}`}
            onClick={() => { props.onChange(''); setOpen(false) }}
          >{props.noneLabel}</button>
          {ordered.map(entry => (
            <button
              key={entry.id}
              type="button"
              role="option"
              aria-selected={props.value === entry.id}
              className={`${css.selectOption} ${props.value === entry.id ? css.selectOptionActive : ''}`}
              onClick={() => { props.onChange(entry.id); setOpen(false) }}
            >{entry.name}</button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

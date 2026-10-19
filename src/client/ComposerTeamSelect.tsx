/**
 * The composer's Team control: pick the Team preset that leads this Session.
 * It sits in the composer tool row after the permission control.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { IconChevronDownOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: pulls the conversation slot declarations and the session seat.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import { selectedTeam } from '../presets.ts'
import { TEAM_SERIES, teamSeriesOf } from '../team-catalog.ts'
import { matchTeam, queryTokens, teamOrigin } from '../team-search.ts'
import type { TeamPreset } from '../types.ts'
import type { TeamPresetsInjected } from './team-presets-controller.ts'
import { FORM_ISSUE_KEYS, selectionFailureText } from './locales.ts'
import css from './ComposerTeamSelect.module.css'

/** Complete props derived from the composer slot and the shared Team state. */
export type ComposerTeamSelectProps =
  PropsRuntime<'conversation.input.left'>
  & PropsLocale<'settings.agentTeamPresets'>
  & InjectFace<TeamPresetsInjected>

/**
 * Render the composer's Team picker.
 * @param props - the Session identity, the page's locale reader, and the selection writer.
 * @returns the Team trigger, plus a notice when the last selection write failed.
 */
export function ComposerTeamSelect(props: ComposerTeamSelectProps) {
  const { t, sessionId } = props
  const state = props.useTeamPresets(snapshot => snapshot)
  const [open, setOpen] = useState(false)

  const selection = state.selections.find(row => row.sessionId === String(sessionId))
  const active = selectedTeam(state.teams, state.selections, String(sessionId))
  const missing = selection !== undefined && active === undefined
  const missingLabel = t('composerMissing').replace('{team}', selection?.teamId ?? '')
  // A selection the Host refused is reported here, on the control the user
  // clicked: the trigger's own title carries it and a sibling notice makes it
  // visible without a hover, because the failure this replaces was exactly a
  // click that left no trace anywhere. A document this page cannot use says so
  // in the title too, so a disabled trigger is never a dead end.
  const failure = state.selectionFailure === undefined ? undefined : selectionFailureText(state.selectionFailure, t)
  const issue = state.formIssue === undefined ? undefined : t(FORM_ISSUE_KEYS[state.formIssue])
  const writable = state.status === 'ready' && state.writable
  const [query, setQuery] = useState('')
  const [source, setSource] = useState<'all' | 'builtin' | 'custom'>('all')
  const popover = useRef<HTMLDivElement | null>(null)

  // Close on Escape or on a press outside, which is what a popover that is not a
  // native menu has to do itself.
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent): void => { if (event.key === 'Escape') setOpen(false) }
    const onDown = (event: MouseEvent): void => {
      const node = popover.current
      if (node !== null && event.target instanceof Node && !node.contains(event.target)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [open])

  const tokens = queryTokens(query)
  const groups = useMemo(() => TEAM_SERIES.map(series => ({
    series: series.id,
    teams: state.teams.filter((team: TeamPreset) => {
      const matchesSource = source === 'all' || teamOrigin(team.id).source === source
      return matchesSource && teamSeriesOf(team.id) === series.id && (tokens.length === 0 || matchTeam(team, tokens) !== undefined)
    }),
  })), [state.teams, source, tokens])

  const choose = (teamId: string | undefined): void => {
    setOpen(false)
    void props.selectTeam(String(sessionId), teamId)
  }

  return (
    <>
      <span className={css.wrap} ref={popover}>
        <button
          type="button"
          className={css.trigger}
          disabled={!writable}
          aria-haspopup="listbox"
          aria-expanded={open}
          title={failure ?? issue ?? (missing ? `${missingLabel}. ${t('composerMissingHint')}` : t('composerHint'))}
          onClick={() => { setOpen(value => !value) }}
        >
          {active === undefined || active.captain.color === ''
            ? null
            : (
              <span
                className={css.accentDot}
                style={{ background: active.captain.color }}
                aria-hidden
              />
            )}
          <span className={css.triggerLabel} aria-label={t('composerTitle')}>
            {missing ? missingLabel : active === undefined ? t('composerNone') : (active.name === '' ? active.id : active.name)}
          </span>
          <span className={css.triggerIcon}><IconChevronDownOutlineRegular size={14} /></span>
        </button>

        {open ? (
          <div className={css.popover} role="listbox" aria-label={t('composeTitle')}>
            <div className={css.popHead}>
              <span>{t('composeTitle')}</span>
              <button type="button" className={css.popClose} onClick={() => { setOpen(false) }}>{t('composeClose')}</button>
            </div>
            <input
              className={css.popSearch}
              autoFocus
              value={query}
              placeholder={t('composeSearch')}
              onChange={(event) => { setQuery(event.target.value) }}
            />
            <div className={css.popChips}>
              <button type="button" className={`${css.popChip} ${source === 'all' ? css.popChipActive : ''}`} onClick={() => { setSource('all') }}>{t('composeAll')}</button>
              <button type="button" className={`${css.popChip} ${source === 'builtin' ? css.popChipActive : ''}`} onClick={() => { setSource('builtin') }}>{t('skillsBuiltin')}</button>
              <button type="button" className={`${css.popChip} ${source === 'custom' ? css.popChipActive : ''}`} onClick={() => { setSource('custom') }}>{t('skillsCustom')}</button>
            </div>
            <div className={css.popList}>
              {/* The no-Team choice is pinned first, exactly as the prototype
                  specifies: leaving the Session without a Team must never depend
                  on scrolling past the Catalogue. */}
              <button
                type="button"
                className={`${css.popOption} ${selection === undefined ? css.popOptionActive : ''}`}
                onClick={() => { choose(undefined) }}
              >
                <span className={css.popOptionName}>{t('composerNone')}</span>
                <span className={css.popOptionSub}>{t('composeNoneSub')}</span>
              </button>
              {missing ? (
                <button type="button" className={css.popOption} disabled>
                  <span className={css.popOptionName}>{missingLabel}</span>
                  <span className={css.popOptionSub}>{t('composerMissingHint')}</span>
                </button>
              ) : null}
              {groups.map(group => group.teams.length === 0 ? null : (
                <div key={group.series}>
                  <div className={css.popGroup}>{group.series === 'classic-development' ? t('composeSeriesDev') : t('composeSeriesModes')}</div>
                  {group.teams.map((team: TeamPreset) => (
                    <button
                      key={team.id}
                      type="button"
                      role="option"
                      aria-selected={selection?.teamId === team.id}
                      className={`${css.popOption} ${selection?.teamId === team.id ? css.popOptionActive : ''}`}
                      onClick={() => { choose(team.id) }}
                    >
                      <span className={css.popOptionName}>{team.name === '' ? team.id : team.name}</span>
                      <span className={css.popOptionSub}>{team.metadata?.summary ?? team.description}</span>
                    </button>
                  ))}
                </div>
              ))}
              {groups.every(group => group.teams.length === 0) ? <div className={css.popEmpty}>{t('composeEmpty')}</div> : null}
            </div>
          </div>
        ) : null}
      </span>
      {failure === undefined ? null : <span className={css.failure} role="status">{failure}</span>}
    </>
  )
}

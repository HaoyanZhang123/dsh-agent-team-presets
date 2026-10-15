import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * The composer's Team control: pick the Team preset that leads this Session.
 * It sits in the composer tool row after the permission control.
 */
import { useState } from 'react';
import { IconChevronDownOutlineRegular, Menu } from '@deepseek-ai/dsh-client-ui-primitives';
import { selectedTeam } from "../presets.js";
import { FORM_ISSUE_KEYS, selectionFailureText } from "./locales.js";
import css from './ComposerTeamSelect.module.css';
/**
 * Render the composer's Team picker.
 * @param props - the Session identity, the page's locale reader, and the selection writer.
 * @returns the Team trigger, plus a notice when the last selection write failed.
 */
export function ComposerTeamSelect(props) {
    const { t, sessionId } = props;
    const state = props.useTeamPresets(snapshot => snapshot);
    const [open, setOpen] = useState(false);
    const selection = state.selections.find(row => row.sessionId === String(sessionId));
    const active = selectedTeam(state.teams, state.selections, String(sessionId));
    const missing = selection !== undefined && active === undefined;
    const missingLabel = t('composerMissing').replace('{team}', selection?.teamId ?? '');
    // A selection the Host refused is reported here, on the control the user
    // clicked: the trigger's own title carries it and a sibling notice makes it
    // visible without a hover, because the failure this replaces was exactly a
    // click that left no trace anywhere. A document this page cannot use says so
    // in the title too, so a disabled trigger is never a dead end.
    const failure = state.selectionFailure === undefined ? undefined : selectionFailureText(state.selectionFailure, t);
    const issue = state.formIssue === undefined ? undefined : t(FORM_ISSUE_KEYS[state.formIssue]);
    const writable = state.status === 'ready' && state.writable;
    const items = [
        { id: '', label: t('composerNone') },
        ...(missing ? [{ id: selection.teamId, label: missingLabel, disabled: true }] : []),
        ...state.teams.map(team => ({ id: team.id, label: team.name === '' ? team.id : team.name })),
    ];
    return (_jsxs(_Fragment, { children: [_jsx(Menu, { open: open, items: items, selectedId: selection?.teamId ?? '', onSelect: (id) => {
                    setOpen(false);
                    void props.selectTeam(String(sessionId), id === '' ? undefined : id);
                }, onClose: () => { setOpen(false); }, side: "top", portal: true, compact: true, anchor: (_jsxs("button", { type: "button", className: css.trigger, disabled: !writable, "aria-haspopup": "listbox", "aria-expanded": open, title: failure ?? issue ?? (missing ? `${missingLabel}. ${t('composerMissingHint')}` : t('composerHint')), onClick: () => { setOpen(value => !value); }, children: [active === undefined || active.captain.color === ''
                            ? null
                            : (_jsx("span", { className: css.accentDot, style: { background: active.captain.color }, "aria-hidden": true })), _jsx("span", { className: css.triggerLabel, "aria-label": t('composerTitle'), children: missing ? missingLabel : active === undefined ? t('composerTitle') : (active.name === '' ? active.id : active.name) }), _jsx("span", { className: css.triggerIcon, children: _jsx(IconChevronDownOutlineRegular, { size: 14 }) })] })) }), failure === undefined ? null : _jsx("span", { className: css.failure, role: "status", children: failure })] }));
}

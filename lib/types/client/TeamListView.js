import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * First Team preset page: every configured Team as one row. Choosing a row
 * opens that Team's own page.
 */
import { useMemo, useRef, useState } from 'react';
import { Button } from '@deepseek-ai/dsh-client-ui-primitives';
import { matchTeam, queryTokens, teamOrigin } from "../team-search.js";
import { TEAM_SERIES, teamSeriesOf } from "../team-catalog.js";
import css from './TeamPresetsSection.module.css';
/**
 * Render the Team list.
 * @param props - the Teams, copy, and navigation callbacks.
 * @returns the header, the create and import actions, and one row per Team.
 */
export function TeamListView(props) {
    const { t, disabled } = props;
    const fileInput = useRef(null);
    const [query, setQuery] = useState('');
    const [source, setSource] = useState('all');
    const [series, setSeries] = useState('all');
    const [category, setCategory] = useState('');
    const [managing, setManaging] = useState(false);
    const [newCategory, setNewCategory] = useState('');
    const tokens = queryTokens(query);
    const visible = useMemo(() => props.teams.filter((team) => {
        const matchesSource = source === 'all' || teamOrigin(team.id).source === source;
        const matchesSeries = series === 'all' || teamSeriesOf(team.id) === series;
        // An assigned category narrows the list exactly as a chip reads; a Team with
        // no category is simply not in any chip's filter.
        const matchesCategory = category === '' || (props.teamCategories ?? []).some(row => row.teamId === team.id && row.categoryId === category);
        // The shared matcher decides what a token matches, so the list and the
        // composer picker can never disagree about which Teams a query finds.
        const matchesQuery = tokens.length === 0 || matchTeam(team, tokens) !== undefined;
        return matchesSource && matchesSeries && matchesCategory && matchesQuery;
    }), [props.teams, props.teamCategories, source, series, category, tokens]);
    return (_jsxs(_Fragment, { children: [_jsxs("header", { className: css.pageHead, children: [_jsx("h2", { className: css.title, children: t('title') }), _jsx("p", { className: css.intro, children: t('description') })] }), _jsxs("div", { className: css.actionRow, children: [_jsx(Button, { size: "sm", variant: "outline", disabled: disabled, onClick: props.onCreate, children: t('newTeam') }), _jsx(Button, { size: "sm", variant: "outline", disabled: disabled, onClick: () => { fileInput.current?.click(); }, children: t('importPreset') }), _jsx(Button, { size: "sm", variant: "outline", disabled: disabled, onClick: props.onRestoreDefaults, children: t('restoreDefaults') }), _jsx("input", { ref: fileInput, className: css.fileInput, type: "file", accept: "application/json,.json", disabled: disabled, onChange: (event) => {
                            const file = event.target.files?.[0];
                            // Clearing the value lets the same document be chosen twice in a row.
                            event.target.value = '';
                            if (file !== undefined)
                                props.onImport(file);
                        } })] }), _jsx("p", { className: css.hint, children: t('importNote') }), _jsx("p", { className: css.hint, children: t('restoreDefaultsHint') }), props.importError === undefined
                ? null
                : _jsx("p", { className: css.warn, role: "status", children: t(props.importError) }), _jsx("div", { className: css.listToolbar, children: _jsx("input", { className: css.listSearch, value: query, placeholder: t('listSearch'), onChange: (event) => { setQuery(event.target.value); } }) }), _jsxs("div", { className: css.chipRow, children: [_jsx("button", { type: "button", className: `${css.chip} ${source === 'all' && series === 'all' ? css.chipActive : ''}`, onClick: () => { setSource('all'); setSeries('all'); }, children: t('listAll') }), _jsx("button", { type: "button", className: `${css.chip} ${source === 'builtin' ? css.chipActive : ''}`, onClick: () => { setSource('builtin'); setSeries('all'); }, children: t('listBuiltin') }), _jsx("button", { type: "button", className: `${css.chip} ${source === 'custom' ? css.chipActive : ''}`, onClick: () => { setSource('custom'); setSeries('all'); }, children: t('listCustom') }), (props.categories ?? []).map(entry => (_jsx("button", { type: "button", className: `${css.chip} ${category === entry.id ? css.chipActive : ''}`, onClick: () => { setCategory(entry.id); }, children: entry.name }, entry.id))), TEAM_SERIES.map(entry => (_jsx("button", { type: "button", className: `${css.chip} ${series === entry.id ? css.chipActive : ''}`, onClick: () => { setSeries(entry.id); setSource('all'); }, children: entry.id === 'classic-development' ? t('seriesDevelopment') : t('seriesWorkModes') }, entry.id)))] }), props.onAddCategory === undefined ? null : (_jsx("div", { className: css.chipRow, style: { marginBottom: 6 }, children: _jsx("button", { type: "button", className: css.chip, onClick: () => { setManaging(value => !value); }, children: managing ? t('categoryFold') : t('categoryManage') }) })), managing ? (_jsxs("div", { className: css.categoryPanel, children: [_jsx("input", { className: css.listSearch, value: newCategory, placeholder: t('categoryName'), onChange: (event) => { setNewCategory(event.target.value); }, onKeyDown: (event) => {
                            if (event.key !== 'Enter')
                                return;
                            props.onAddCategory?.(newCategory);
                            setNewCategory('');
                        } }), _jsx(Button, { size: "sm", variant: "outline", onClick: () => { props.onAddCategory?.(newCategory); setNewCategory(''); }, children: t('categoryAdd') }), (props.categories ?? []).map(entry => (_jsxs("span", { className: css.categoryPill, children: [entry.name, _jsx("button", { type: "button", className: css.chip, onClick: () => { props.onRemoveCategory?.(entry.id); }, children: "\u00D7" })] }, entry.id))), (props.categories ?? []).length === 0 ? _jsx("span", { className: css.hint, children: t('categoryEmpty') }) : null] })) : null, _jsxs("p", { className: css.hint, children: [t('listMatched'), " ", visible.length, " \u00B7 ", t('listNoInject')] }), props.teams.length === 0
                ? _jsx("p", { className: css.empty, children: t('emptyTeams') })
                : (_jsxs("ul", { className: css.rows, children: [visible.length === 0 ? _jsx("li", { className: css.empty, children: t('listNoMatch') }) : null, visible.map(team => (_jsxs("li", { className: css.card, "data-series": teamSeriesOf(team.id) ?? '', children: [_jsxs("button", { type: "button", className: css.rowMain, onClick: () => { props.onOpen(team.id); }, children: [_jsx("span", { className: css.dot, style: team.captain.color === '' ? undefined : { background: team.captain.color }, "aria-hidden": true }), _jsxs("span", { className: css.rowText, children: [_jsx("span", { className: css.rowName, children: team.name === '' ? team.id : team.name }), _jsx("span", { className: css.rowMeta, children: `${String(team.members.length)} ${t('memberCount')} · ${t('captainFollowsSession')}` })] })] }), _jsxs("span", { className: css.rowActions, children: [_jsx(Button, { size: "sm", variant: "ghost", onClick: () => { props.onExport(team.id); }, children: t('exportPreset') }), _jsx(Button, { size: "sm", variant: "ghost", disabled: disabled, onClick: () => { props.onDuplicate(team.id); }, children: t('duplicate') }), _jsx(Button, { size: "sm", variant: "ghost", disabled: disabled, onClick: () => { props.onDelete(team.id); }, children: t('remove') })] })] }, team.id)))] }))] }));
}

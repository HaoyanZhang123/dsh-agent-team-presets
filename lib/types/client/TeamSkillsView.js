import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
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
import { useEffect, useState } from 'react';
import { Button } from '@deepseek-ai/dsh-client-ui-primitives';
/** One small label above a control. */
function Label({ children }) {
    return _jsx("div", { style: { fontSize: 12, opacity: 0.7, marginBottom: 4 }, children: children });
}
/**
 * Badge text for one asset's origin.
 * @param asset - the row.
 * @returns short provenance text.
 */
function originText(asset) {
    if (asset.origin === 'builtin')
        return 'official';
    if (asset.origin === 'override')
        return 'override';
    return 'custom';
}
/** The Team Skills panel. */
export function TeamSkillsView(props) {
    const { controller, t } = props;
    const [state, setState] = useState(controller.getSnapshot());
    const [body, setBody] = useState('');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [teamId, setTeamId] = useState('');
    const [roleId, setRoleId] = useState('');
    useEffect(() => {
        const unsubscribe = controller.subscribe(() => { setState(controller.getSnapshot()); });
        void controller.refresh();
        return unsubscribe;
    }, [controller]);
    useEffect(() => {
        setBody(state.detail?.body ?? '');
    }, [state.detail]);
    const library = state.library;
    const detail = state.detail;
    const selectedTeam = library?.teams.find(team => team.id === teamId) ?? library?.teams[0];
    /**
     * Pick the folder the user chose and hand it over with relative paths.
     * @param list - the picker's files.
     */
    const importFolder = async (list) => {
        if (list === null || list.length === 0)
            return;
        const files = [];
        for (const file of Array.from(list)) {
            const path = file.webkitRelativePath === undefined
                || file.webkitRelativePath === ''
                ? file.name
                : file.webkitRelativePath;
            const relative = path.includes('/') ? path.slice(path.indexOf('/') + 1) : path;
            files.push({ path: relative, content: new Uint8Array(await file.arrayBuffer()) });
        }
        await controller.importFolder(files);
    };
    if (state.status === 'unavailable') {
        return (_jsxs("div", { style: { padding: 16, opacity: 0.8 }, children: ["Team Skills are not available in this deployment", state.issue === undefined ? '' : `: ${state.issue}`] }));
    }
    return (_jsxs("div", { style: { display: 'flex', gap: 16, alignItems: 'flex-start', padding: 12 }, children: [_jsxs("div", { style: { flex: '0 0 300px', minWidth: 0 }, children: [_jsxs("div", { style: { marginBottom: 10 }, children: [_jsx(Label, { children: t('skillsRoot') }), _jsx("code", { style: { display: 'block', fontSize: 11, opacity: 0.7, wordBreak: 'break-all' }, children: library?.root ?? '' })] }), _jsxs("div", { style: { display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }, children: [_jsx(Button, { onClick: () => { void controller.refresh(); }, children: t('skillsRefresh') }), _jsxs("label", { style: { display: 'inline-flex' }, children: [_jsx("input", { type: "file", multiple: true, style: { display: 'none' }, onChange: (event) => { void importFolder(event.target.files); }, webkitdirectory: '' }), _jsx(Button, { onClick: (event) => {
                                            const input = event.currentTarget.parentElement?.querySelector('input');
                                            input?.click();
                                        }, children: t('skillsImport') })] })] }), _jsx("ul", { style: { listStyle: 'none', margin: 0, padding: 0 }, children: (library?.assets ?? []).map(asset => (_jsx("li", { children: _jsxs("button", { type: "button", onClick: () => { void controller.select(asset.id); }, style: {
                                    width: '100%', textAlign: 'left', padding: 8, marginBottom: 4, cursor: 'pointer',
                                    border: asset.id === state.selectedId ? '1px solid currentColor' : '1px solid transparent',
                                    borderRadius: 6, background: 'transparent', color: 'inherit',
                                }, children: [_jsx("div", { style: { fontWeight: 600 }, children: asset.skillId }), _jsxs("div", { style: { fontSize: 11, opacity: 0.7 }, children: [originText(asset), " \u00B7 ", String(asset.fileCount), " files", asset.bindings.length === 0 ? '' : ` · ${String(asset.bindings.length)} bound`, asset.updateAvailable === true ? ' · update available' : ''] })] }) }, asset.id))) }), library !== undefined && library.assets.length === 0 ? _jsx("div", { style: { opacity: 0.7, padding: 8 }, children: t('skillsEmpty') }) : null, _jsxs("div", { style: { marginTop: 12 }, children: [_jsx(Label, { children: t('skillsNew') }), _jsx("input", { value: name, onChange: (event) => { setName(event.target.value); }, placeholder: t('skillsNamePlaceholder'), style: { width: '100%', marginBottom: 4 } }), _jsx("input", { value: description, onChange: (event) => { setDescription(event.target.value); }, placeholder: t('skillsDescriptionPlaceholder'), style: { width: '100%', marginBottom: 4 } }), _jsx(Button, { onClick: () => {
                                    void controller.create(name, description).then(() => { setName(''); setDescription(''); });
                                }, children: t('skillsNew') })] }), (library?.official ?? []).length > 0 ? (_jsxs("div", { style: { marginTop: 12 }, children: [_jsx(Label, { children: t('skillsOfficial') }), (library?.official ?? []).map(skillId => (_jsxs("div", { style: { display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }, children: [_jsx("code", { style: { fontSize: 11, wordBreak: 'break-all' }, children: skillId }), _jsx(Button, { onClick: () => { void controller.createOverride(skillId); }, children: t('skillsOverride') })] }, skillId)))] })) : null] }), _jsxs("div", { style: { flex: '1 1 0', minWidth: 0 }, children: [detail === undefined ? _jsx("div", { style: { opacity: 0.6, paddingTop: 24 }, children: t('skillsHint') }) : (_jsxs(_Fragment, { children: [_jsx("h3", { style: { margin: '0 0 4px' }, children: detail.asset.skillId }), _jsxs("div", { style: { fontSize: 12, opacity: 0.7, marginBottom: 8 }, children: [originText(detail.asset), " \u00B7 v", detail.asset.version, " \u00B7 ", detail.asset.description, detail.asset.updateAvailable === true ? ' · the official copy moved on' : ''] }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }, children: [_jsx(Button, { onClick: () => { void controller.saveFile('SKILL.md', body); }, children: t('skillsSave') }), detail.asset.origin === 'override' ? _jsx(Button, { onClick: () => { void controller.resetOverride(detail.asset.id); }, children: t('skillsReset') }) : null, _jsx(Button, { onClick: () => { void controller.remove(detail.asset.id); }, children: t('skillsDelete') })] }), _jsx(Label, { children: t('skillsBody') }), _jsx("textarea", { value: body, onChange: (event) => { setBody(event.target.value); }, readOnly: !detail.asset.editable, spellCheck: false, style: { width: '100%', minHeight: 220, fontFamily: 'monospace', fontSize: 12 } }), _jsx(Label, { children: t('skillsFiles') }), _jsx("ul", { style: { margin: '0 0 12px', paddingLeft: 18, fontSize: 12 }, children: detail.files.map(file => _jsxs("li", { children: [file.path, " \u00B7 ", String(file.size), " B"] }, file.path)) }), _jsx(Label, { children: t('skillsBindings') }), _jsx("ul", { style: { margin: '0 0 8px', paddingLeft: 18, fontSize: 12 }, children: detail.asset.bindings.map(row => (_jsxs("li", { children: [row.teamName, " \u2192 ", row.roleName, _jsx("button", { type: "button", onClick: () => { void controller.unassign(row.teamId, row.roleId); }, style: { marginLeft: 8, background: 'none', border: 'none', color: 'inherit', textDecoration: 'underline', cursor: 'pointer' }, children: t('skillsUnassign') })] }, `${row.teamId}:${row.roleId}`))) }), _jsxs("div", { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }, children: [_jsx("select", { value: teamId === '' ? (selectedTeam?.id ?? '') : teamId, onChange: (event) => { setTeamId(event.target.value); setRoleId(''); }, children: (library?.teams ?? []).map(team => _jsx("option", { value: team.id, children: team.name }, team.id)) }), _jsxs("select", { value: roleId, onChange: (event) => { setRoleId(event.target.value); }, children: [_jsx("option", { value: "", children: "\u2014" }), (selectedTeam?.roles ?? []).map(role => _jsxs("option", { value: role.id, children: [role.name, role.captain ? ' (captain)' : ''] }, role.id))] }), _jsx(Button, { onClick: () => { if (roleId !== '')
                                            void controller.assign(selectedTeam?.id ?? '', roleId); }, children: t('skillsAssign') })] })] })), state.message === undefined ? null : (_jsx("div", { style: { marginTop: 8, fontSize: 12, color: state.failed ? 'crimson' : 'inherit' }, children: state.message }))] })] }));
}

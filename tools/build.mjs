#!/usr/bin/env node
/** Build local sources in an isolated staging workspace. Never emit into Harness. */
import { createRequire, isBuiltin } from 'node:module'
import { mkdtempSync, cpSync, readFileSync, writeFileSync, mkdirSync, existsSync, realpathSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve, relative, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const checkout = process.env.DSH_CHECKOUT
if (!checkout || !existsSync(join(checkout, 'tsconfig.base.json'))) throw new Error('Set DSH_CHECKOUT to a dependency-installed compatible Harness checkout.')
const harness = realpathSync(checkout)
const require = createRequire(join(harness, 'package.json'))
const scopedRequire = createRequire(join(harness, 'packages/experimental/agent-team-presets/package.json'))
const ts = require('typescript')
const { build } = await import(pathToFileURL(require.resolve('tsdown')).href)
const { transform } = require('lightningcss')
const { WorkspaceTypertGenerator } = await import(pathToFileURL(join(harness, 'packages/typert/generator/lib/index.js')).href)
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const stage = mkdtempSync(join(tmpdir(), 'team-presets-build-'))
console.log(`Isolated build workspace: ${stage}`)
const pkg = join(stage, 'packages/local/team-presets')
const protocol = join(stage, 'packages/support/protocol')
mkdirSync(pkg, { recursive: true })
mkdirSync(protocol, { recursive: true })
const generatedFiles = ['lib/typert.host.js', 'lib/typert.host.d.ts', 'lib/typert.remote-client.js', 'lib/typert.remote-client.d.ts']
try {
  cpSync(join(root, 'src'), join(pkg, 'src'), { recursive: true })
  mkdirSync(join(pkg, 'lib'))
  // Bootstrap only the previous declaration required by Client aliases; the
  // generator replaces it before compilation. Never carry stale build outputs.
  cpSync(join(root, 'lib/typert.remote-client.d.ts'), join(pkg, 'lib/typert.remote-client.d.ts'))
  cpSync(join(harness, 'packages/typert/protocol/src'), join(protocol, 'src'), { recursive: true })
  cpSync(join(harness, 'packages/typert/protocol/package.json'), join(protocol, 'package.json'))
  writeFileSync(join(pkg, 'package.json'), JSON.stringify({ ...manifest, files: [...new Set([...manifest.files, ...generatedFiles])] }))
  const base = ts.readConfigFile(join(harness, 'tsconfig.base.json'), ts.sys.readFile)
  if (base.error) throw new Error(ts.flattenDiagnosticMessageText(base.error.messageText, '\n'))
  const paths = Object.fromEntries(Object.entries(base.config.compilerOptions.paths).map(([key, values]) => [key, values.map(value => resolve(harness, value))]))
  const reactTypes = dirname(scopedRequire.resolve('@types/react/package.json'))
  Object.assign(paths, {
    '@deepseek-ai/dsh-typert-protocol': [join(protocol, 'src/index.ts')],
    '@deepseek-ai/dsh-typert-protocol/types': [join(protocol, 'src/types.ts')],
    '@deepseek-ai/dsh-experimental-client-ui-agent-team/client': [join(harness, 'packages/experimental/client-ui-agent-team/src/client/index.ts')],
    'dsh-agent-team-presets/remote': [join(pkg, 'lib/typert.remote-client.d.ts')],
    react: [join(reactTypes, 'index.d.ts')], 'react/*': [join(reactTypes, '*.d.ts')],
  })
  const options = { ...base.config.compilerOptions, paths, composite: false, incremental: false, noEmit: false, sourceMap: false, declarationMap: false,
    declaration: true, jsx: 'react-jsx', types: ['node', 'react'], typeRoots: [dirname(reactTypes), join(harness, 'node_modules/@types')], ignoreDeprecations: '6.0' }
  delete options.rootDir; delete options.outDir; delete options.tsBuildInfoFile
  const faceFiles = {}
  for (const face of ['host', 'client']) {
    const config = ts.readConfigFile(join(root, `tsconfig.${face}.json`), ts.sys.readFile).config
    faceFiles[face] = [...new Set([...config.files, ...(face === 'host' ? ['src/tool-policy.ts'] : [])])]
    writeFileSync(join(pkg, `tsconfig.${face}.json`), JSON.stringify({ compilerOptions: options, files: faceFiles[face] }))
  }
  writeFileSync(join(protocol, 'tsconfig.json'), JSON.stringify({ compilerOptions: options, files: ['src/index.ts'] }))
  writeFileSync(join(stage, 'tsconfig.host.json'), JSON.stringify({ compilerOptions: options, files: [], references: [{ path: join(pkg, 'tsconfig.host.json') }, { path: join(protocol, 'tsconfig.json') }] }))
  const artifacts = new WorkspaceTypertGenerator(stage, { checkDiagnostics: false }).generate([manifest.name], ['host'])
  const host = artifacts.find(row => row.face === 'host' && row.package === manifest.name)
  if (!host?.remote || !/mode:\s*['"]stream['"]/.test(host.remote.js) || !/method:\s*['"]catalog['"]/.test(host.remote.js)) throw new Error(`Generator did not produce expected contracts: ${JSON.stringify(artifacts.map(row => ({ package: row.package, face: row.face, remote: row.remote?.js })))}`)
  for (const [name, text] of [['typert.host.js', host.js], ['typert.host.d.ts', host.dts], ['typert.remote-client.js', host.remote.js], ['typert.remote-client.d.ts', host.remote.dts]]) writeFileSync(join(pkg, 'lib', name), text)
  for (const face of ['host', 'client']) {
    const parsed = ts.parseJsonConfigFileContent({ compilerOptions: options, files: faceFiles[face] }, ts.sys, pkg)
    const program = ts.createProgram(parsed.fileNames, parsed.options)
    const diagnostics = ts.getPreEmitDiagnostics(program)
    const local = diagnostics.filter(row => !row.file || row.file.fileName.startsWith(pkg + sep))
    if (local.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(local, { getCanonicalFileName: n => n, getCurrentDirectory: () => pkg, getNewLine: () => '\n' }))
    console.log(`${face}: zero local diagnostics; ${diagnostics.length - local.length} checkout dependency diagnostics excluded`)
    for (const source of program.getSourceFiles()) {
      if (source.isDeclarationFile || !source.fileName.startsWith(join(pkg, 'src') + sep)) continue
      const stem = relative(join(pkg, 'src'), source.fileName).replace(/\.(?:tsx?|mts|cts)$/, '')
      const result = program.emit(source, (name, text, _bom, _error, sources) => {
        if (!sources?.length || sources.some(row => !row.fileName.startsWith(join(pkg, 'src') + sep))) throw new Error('Refused nonlocal declaration emit')
        const extension = name.endsWith('.d.ts') ? '.d.ts' : name.endsWith('.js') ? '.js' : undefined
        if (!extension) throw new Error(`Unexpected emitted artifact: ${name}`)
        const target = resolve(pkg, 'lib/types', stem + extension)
        if (!target.startsWith(join(pkg, 'lib/types') + sep)) throw new Error('Refused escaping emit path')
        mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, text)
      })
      if (result.emitSkipped || result.diagnostics.length) throw new Error(`Emit failed: ${source.fileName}`)
    }
  }
  const production = new Set([...Object.keys(manifest.dependencies ?? {}), ...Object.keys(manifest.peerDependencies ?? {}), ...Object.keys(manifest.optionalDependencies ?? {})])
  const prod = id => [...production].some(name => id === name || id.startsWith(name + '/'))
  const common = { config: false, workspace: false, cwd: pkg, outDir: join(pkg, 'lib'), target: 'es2024', fixedExtension: false, dts: false, clean: false, tsconfig: false }
  await build({ ...common, entry: { index: join(pkg, 'lib/types/index.js') }, format: 'esm', platform: 'node', deps: { neverBundle: prod, alwaysBundle: id => !isBuiltin(id) && !prod(id) } })
  const external = new Set(['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', '@deepseek-ai/cordis', '@deepseek-ai/dsh-client-ui-primitives', '@deepseek-ai/dsh-client-store'])
  const clientPlugin = {
    name: 'team-presets-client-surface',
    resolveId(id, importer) {
      if (external.has(id)) return { id, external: true }
      if (id === manifest.name + '/remote') return join(pkg, 'lib/typert.remote-client.js')
      if (id === 'zod') return scopedRequire.resolve('zod').replace(/index\.cjs$/, 'index.js')
      if (id.endsWith('.module.css') && importer) return '\0team-css:' + resolve(dirname(importer).replace(join(pkg, 'lib/types'), join(pkg, 'src')), id) + '.mjs'
      if (id.startsWith('@deepseek-ai/')) throw new Error(`Undeclared Client value import: ${id}`)
    },
    load(id) {
      if (!id.startsWith('\0team-css:')) return
      const path = id.slice('\0team-css:'.length, -4)
      this.addWatchFile(path)
      const css = transform({ filename: relative(pkg, path), code: readFileSync(path), cssModules: { pattern: '[hash]_[local]' }, minify: true })
      const classes = Object.fromEntries(Object.entries(css.exports ?? {}).map(([name, value]) => [name, value.name]))
      const key = manifest.name + ':' + relative(join(pkg, 'src'), path)
      return `const key=${JSON.stringify(key)};if(typeof document!=='undefined'&&!document.querySelector('style[data-team-presets-style="'+key+'"]')){const style=document.createElement('style');style.dataset.teamPresetsStyle=key;style.textContent=${JSON.stringify(css.code.toString())};document.head.appendChild(style);}export default ${JSON.stringify(classes)};`
    },
  }
  await build({ ...common, entry: { client: join(pkg, 'lib/types/client/index.js') }, format: 'cjs', platform: 'browser', deps: { neverBundle: id => external.has(id), alwaysBundle: id => !external.has(id) }, define: { 'process.env.NODE_ENV': '"production"' }, plugins: [clientPlugin], outputOptions: { entryFileNames: 'client.js', chunkFileNames: 'client.[name].js', banner: `window.__ModuleLoader__.load({id:${JSON.stringify(manifest.name)},factory:(require)=>{`, intro: 'var module = { exports: {} }; var exports = module.exports;', footer: 'return module.exports; }});' } })
  // Publish only verified stage artifacts, preserving unrelated existing files.
  const outputs = []
  const visit = dir => { for (const row of readdirSync(dir, { withFileTypes: true })) { const path = join(dir, row.name); if (row.isDirectory()) visit(path); else if (!/\.(?:map|tsbuildinfo)$/.test(path)) outputs.push(path) } }
  visit(join(pkg, 'lib'))
  for (const path of outputs) {
    const destination = resolve(root, 'lib', relative(join(pkg, 'lib'), path))
    if (!destination.startsWith(join(root, 'lib') + sep)) throw new Error('Refused escaping artifact destination')
    mkdirSync(dirname(destination), { recursive: true })
    const bytes = readFileSync(path)
    let text
    if (path.endsWith('.js')) {
      // Build-path comments would publish the machine that produced them.
      text = bytes.toString('utf8').replace(/^\s*\/\/#region .*$/gm, '').replace(/^\s*\/\/#endregion.*$/gm, '')
    } else if (path.endsWith('.d.ts')) {
      // The declaration emitter leaves a trailing space after a union split over
      // lines. Trailing whitespace is never meaningful in a declaration, so it is
      // normalized here rather than hand-edited into a regenerated file.
      text = bytes.toString('utf8').replace(/[ \t]+$/gm, '')
    }
    writeFileSync(destination, text ?? bytes)
  }
  console.log(`Built ${outputs.length} local artifacts; Host SHA256 ${createHash('sha256').update(readFileSync(join(root, 'lib/index.js'))).digest('hex')}`)
} finally {
  // Verify the exact mkdtemp root before deleting only our isolated workspace.
  const checked = realpathSync(stage)
  if (checked !== stage || !checked.startsWith(join(realpathSync(tmpdir()), 'team-presets-build-'))) throw new Error('Refused unsafe staging cleanup')
  rmSync(checked, { recursive: true, force: true })
}

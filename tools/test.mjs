#!/usr/bin/env node
/** Run this repository's tests against an explicitly selected Harness checkout. */
import { createRequire } from 'node:module'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { existsSync } from 'node:fs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const checkout = process.env.DSH_CHECKOUT
if (!checkout || !existsSync(join(checkout, 'tsconfig.base.json'))) {
  throw new Error('Set DSH_CHECKOUT to a compatible, dependency-installed DeepSeek Harness checkout.')
}
const harness = resolve(checkout)
const require = createRequire(join(harness, 'package.json'))
const ts = require('typescript')
const { startVitest } = await import(pathToFileURL(require.resolve('vitest/node')).href)
const config = ts.readConfigFile(join(harness, 'tsconfig.base.json'), ts.sys.readFile)
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'))
const aliases = Object.entries(config.config.compilerOptions.paths).map(([name, paths]) => {
  const replacement = resolve(harness, paths[0])
  return name.includes('*')
    ? { find: new RegExp(`^${name.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace('*', '(.*)')}$`), replacement: replacement.replace('*', '$1') }
    : { find: name, replacement }
}).sort((a, b) => String(b.find).length - String(a.find).length)
const decorators = {
  name: 'team-presets-standard-decorators', enforce: 'pre',
  transform(code, id) {
    if (!/\.[cm]?tsx?$/.test(id) || !/^\s*@[A-Za-z_$][\w$]*/m.test(code)) return
    const result = ts.transpileModule(code, { fileName: id, compilerOptions: {
      target: ts.ScriptTarget.ES2024, module: ts.ModuleKind.ESNext,
      jsx: id.endsWith('x') ? ts.JsxEmit.ReactJSX : undefined, sourceMap: true,
    } })
    return { code: result.outputText.replace(/\n?\/\/# sourceMappingURL=.*$/m, ''), map: result.sourceMapText }
  },
}
const dependencies = {
  name: 'team-presets-checkout-dependencies', enforce: 'pre',
  resolveId(id) {
    if (id.startsWith('.') || id.startsWith('/') || id.startsWith('\0') || id.startsWith('@deepseek-ai/')) return
    if (id === 'vitest' || id.startsWith('vitest/')) return
    try { return require.resolve(id) } catch { return undefined }
  },
}
const filters = process.argv.slice(2)
const vitest = await startVitest('test', filters, {
  root, config: false, watch: false,
  include: ['tests/**/*.spec.{ts,tsx}'], pool: 'forks', maxWorkers: 4,
  execArgv: process.allowedNodeEnvironmentFlags.has('--webstorage') ? ['--no-webstorage'] : [],
}, {
  oxc: { tsconfig: false },
  resolve: { alias: aliases },
  plugins: [decorators, dependencies],
})
if (!vitest) process.exitCode = 1
else await vitest.close()

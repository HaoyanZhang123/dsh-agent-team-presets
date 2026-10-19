/**
 * Child process for the crash-recovery regression.
 *
 * It imports the BUILT store, performs one Team Skill mutation against the
 * supplied root, and reports progress on stdout so the parent can SIGKILL it at
 * an unpredictable point inside the transaction.
 */
import { TeamSkillStore } from '../../lib/types/team-skills/store.js'

const [, , root, mode] = process.argv
if (root === undefined || mode === undefined) throw new Error('usage: skill-crash-writer.mjs <root> <install|remove>')

const package_ = {
  name: 'crash',
  description: 'crash',
  files: [{ path: 'SKILL.md', bytes: new TextEncoder().encode('---\nname: crash\ndescription: crash\n---\n\nBody\n') }],
  totalBytes: 1,
}
const store = new TeamSkillStore(root)
await store.open()

/** Wait for one byte so the parent owns the timing. */
const go = () => new Promise((resolve) => { process.stdin.once('data', resolve) })

if (mode === 'install') {
  process.stdout.write('ready\n')
  await go()
  await store.install(package_, { id: 'custom:crash', origin: 'custom', version: '1' })
  process.stdout.write('done\n')
  await new Promise(() => {})
} else {
  await store.install(package_, { id: 'custom:crash', origin: 'custom', version: '1' })
  process.stdout.write('ready\n')
  await go()
  await store.remove('custom:crash')
  process.stdout.write('done\n')
  await new Promise(() => {})
}

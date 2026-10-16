/** The Harness checkout these tests run against, as `tools/*.mjs` already require. */

import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * Resolve the checkout named by `DSH_CHECKOUT`.
 *
 * Every project command already refuses to run without it, so a missing or
 * implausible value is an error rather than a fallback: silently testing
 * against some other checkout would make the evidence meaningless.
 * @returns the absolute checkout root.
 */
export function checkoutRoot(): string {
  const checkout = process.env['DSH_CHECKOUT']
  if (checkout === undefined || checkout === '') {
    throw new Error('Set DSH_CHECKOUT to the Harness checkout under test.')
  }
  const root = resolve(checkout)
  if (!existsSync(join(root, 'tsconfig.base.json'))) {
    throw new Error(`DSH_CHECKOUT (${root}) is not a dependency-installed Harness checkout.`)
  }
  return root
}

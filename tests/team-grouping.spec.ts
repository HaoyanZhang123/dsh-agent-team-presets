import { describe, expect, it } from 'vitest'
import { matchesCategoryFilter } from '../src/client/team-grouping.ts'
import type { TeamCategoryAssignment, TeamPreset } from '../src/types.ts'

const team = (id: string): TeamPreset => ({ id } as TeamPreset)
const memberships: readonly TeamCategoryAssignment[] = [
  { teamId: 'builtin-lightweight', categoryId: 'cat-a' },
  { teamId: 'custom-team', categoryId: 'cat-b' },
]

describe('composer second-level category filter', () => {
  it('applies the shipped series and the user categories as one control', () => {
    expect(matchesCategoryFilter(team('builtin-lightweight'), 'all', '', memberships)).toBe(true)
    expect(matchesCategoryFilter(team('builtin-lightweight'), 'classic-development', '', memberships)).toBe(true)
    expect(matchesCategoryFilter(team('builtin-discovery'), 'classic-development', '', memberships)).toBe(false)
    expect(matchesCategoryFilter(team('builtin-discovery'), 'work-modes', '', memberships)).toBe(true)
    expect(matchesCategoryFilter(team('custom-team'), 'classic-development', '', memberships)).toBe(false)
  })

  it('asks membership when a user category is selected and ANDs both dimensions', () => {
    expect(matchesCategoryFilter(team('builtin-lightweight'), 'all', 'cat-a', memberships)).toBe(true)
    expect(matchesCategoryFilter(team('builtin-lightweight'), 'all', 'cat-b', memberships)).toBe(false)
    // The settings controls clear the dimension that no longer applies; if a
    // caller passes both, the answer is their intersection, not precedence.
    expect(matchesCategoryFilter(team('builtin-lightweight'), 'classic-development', 'cat-a', memberships)).toBe(true)
    expect(matchesCategoryFilter(team('builtin-lightweight'), 'work-modes', 'cat-a', memberships)).toBe(false)
    expect(matchesCategoryFilter(team('builtin-discovery'), 'work-modes', 'cat-a', memberships)).toBe(false)
  })
})

import { describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { TeamSkillsController } from '../src/client/team-skills-controller.ts'

describe('TeamSkillsController', () => {
  it('opens the import folder directly without action: reveal', async () => {
    const ctx = new Context()
    ctx.provide('remote')
    ctx.provide('remote.teamSkills')

    const openWorkspacePath = vi.fn().mockResolvedValue({ ok: true, value: { opened: true } })
    const canOpenWorkspacePath = vi.fn().mockResolvedValue({ ok: true, value: true })
    const prepareImportFolder = vi.fn().mockResolvedValue({
      ok: true,
      value: { ok: true, root: '/mock/team-skills', path: '/mock/team-skills/inbox' },
    })

    // Mock remote objects
    ;(ctx as unknown as { remote: Record<string, unknown> }).remote = {
      session: {
        canOpenWorkspacePath,
        openWorkspacePath,
      },
      teamSkills: {
        prepareImportFolder,
        listLibrary: vi.fn().mockResolvedValue({ ok: true, value: { ok: true, assets: [], roster: [], official: [] } }),
      },
    }

    const controller = new TeamSkillsController(ctx)
    // Wait for async capability detection and refresh
    await Promise.resolve()
    await Promise.resolve()

    await controller.openScanFolder()

    // Must call openWorkspacePath with path and WITHOUT action: 'reveal'
    expect(openWorkspacePath).toHaveBeenCalledWith({
      path: '/mock/team-skills/inbox',
    })
    expect(controller.getSnapshot().scanFolderNotice).toBe('opened')
    expect(controller.getSnapshot().scanFolderPath).toBe('/mock/team-skills/inbox')
  })

  it('calls restoreBuiltinBindings on the remote service and publishes the library', async () => {
    const ctx = new Context()
    ctx.provide('remote')
    ctx.provide('remote.teamSkills')

    const restoreBuiltinBindings = vi.fn().mockResolvedValue({
      ok: true,
      value: { root: '/mock', assets: [], teams: [], official: [] },
    })

    ;(ctx as unknown as { remote: Record<string, unknown> }).remote = {
      session: {},
      teamSkills: {
        restoreBuiltinBindings,
        library: vi.fn().mockResolvedValue({ ok: true, value: { root: '/mock', assets: [], teams: [], official: [] } }),
      },
    }

    const controller = new TeamSkillsController(ctx)
    await Promise.resolve()

    await controller.restoreBuiltinBindings(['builtin-fullstack'])
    expect(restoreBuiltinBindings).toHaveBeenCalledWith(['builtin-fullstack'])
  })

  it('returns delete outcome with blockers when delete is refused by the host', async () => {
    const ctx = new Context()
    ctx.provide('remote')
    ctx.provide('remote.teamSkills')

    const deleteAsset = vi.fn().mockResolvedValue({
      ok: true,
      value: {
        ok: false,
        blockers: [{ kind: 'binding', detail: '标准研发团队 → executor' }],
        warnings: [],
      },
    })

    ;(ctx as unknown as { remote: Record<string, unknown> }).remote = {
      session: {},
      teamSkills: {
        deleteAsset,
        library: vi.fn().mockResolvedValue({ ok: true, value: { root: '/mock', assets: [], teams: [], official: [] } }),
      },
    }

    const controller = new TeamSkillsController(ctx)
    await Promise.resolve()

    const outcome = await controller.remove('builtin:git-release-hygiene')
    expect(deleteAsset).toHaveBeenCalledWith('builtin:git-release-hygiene')
    expect(outcome).toEqual({
      ok: false,
      blockers: [{ kind: 'binding', detail: '标准研发团队 → executor' }],
      warnings: [],
    })
    expect(controller.getSnapshot().failed).toBe(true)
    expect(controller.getSnapshot().message).toContain('binding: 标准研发团队 → executor')
  })
})

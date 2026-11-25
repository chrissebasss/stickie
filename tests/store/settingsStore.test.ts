import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { promises as fs } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  SettingsStore,
  DEFAULT_SETTINGS
} from '@main/store/settingsStore'

describe('SettingsStore', () => {
  let testDir: string
  let store: SettingsStore

  beforeEach(async () => {
    testDir = await fs.mkdtemp(join(tmpdir(), 'stickie-test-settings-'))
    store = new SettingsStore(testDir)
  })

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true })
  })

  it('loads default settings when file does not exist', async () => {
    const settings = await store.load()
    expect(settings).toEqual(DEFAULT_SETTINGS)
    expect(settings.schemaVersion).toBe(1)
    expect(settings.theme).toBe('system')
    expect(settings.reopenNotesOnLaunch).toBe(false)
    expect(settings.openNoteIds).toEqual([])
  })

  it('saves and reloads modified settings', async () => {
    await store.update({
      theme: 'dark',
      reopenNotesOnLaunch: true,
      openNoteIds: ['id-1', 'id-2']
    })

    const newStore = new SettingsStore(testDir)
    const loaded = await newStore.load()
    expect(loaded.theme).toBe('dark')
    expect(loaded.reopenNotesOnLaunch).toBe(true)
    expect(loaded.openNoteIds).toEqual(['id-1', 'id-2'])
  })

  it('recovers from backup when settings.json is corrupt', async () => {
    await store.update({ theme: 'light' })
    await store.update({ theme: 'dark' })

    const settingsFile = join(testDir, 'settings.json')
    await fs.writeFile(settingsFile, '{ broken json ...')

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const newStore = new SettingsStore(testDir)
      const loaded = await newStore.load()
      expect(loaded.theme).toBe('light')
    } finally {
      warnSpy.mockRestore()
      errorSpy.mockRestore()
    }
  })

  it('serializes concurrent updates and flushes cleanly', async () => {
    await Promise.all([
      store.update({ openNoteIds: ['n1'] }),
      store.update({ openNoteIds: ['n1', 'n2'] }),
      store.update({ reopenNotesOnLaunch: true })
    ])
    await store.flush()

    const reloaded = await new SettingsStore(testDir).load()
    expect(reloaded.openNoteIds).toEqual(['n1', 'n2'])
    expect(reloaded.reopenNotesOnLaunch).toBe(true)
  })

  it('flush waits for settings updates queued while the flush is running', async () => {
    await store.save(DEFAULT_SETTINGS)

    const realOpen = fs.open
    const gates: Array<() => void> = []
    let gating = true
    const openSpy = vi.spyOn(fs, 'open')
    openSpy.mockImplementation(((...args: Parameters<typeof fs.open>) =>
      gating && String(args[0]).endsWith('.tmp')
        ? new Promise<void>((resolve) => gates.push(resolve)).then(() => realOpen(...args))
        : realOpen(...args)) as typeof fs.open)

    const waitForGate = async (count: number): Promise<void> => {
      const deadline = Date.now() + 2000
      while (gates.length < count && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 5))
      }
      expect(gates.length).toBeGreaterThanOrEqual(count)
    }

    const pending: Array<Promise<unknown>> = []
    try {
      const first = store.save({ ...DEFAULT_SETTINGS, theme: 'light' })
      pending.push(first)
      await waitForGate(1)
      const flushing = store.flush()
      pending.push(flushing)
      const updatePromise = store.update({ theme: 'dark' })
      pending.push(updatePromise)

      gates.shift()!()
      await waitForGate(1)

      let flushDone = false
      void flushing.then(() => { flushDone = true })
      await new Promise((resolve) => setTimeout(resolve, 20))
      expect(flushDone).toBe(false)

      gates.shift()!()
      await Promise.all(pending)
    } finally {
      gating = false
      gates.splice(0).forEach((release) => release())
      await Promise.allSettled(pending)
      openSpy.mockRestore()
    }

    const raw = await fs.readFile(join(testDir, 'settings.json'), 'utf-8')
    expect((JSON.parse(raw) as { theme: string }).theme).toBe('dark')
  })
})


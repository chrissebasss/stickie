import { describe, it, expect, beforeEach, afterEach } from 'vitest'
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

    const newStore = new SettingsStore(testDir)
    const loaded = await newStore.load()
    expect(loaded.theme).toBe('light')
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
})


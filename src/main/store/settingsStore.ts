import { join } from 'path'
import type { Settings } from '../../shared/types'
import { writeAtomic, readJsonWithBackup } from './atomicFile'

export const CURRENT_SETTINGS_SCHEMA = 1

export const DEFAULT_SETTINGS: Settings = {
  schemaVersion: CURRENT_SETTINGS_SCHEMA,
  theme: 'system',
  language: 'system',
  font: 'system',
  reopenNotesOnLaunch: false,
  openNoteIds: [],
  alwaysOnTop: false,
  launchAtLogin: false
}

export class SettingsStore {
  private baseDir: string
  private cachedSettings: Settings | null = null
  private writeQueue: Promise<void> = Promise.resolve()

  constructor(baseDir: string) {
    this.baseDir = baseDir
  }

  private get settingsFilePath(): string {
    return join(this.baseDir, 'settings.json')
  }

  public async load(): Promise<Settings> {
    if (this.cachedSettings) {
      return { ...this.cachedSettings }
    }

    const result = await readJsonWithBackup<Settings>(this.settingsFilePath)
    if (!result || !result.data) {
      this.cachedSettings = { ...DEFAULT_SETTINGS }
      await this.save(this.cachedSettings)
      return { ...this.cachedSettings }
    }

    const migrated = this.migrate(result.data)
    this.cachedSettings = migrated
    return { ...this.cachedSettings }
  }

  public async save(settings: Settings): Promise<void> {
    this.cachedSettings = { ...settings }
    const snapshot = { ...settings }
    this.writeQueue = this.writeQueue.then(
      () => writeAtomic(this.settingsFilePath, JSON.stringify(snapshot, null, 2)),
      () => writeAtomic(this.settingsFilePath, JSON.stringify(snapshot, null, 2))
    )
    await this.writeQueue
  }

  public async update(patch: Partial<Settings>): Promise<Settings> {
    let updated: Settings = this.cachedSettings
      ? { ...this.cachedSettings }
      : { ...DEFAULT_SETTINGS }

    // Read the current settings inside the queue so concurrent updates do not
    // all build on the same stale snapshot.
    const run = async () => {
      let current = this.cachedSettings
      if (!current) {
        const stored = await readJsonWithBackup<Settings>(this.settingsFilePath)
        current = stored?.data ? this.migrate(stored.data) : { ...DEFAULT_SETTINGS }
      }
      updated = { ...current, ...patch, schemaVersion: CURRENT_SETTINGS_SCHEMA }
      this.cachedSettings = { ...updated }
      const snapshot = { ...updated }
      await writeAtomic(this.settingsFilePath, JSON.stringify(snapshot, null, 2))
    }
    const result = this.writeQueue.then(run, run)
    this.writeQueue = result.then(() => {}, () => {})
    await result
    return { ...updated }
  }

  public async flush(): Promise<void> {
    // Re-check the queue: a write can be appended while an earlier one is awaited.
    let queued = this.writeQueue
    while (true) {
      await queued
      if (this.writeQueue === queued) return
      queued = this.writeQueue
    }
  }

  public getCached(): Settings {
    return this.cachedSettings ? { ...this.cachedSettings } : { ...DEFAULT_SETTINGS }
  }

  private migrate(data: Partial<Settings>): Settings {
    const version = data.schemaVersion || 0
    let currentData = { ...DEFAULT_SETTINGS, ...data }

    if (version < 1) {
      // Future schema migration hooks can be added here
      currentData.schemaVersion = 1
    }

    return currentData as Settings
  }
}


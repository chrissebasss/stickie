import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  writeAtomic,
  readJsonWithBackup,
  removeFileAndBackup
} from '@main/store/atomicFile'

describe('atomicFile', () => {
  let testDir: string

  beforeEach(async () => {
    testDir = await fs.mkdtemp(join(tmpdir(), 'stickie-test-atomic-'))
  })

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true })
  })

  it('writes file atomically and creates no leftover tmp file', async () => {
    const targetFile = join(testDir, 'test.json')
    const content = JSON.stringify({ hello: 'world' })

    await writeAtomic(targetFile, content)

    const read = await fs.readFile(targetFile, 'utf-8')
    expect(read).toBe(content)

    // Check .tmp does not exist
    await expect(fs.access(`${targetFile}.tmp`)).rejects.toThrow()
  })

  it('creates a .bak file when overwriting existing file', async () => {
    const targetFile = join(testDir, 'note.json')
    await writeAtomic(targetFile, JSON.stringify({ v: 1 }))
    await writeAtomic(targetFile, JSON.stringify({ v: 2 }))

    const current = await fs.readFile(targetFile, 'utf-8')
    expect(JSON.parse(current)).toEqual({ v: 2 })

    const backup = await fs.readFile(`${targetFile}.bak`, 'utf-8')
    expect(JSON.parse(backup)).toEqual({ v: 1 })
  })

  it('recovers from .bak when primary file is corrupt', async () => {
    const targetFile = join(testDir, 'corrupt.json')
    await writeAtomic(targetFile, JSON.stringify({ valid: 'data' }))
    await writeAtomic(targetFile, JSON.stringify({ valid: 'updated' }))

    // Simulate corruption of primary file (e.g. power cut mid-write before rename)
    await fs.writeFile(targetFile, '{ truncated json: ')

    const result = await readJsonWithBackup<{ valid: string }>(targetFile)
    expect(result).not.toBeNull()
    expect(result?.recoveredFromBackup).toBe(true)
    expect(result?.data).toEqual({ valid: 'data' })
  })

  it('returns null if both primary and backup do not exist', async () => {
    const targetFile = join(testDir, 'nonexistent.json')
    const result = await readJsonWithBackup(targetFile)
    expect(result).toBeNull()
  })

  it('removes target, tmp, and bak files cleanly', async () => {
    const targetFile = join(testDir, 'to-delete.json')
    await writeAtomic(targetFile, JSON.stringify({ a: 1 }))
    await writeAtomic(targetFile, JSON.stringify({ a: 2 }))
    await fs.writeFile(`${targetFile}.tmp`, 'tmp content')

    await removeFileAndBackup(targetFile)

    await expect(fs.access(targetFile)).rejects.toThrow()
    await expect(fs.access(`${targetFile}.bak`)).rejects.toThrow()
    await expect(fs.access(`${targetFile}.tmp`)).rejects.toThrow()
  })
})


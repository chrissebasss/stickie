import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  saveAssetBuffer,
  saveAssetFile,
  getAssetDiskPath,
  cleanOrphanAssets,
  extractReferencedAssetFiles
} from '@main/store/assets'
import type { JSONContent } from '@tiptap/vue-3'

describe('assets store', () => {
  let testDir: string

  beforeEach(async () => {
    testDir = await fs.mkdtemp(join(tmpdir(), 'stickie-test-assets-'))
  })

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true })
  })

  it('saves asset buffer and returns stickie-asset URL', async () => {
    const buffer = Buffer.from('fake-image-bytes')
    const url = await saveAssetBuffer(testDir, 'note-123', buffer, 'png')

    expect(url.startsWith('stickie-asset://note-123/')).toBe(true)
    expect(url.endsWith('.png')).toBe(true)

    const filename = url.replace('stickie-asset://note-123/', '')
    const diskPath = getAssetDiskPath(testDir, 'note-123', filename)
    expect(diskPath).not.toBeNull()

    const read = await fs.readFile(diskPath!, 'utf-8')
    expect(read).toBe('fake-image-bytes')
  })

  it('cleans up orphan assets that are no longer referenced in note JSON', async () => {
    const noteId = 'note-cleanup'
    const buf1 = Buffer.from('img1')
    const buf2 = Buffer.from('img2')

    const url1 = await saveAssetBuffer(testDir, noteId, buf1, 'png')
    const url2 = await saveAssetBuffer(testDir, noteId, buf2, 'png')

    const file1 = url1.replace(`stickie-asset://${noteId}/`, '')
    const file2 = url2.replace(`stickie-asset://${noteId}/`, '')

    // Only file1 is kept
    await cleanOrphanAssets(testDir, noteId, new Set([file1]))

    const path1 = getAssetDiskPath(testDir, noteId, file1)
    const path2 = getAssetDiskPath(testDir, noteId, file2)

    await expect(fs.access(path1!)).resolves.toBeUndefined()
    await expect(fs.access(path2!)).rejects.toThrow()
  })

  it('extracts referenced asset files from TipTap document', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Some text' }]
        },
        {
          type: 'image',
          attrs: { src: 'stickie-asset://note-xyz/abc12345.png' }
        },
        {
          type: 'image',
          attrs: { src: 'data:image/png;base64,...' } // Should ignore non-asset scheme
        }
      ]
    }

    const referenced = extractReferencedAssetFiles(doc, 'note-xyz')
    expect(referenced.size).toBe(1)
    expect(referenced.has('abc12345.png')).toBe(true)
  })

  it('prevents path traversal attacks in getAssetDiskPath', () => {
    expect(getAssetDiskPath(testDir, 'note-1', '../../etc/passwd')).toBeNull()
    expect(getAssetDiskPath(testDir, '..', 'image.png')).toBeNull()
  })
})


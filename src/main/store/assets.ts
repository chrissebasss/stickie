import { promises as fs } from 'fs'
import { join, extname, basename, normalize } from 'path'
import { createHash } from 'crypto'
import type { JSONContent } from '../../shared/types'

export const MAX_IMAGE_BYTES = 25 * 1024 * 1024 // 25 MB limit

export function getAssetDirectory(baseDir: string, noteId: string): string {
  return join(baseDir, 'assets', noteId)
}

/**
 * Validates noteId and filename to prevent path traversal.
 */
export function getAssetDiskPath(baseDir: string, noteId: string, filename: string): string | null {
  if (!noteId || !filename) return null
  if (noteId.includes('..') || noteId.includes('/') || noteId.includes('\\')) return null
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) return null

  const dir = getAssetDirectory(baseDir, noteId)
  const fullPath = normalize(join(dir, filename))
  if (!fullPath.startsWith(normalize(dir))) {
    return null
  }
  return fullPath
}

export async function saveAssetBuffer(
  baseDir: string,
  noteId: string,
  buffer: Buffer,
  rawExt = 'png'
): Promise<string> {
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error(`Image size exceeds 25 MB limit (${(buffer.length / (1024 * 1024)).toFixed(1)} MB)`)
  }

  const hash = createHash('sha1').update(buffer).digest('hex')
  let ext = rawExt.replace(/^\./, '').toLowerCase()
  if (!ext) ext = 'png'

  const filename = `${hash}.${ext}`
  const noteDir = getAssetDirectory(baseDir, noteId)
  await fs.mkdir(noteDir, { recursive: true })

  const targetPath = join(noteDir, filename)
  await fs.writeFile(targetPath, buffer)

  return `stikly-asset://${noteId}/${filename}`
}

export async function saveAssetFile(
  baseDir: string,
  noteId: string,
  sourcePath: string
): Promise<string> {
  const stat = await fs.stat(sourcePath)
  if (stat.size > MAX_IMAGE_BYTES) {
    throw new Error(`Image file exceeds 25 MB limit`)
  }

  const buffer = await fs.readFile(sourcePath)
  const ext = extname(sourcePath).replace('.', '') || 'png'
  return saveAssetBuffer(baseDir, noteId, buffer, ext)
}

/**
 * Recursively inspects TipTap document to find all images using stikly-asset://<noteId>/<filename>.
 */
export function extractReferencedAssetFiles(
  node: JSONContent,
  noteId: string,
  result = new Set<string>()
): Set<string> {
  const prefix = `stikly-asset://${noteId}/`
  if (node.type === 'image' && node.attrs && typeof node.attrs.src === 'string') {
    const src = node.attrs.src
    if (src.startsWith(prefix)) {
      const filename = src.slice(prefix.length)
      if (filename) {
        result.add(filename)
      }
    }
  }

  if (node.content && Array.isArray(node.content)) {
    for (const child of node.content) {
      extractReferencedAssetFiles(child, noteId, result)
    }
  }

  return result
}

/**
 * Removes assets in assets/<noteId>/ that are not in the referenced set.
 */
export async function cleanOrphanAssets(
  baseDir: string,
  noteId: string,
  referenced: Set<string>
): Promise<void> {
  const noteDir = getAssetDirectory(baseDir, noteId)
  try {
    const entries = await fs.readdir(noteDir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isFile() && !referenced.has(entry.name)) {
        await fs.unlink(join(noteDir, entry.name))
      }
    }
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn(`[assets] Error cleaning orphan assets for note ${noteId}:`, err)
    }
  }
}

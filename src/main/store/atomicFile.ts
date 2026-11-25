import { promises as fs } from 'fs'
import { dirname } from 'path'

/**
 * Writes data atomically by writing to a temporary file (.tmp),
 * flushing with fsync, creating a backup (.bak) of the target if it exists,
 * and atomically renaming the temporary file over the target.
 */
export async function writeAtomic(filePath: string, data: string | Buffer): Promise<void> {
  const tmpPath = `${filePath}.tmp`
  const bakPath = `${filePath}.bak`

  // Ensure parent directory exists
  await fs.mkdir(dirname(filePath), { recursive: true })

  // Write to temporary file with explicit fsync
  const fileHandle = await fs.open(tmpPath, 'w')
  try {
    await fileHandle.writeFile(data)
    await fileHandle.sync()
  } finally {
    await fileHandle.close()
  }

  // If primary file exists, rotate it to .bak
  try {
    await fs.copyFile(filePath, bakPath)
    const bakHandle = await fs.open(bakPath, 'r')
    try {
      await bakHandle.sync()
    } finally {
      await bakHandle.close()
    }
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn(`[atomicFile] Warning while creating backup for ${filePath}:`, err)
    }
  }

  // Atomically rename .tmp over target
  await fs.rename(tmpPath, filePath)

  // Flush the directory entry too; on Windows opening a directory is not supported.
  if (process.platform !== 'win32') {
    const dirHandle = await fs.open(dirname(filePath), 'r')
    try {
      await dirHandle.sync()
    } finally {
      await dirHandle.close()
    }
  }
}

/**
 * Reads a JSON file with automatic fallback to .bak on parse or read corruption.
 */
export async function readJsonWithBackup<T>(
  filePath: string
): Promise<{ data: T; recoveredFromBackup: boolean } | null> {
  const bakPath = `${filePath}.bak`

  // 1. Try reading primary file
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    const parsed = JSON.parse(raw) as T
    return { data: parsed, recoveredFromBackup: false }
  } catch (primaryErr: unknown) {
    const errCode = (primaryErr as NodeJS.ErrnoException).code
    if (errCode !== 'ENOENT') {
      console.warn(
        `[atomicFile] Primary file read/parse failed for ${filePath}, attempting fallback to .bak:`,
        primaryErr
      )
    }
  }

  // 2. Fallback to .bak
  try {
    const rawBak = await fs.readFile(bakPath, 'utf-8')
    const parsedBak = JSON.parse(rawBak) as T
    console.warn(`[atomicFile] Successfully recovered data from backup: ${bakPath}`)
    return { data: parsedBak, recoveredFromBackup: true }
  } catch (bakErr: unknown) {
    const errCode = (bakErr as NodeJS.ErrnoException).code
    if (errCode !== 'ENOENT') {
      console.error(`[atomicFile] Backup file read/parse failed for ${bakPath}:`, bakErr)
    }
  }

  return null
}

/**
 * Safely removes target file, along with its .bak and .tmp counterparts.
 */
export async function removeFileAndBackup(filePath: string): Promise<void> {
  const targets = [filePath, `${filePath}.bak`, `${filePath}.tmp`]
  for (const file of targets) {
    try {
      await fs.unlink(file)
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.warn(`[atomicFile] Could not delete ${file}:`, err)
      }
    }
  }
}


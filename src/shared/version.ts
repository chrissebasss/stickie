export interface UpdateCheckResult {
  currentVersion: string
  latestVersion: string
  hasUpdate: boolean
  releaseUrl: string
  error?: boolean
  manualOnly?: boolean
}

interface ParsedVersion {
  core: number[]
  pre: string[]
}

function parseVersion(value: string): ParsedVersion | null {
  const match = /^v?(\d+(?:\.\d+)*)(?:-([0-9A-Za-z.-]+))?/i.exec(value.trim())
  if (!match) return null
  return {
    core: match[1].split('.').map((n) => parseInt(n, 10) || 0),
    pre: match[2] ? match[2].split('.') : []
  }
}

export function isNewerVersion(remote: string, current: string): boolean {
  const r = parseVersion(remote)
  const c = parseVersion(current)
  if (!r || !c) return false

  const len = Math.max(r.core.length, c.core.length, 3)
  for (let i = 0; i < len; i++) {
    const rv = r.core[i] ?? 0
    const cv = c.core[i] ?? 0
    if (rv > cv) return true
    if (rv < cv) return false
  }

  if (r.pre.length === 0) return c.pre.length > 0
  if (c.pre.length === 0) return false

  for (let i = 0; i < Math.min(r.pre.length, c.pre.length); i++) {
    const rp = r.pre[i]
    const cp = c.pre[i]
    if (rp === cp) continue
    const rn = /^\d+$/.test(rp)
    const cn = /^\d+$/.test(cp)
    if (rn && cn) return Number(rp) > Number(cp)
    if (rn !== cn) return cn
    return rp > cp
  }
  return r.pre.length > c.pre.length
}

export function getLatestReleaseVersion(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const tag = (payload as { tag_name?: unknown }).tag_name
  if (typeof tag !== 'string' || !tag.trim()) return null
  return tag.trim()
}

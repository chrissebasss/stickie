export function normalizeSystemDateLocale(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  const cleaned = raw.split('.')[0].split('@')[0].replace(/_/g, '-')
  return /^[a-z]{2,3}(-[A-Za-z0-9]{2,4})*$/.test(cleaned) ? cleaned : undefined
}

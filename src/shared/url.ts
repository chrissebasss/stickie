const REPO_PATH = '/chrissebasss/stickie/'

export function isAllowedExternalUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return (
      url.protocol === 'https:' &&
      url.hostname === 'github.com' &&
      url.username === '' &&
      url.password === '' &&
      url.pathname.startsWith(REPO_PATH)
    )
  } catch {
    return false
  }
}

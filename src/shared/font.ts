import type { FontMode } from './types'

export const FONT_STACKS: Record<FontMode, string> = {
  system: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Noto Sans', sans-serif",
  sans: "'Inter', 'Segoe UI', 'SF Pro Text', 'Noto Sans', 'Liberation Sans', sans-serif",
  serif: "'Georgia', 'Noto Serif', 'Liberation Serif', 'Times New Roman', serif",
  mono: "'JetBrains Mono', 'Cascadia Mono', 'SF Mono', 'Fira Code', 'Liberation Mono', monospace"
}

export function getFontStack(font?: FontMode): string {
  return FONT_STACKS[font || 'system'] || FONT_STACKS.system
}

export function applyFont(font?: FontMode): void {
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--app-font', getFontStack(font))
  }
}

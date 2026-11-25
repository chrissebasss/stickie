import type { NoteColor, PresetColorId, ColorScheme } from './types'

export interface RGB {
  r: number
  g: number
  b: number
}

export const PRESET_COLORS: Record<
  PresetColorId,
  { light: { bg: string; barBg: string }; dark: { bg: string; barBg: string } }
> = {
  yellow: {
    light: { bg: '#fef08a', barBg: '#fde047' },
    dark: { bg: '#292213', barBg: '#3b311b' }
  },
  green: {
    light: { bg: '#bbf7d0', barBg: '#86efac' },
    dark: { bg: '#14261c', barBg: '#1e3829' }
  },
  blue: {
    light: { bg: '#bfdbfe', barBg: '#93c5fd' },
    dark: { bg: '#162232', barBg: '#203248' }
  },
  pink: {
    light: { bg: '#fbcfe8', barBg: '#f9a8d4' },
    dark: { bg: '#2b1724', barBg: '#3d2033' }
  }
}

export function parseHex(hex: string): RGB {
  let cleaned = hex.replace('#', '').trim()
  if (cleaned.length === 3) {
    cleaned = cleaned
      .split('')
      .map((c) => c + c)
      .join('')
  }
  const num = parseInt(cleaned, 16)
  if (isNaN(num)) {
    return { r: 254, g: 240, b: 138 } // default yellow fallback
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  }
}

export function rgbToHex({ r, g, b }: RGB): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * Calculates WCAG 2.0 relative luminance for an sRGB color.
 */
export function getRelativeLuminance(hex: string): number {
  const { r, g, b } = parseHex(hex)
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map((c) => {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

/**
 * Calculates contrast ratio between two colors (ranging from 1:1 to 21:1).
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getRelativeLuminance(hex1)
  const l2 = getRelativeLuminance(hex2)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Returns near-black (#111827) or white (#ffffff), whichever has higher contrast.
 */
export function pickTextColor(bgHex: string): string {
  const darkText = '#111827'
  const lightText = '#ffffff'
  const darkContrast = getContrastRatio(bgHex, darkText)
  const lightContrast = getContrastRatio(bgHex, lightText)
  return darkContrast >= lightContrast ? darkText : lightText
}

/**
 * Derives a slightly darker (or lighter for dark background) shade for the top bar.
 */
export function deriveBarColor(bgHex: string): string {
  const rgb = parseHex(bgHex)
  const lum = getRelativeLuminance(bgHex)

  // If dark background, lighten slightly; if light background, darken by ~12%
  const factor = lum < 0.2 ? 1.25 : 0.88
  return rgbToHex({
    r: Math.min(255, rgb.r * factor),
    g: Math.min(255, rgb.g * factor),
    b: Math.min(255, rgb.b * factor)
  })
}

/**
 * Returns complete ColorScheme for a note in current theme.
 */
export function getNoteColorScheme(color: NoteColor, _isDark: boolean): ColorScheme {
  if (color.kind === 'preset') {
    const preset = PRESET_COLORS[color.id] || PRESET_COLORS.yellow
    const variant = preset.light
    return {
      bg: variant.bg,
      fg: pickTextColor(variant.bg),
      barBg: variant.barBg,
      barFg: pickTextColor(variant.barBg)
    }
  }

  // Custom hex color
  const bg = color.hex
  const fg = pickTextColor(bg)
  const barBg = deriveBarColor(bg)
  const barFg = pickTextColor(barBg)
  return { bg, fg, barBg, barFg }
}


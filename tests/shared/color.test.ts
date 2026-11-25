import { describe, it, expect } from 'vitest'
import {
  parseHex,
  getRelativeLuminance,
  getContrastRatio,
  pickTextColor,
  deriveBarColor,
  getNoteColorScheme,
  PRESET_COLORS
} from '@shared/color'

describe('color and contrast helpers', () => {
  it('parses 3-digit and 6-digit hex values correctly', () => {
    expect(parseHex('#fff')).toEqual({ r: 255, g: 255, b: 255 })
    expect(parseHex('#000000')).toEqual({ r: 0, g: 0, b: 0 })
    expect(parseHex('#fde047')).toEqual({ r: 253, g: 224, b: 71 })
  })

  it('calculates relative luminance correctly for pure white and pure black', () => {
    expect(getRelativeLuminance('#ffffff')).toBeCloseTo(1.0, 2)
    expect(getRelativeLuminance('#000000')).toBeCloseTo(0.0, 2)
  })

  it('calculates contrast ratio between white and black as 21:1', () => {
    const ratio = getContrastRatio('#ffffff', '#000000')
    expect(ratio).toBeCloseTo(21.0, 1)
  })

  it('picks dark text for light backgrounds (contrast >= 4.5:1)', () => {
    // Pure white
    const whiteText = pickTextColor('#ffffff')
    expect(whiteText).toBe('#111827')
    expect(getContrastRatio('#ffffff', whiteText)).toBeGreaterThanOrEqual(4.5)

    // Saturated yellow
    const yellowText = pickTextColor('#fde047')
    expect(yellowText).toBe('#111827')
    expect(getContrastRatio('#fde047', yellowText)).toBeGreaterThanOrEqual(4.5)
  })

  it('picks light text for dark backgrounds (contrast >= 4.5:1)', () => {
    // Pure black
    const blackText = pickTextColor('#000000')
    expect(blackText).toBe('#ffffff')
    expect(getContrastRatio('#000000', blackText)).toBeGreaterThanOrEqual(4.5)

    // Saturated blue
    const blueText = pickTextColor('#1e3a8a')
    expect(blueText).toBe('#ffffff')
    expect(getContrastRatio('#1e3a8a', blueText)).toBeGreaterThanOrEqual(4.5)
  })

  it('derives a coherent top bar color', () => {
    const lightBar = deriveBarColor('#fef08a')
    expect(lightBar).not.toBe('#fef08a')
    // Top bar text on derived top bar must also have strong contrast
    const barText = pickTextColor(lightBar)
    expect(getContrastRatio(lightBar, barText)).toBeGreaterThanOrEqual(4.5)

    const darkBar = deriveBarColor('#1e3a8a')
    expect(darkBar).not.toBe('#1e3a8a')
  })

  it('provides color schemes for all 4 presets in light and dark mode', () => {
    const presets = ['yellow', 'green', 'blue', 'pink'] as const
    for (const preset of presets) {
      const lightScheme = getNoteColorScheme({ kind: 'preset', id: preset }, false)
      expect(getContrastRatio(lightScheme.bg, lightScheme.fg)).toBeGreaterThanOrEqual(4.5)
      expect(getContrastRatio(lightScheme.barBg, lightScheme.barFg)).toBeGreaterThanOrEqual(4.5)

      const darkScheme = getNoteColorScheme({ kind: 'preset', id: preset }, true)
      expect(darkScheme).toEqual(lightScheme)
      expect(getContrastRatio(darkScheme.bg, darkScheme.fg)).toBeGreaterThanOrEqual(4.5)
    }
  })
})


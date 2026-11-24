import { describe, it, expect } from 'vitest'
import { ensureVisible, calculateSpawnBounds, type Rect, type SpawnAnchor } from '@shared/displays'
import type { Bounds } from '@shared/types'

describe('displays - ensureVisible', () => {
  const primaryDisplay: Rect = { x: 0, y: 0, width: 1920, height: 1080 }
  const secondaryDisplay: Rect = { x: 1920, y: 0, width: 1920, height: 1080 }
  const leftSecondaryDisplay: Rect = { x: -1920, y: 0, width: 1920, height: 1080 }

  it('keeps bounds when note is well within primary display work area', () => {
    const bounds: Bounds = { x: 200, y: 200, width: 320, height: 360 }
    const result = ensureVisible(bounds, [primaryDisplay], primaryDisplay)
    expect(result).toEqual(bounds)
  })

  it('keeps bounds when note top bar is visible on secondary display', () => {
    const bounds: Bounds = { x: 2000, y: 100, width: 320, height: 360 }
    const result = ensureVisible(bounds, [primaryDisplay, secondaryDisplay], primaryDisplay)
    expect(result).toEqual(bounds)
  })

  it('relocates note to primary when secondary display is removed (positive coordinates)', () => {
    // Note was at x: 2100 on removed monitor
    const bounds: Bounds = { x: 2100, y: 150, width: 320, height: 360 }
    // Only primary monitor remains
    const result = ensureVisible(bounds, [primaryDisplay], primaryDisplay)
    expect(result.x).toBeGreaterThanOrEqual(primaryDisplay.x)
    expect(result.x + result.width).toBeLessThanOrEqual(primaryDisplay.x + primaryDisplay.width)
    expect(result.y).toBeGreaterThanOrEqual(primaryDisplay.y)
    expect(result.y + result.height).toBeLessThanOrEqual(primaryDisplay.y + primaryDisplay.height)
    expect(result.width).toBe(320)
    expect(result.height).toBe(360)
  })

  it('relocates note to primary when left secondary display is removed (negative coordinates)', () => {
    // Note was at x: -1000 on removed left monitor
    const bounds: Bounds = { x: -1000, y: 200, width: 320, height: 360 }
    const result = ensureVisible(bounds, [primaryDisplay], primaryDisplay)
    expect(result.x).toBeGreaterThanOrEqual(primaryDisplay.x)
    expect(result.y).toBeGreaterThanOrEqual(primaryDisplay.y)
  })

  it('clamps size when note is larger than work area', () => {
    const hugeBounds: Bounds = { x: 0, y: 0, width: 2500, height: 1500 }
    const result = ensureVisible(hugeBounds, [primaryDisplay], primaryDisplay)
    expect(result.width).toBeLessThanOrEqual(primaryDisplay.width)
    expect(result.height).toBeLessThanOrEqual(primaryDisplay.height)
  })

  it('relocates when top bar intersection is less than 100x40 px', () => {
    // Only 30px of width on screen
    const edgeBounds: Bounds = { x: -290, y: 0, width: 320, height: 360 }
    const result = ensureVisible(edgeBounds, [primaryDisplay], primaryDisplay)
    expect(result.x).toBeGreaterThanOrEqual(primaryDisplay.x)
  })

  it('keeps exact position on middle monitor in a 3-monitor setup', () => {
    // 3 monitors: left (-1920..0), middle/primary (0..1920), right (1920..3840)
    const workAreas = [leftSecondaryDisplay, primaryDisplay, secondaryDisplay]
    const middleBounds: Bounds = { x: 500, y: 300, width: 320, height: 360 }
    const result = ensureVisible(middleBounds, workAreas, primaryDisplay)
    expect(result).toEqual(middleBounds)
  })

  it('keeps exact position on right monitor in a 3-monitor setup', () => {
    const workAreas = [leftSecondaryDisplay, primaryDisplay, secondaryDisplay]
    const rightBounds: Bounds = { x: 2200, y: 250, width: 320, height: 360 }
    const result = ensureVisible(rightBounds, workAreas, primaryDisplay)
    expect(result).toEqual(rightBounds)
  })

  it('nudges slightly off-top window down so the drag bar is reachable without relocating', () => {
    const workAreas = [primaryDisplay]
    // Top bar is at y: -10, so part of the bar is above screen
    const offTopBounds: Bounds = { x: 200, y: -10, width: 320, height: 360 }
    const result = ensureVisible(offTopBounds, workAreas, primaryDisplay)
    expect(result.y).toBe(0) // nudged to workArea.y
    expect(result.x).toBe(200)
    expect(result.width).toBe(320)
    expect(result.height).toBe(360)
  })
})

describe('displays - calculateSpawnBounds', () => {
  const primaryDisplay: Rect = { x: 0, y: 0, width: 1920, height: 1080 }

  it('spawns note directly to the left of manager window when room exists', () => {
    const managerAnchor: SpawnAnchor = {
      type: 'manager',
      bounds: { x: 1000, y: 200, width: 400, height: 500 }
    }
    const result = calculateSpawnBounds(managerAnchor, primaryDisplay, [])
    // 1000 - 320 - 12 = 668
    expect(result.x).toBe(668)
    expect(result.y).toBe(200)
    expect(result.width).toBe(320)
    expect(result.height).toBe(360)
  })

  it('spawns note on the right side if manager window is too close to left screen edge', () => {
    const managerAnchor: SpawnAnchor = {
      type: 'manager',
      bounds: { x: 50, y: 150, width: 400, height: 500 }
    }
    const result = calculateSpawnBounds(managerAnchor, primaryDisplay, [])
    // 50 - 320 - 12 = -282 (<0, offscreen). Right side: 50 + 400 + 12 = 462
    expect(result.x).toBe(462)
    expect(result.y).toBe(150)
  })

  it('spawns note directly to the right of an existing note when clicking "+"', () => {
    const noteAnchor: SpawnAnchor = {
      type: 'note',
      bounds: { x: 400, y: 250, width: 320, height: 360 }
    }
    const result = calculateSpawnBounds(noteAnchor, primaryDisplay, [])
    // 400 + 320 + 12 = 732
    expect(result.x).toBe(732)
    expect(result.y).toBe(250)
  })

  it('spawns note to the left of existing note if too close to right screen edge', () => {
    const noteAnchor: SpawnAnchor = {
      type: 'note',
      bounds: { x: 1700, y: 250, width: 320, height: 360 }
    }
    const result = calculateSpawnBounds(noteAnchor, primaryDisplay, [])
    // 1700 + 320 + 12 = 2032 (>1920, offscreen). Left side: 1700 - 320 - 12 = 1368
    expect(result.x).toBe(1368)
    expect(result.y).toBe(250)
  })

  it('offsets new note when another note already occupies that position', () => {
    const managerAnchor: SpawnAnchor = {
      type: 'manager',
      bounds: { x: 1000, y: 200, width: 400, height: 500 }
    }
    // Existing note already sits at 668, 200
    const existing = [{ x: 668, y: 200, width: 320, height: 360 }]
    const result = calculateSpawnBounds(managerAnchor, primaryDisplay, existing)
    // Should avoid exact overlap
    expect(result.x).not.toBe(668)
    expect(result.x).toBeLessThan(668)
  })

  it('clamps y within work area if anchor is near the bottom edge', () => {
    const managerAnchor: SpawnAnchor = {
      type: 'manager',
      bounds: { x: 1000, y: 900, width: 400, height: 500 }
    }
    const result = calculateSpawnBounds(managerAnchor, primaryDisplay, [])
    expect(result.y + result.height).toBeLessThanOrEqual(primaryDisplay.y + primaryDisplay.height)
  })

  it('provides a clean fallback position when anchor is null', () => {
    const result = calculateSpawnBounds(null, primaryDisplay, [])
    expect(result.x).toBeGreaterThan(0)
    expect(result.y).toBeGreaterThan(0)
    expect(result.x + result.width).toBeLessThanOrEqual(primaryDisplay.width)
    expect(result.y + result.height).toBeLessThanOrEqual(primaryDisplay.height)
  })
})

import type { Bounds } from './types'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export const TOP_BAR_HEIGHT = 40
export const MIN_INTERSECT_WIDTH = 100
export const MIN_INTERSECT_HEIGHT = 40

/**
 * Pure function: Ensures a window's top bar is sufficiently visible (>=100x40)
 * on at least one display's workArea. Otherwise moves it into primary display.
 * Also clamps width and height so it does not exceed the target work area.
 */
export function ensureVisible(
  bounds: Bounds,
  workAreas: Rect[],
  primary: Rect,
  cascadeOffsetIndex = 0
): Bounds {
  const topBar: Rect = {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: TOP_BAR_HEIGHT
  }

  let matchingDisplay: Rect | null = null

  for (const area of workAreas) {
    const interLeft = Math.max(topBar.x, area.x)
    const interRight = Math.min(topBar.x + topBar.width, area.x + area.width)
    const interTop = Math.max(topBar.y, area.y)
    const interBottom = Math.min(topBar.y + topBar.height, area.y + area.height)

    const interW = Math.max(0, interRight - interLeft)
    const interH = Math.max(0, interBottom - interTop)

    if (interW >= MIN_INTERSECT_WIDTH && interH >= MIN_INTERSECT_HEIGHT) {
      matchingDisplay = area
      break
    }
  }

  if (matchingDisplay) {
    const clampedWidth = Math.min(bounds.width, matchingDisplay.width)
    const clampedHeight = Math.min(bounds.height, matchingDisplay.height)
    return {
      x: bounds.x,
      y: bounds.y,
      width: clampedWidth,
      height: clampedHeight
    }
  }

  // Not visible: clamp size and move to primary work area
  const clampedWidth = Math.min(bounds.width, primary.width)
  const clampedHeight = Math.min(bounds.height, primary.height)

  const offset = (cascadeOffsetIndex % 8) * 30
  let newX = primary.x + 40 + offset
  let newY = primary.y + 40 + offset

  // Ensure within primary display boundaries
  if (newX + clampedWidth > primary.x + primary.width) {
    newX = Math.max(primary.x, primary.x + primary.width - clampedWidth)
  }
  if (newY + clampedHeight > primary.y + primary.height) {
    newY = Math.max(primary.y, primary.y + primary.height - clampedHeight)
  }

  return {
    x: newX,
    y: newY,
    width: clampedWidth,
    height: clampedHeight
  }
}

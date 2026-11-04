import type { Bounds } from './types'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export const TOP_BAR_HEIGHT = 40
export const MIN_INTERSECT_WIDTH = 100
export const MIN_INTERSECT_HEIGHT = 20

/**
 * Pure function: Ensures a window's top bar is sufficiently visible (>=100x20)
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

  // 1. Check if the top bar has sufficient intersection with any work area
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

  // 2. Fallback: check if the overall window is substantially on a display
  if (!matchingDisplay) {
    for (const area of workAreas) {
      const interLeft = Math.max(bounds.x, area.x)
      const interRight = Math.min(bounds.x + bounds.width, area.x + area.width)
      const interTop = Math.max(bounds.y, area.y)
      const interBottom = Math.min(bounds.y + bounds.height, area.y + area.height)

      const interW = Math.max(0, interRight - interLeft)
      const interH = Math.max(0, interBottom - interTop)

      if (interW >= MIN_INTERSECT_WIDTH && interH >= 100) {
        matchingDisplay = area
        break
      }
    }
  }

  if (matchingDisplay) {
    const clampedWidth = Math.min(bounds.width, matchingDisplay.width)
    const clampedHeight = Math.min(bounds.height, matchingDisplay.height)

    // Ensure the top bar is visible and reachable inside the display
    let safeY = Math.max(matchingDisplay.y, bounds.y)
    if (safeY + TOP_BAR_HEIGHT > matchingDisplay.y + matchingDisplay.height) {
      safeY = Math.max(matchingDisplay.y, matchingDisplay.y + matchingDisplay.height - TOP_BAR_HEIGHT)
    }

    let safeX = bounds.x
    if (safeX + clampedWidth < matchingDisplay.x + MIN_INTERSECT_WIDTH) {
      safeX = matchingDisplay.x
    } else if (safeX > matchingDisplay.x + matchingDisplay.width - MIN_INTERSECT_WIDTH) {
      safeX = Math.max(matchingDisplay.x, matchingDisplay.x + matchingDisplay.width - clampedWidth)
    }

    return {
      x: safeX,
      y: safeY,
      width: clampedWidth,
      height: clampedHeight
    }
  }

  // Not visible on any connected display: clamp size and move to primary work area
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

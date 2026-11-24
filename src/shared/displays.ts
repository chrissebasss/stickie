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

export interface SpawnAnchor {
  type: 'manager' | 'note'
  bounds: Rect
}

/**
 * Calculates the ideal spawn position and size for a new sticky note.
 *
 * - When spawned from the manager window:
 *   Appears immediately on the left side of the manager window.
 *   If there is insufficient space on the left, it spawns on the right side.
 *
 * - When spawned from an existing note window (via '+'):
 *   Spawns right beside that note (on the right side).
 *   If there is insufficient space on the right, it spawns on the left side,
 *   or wraps down to the next row.
 *
 * - Avoids exact overlap with existing open notes by cascading slightly when needed.
 * - Always ensures the window is within the target workArea.
 */
export function calculateSpawnBounds(
  anchor: SpawnAnchor | null,
  workArea: Rect,
  existingNotes: Rect[] = [],
  noteSize = { width: 320, height: 360 },
  gap = 12
): Bounds {
  const width = Math.min(noteSize.width, workArea.width)
  const height = Math.min(noteSize.height, workArea.height)

  let x: number
  let y: number = workArea.y + 40

  if (anchor?.type === 'manager') {
    // 1. Manager window: place on the left side
    const preferredX = anchor.bounds.x - width - gap
    if (preferredX >= workArea.x) {
      x = preferredX
    } else {
      // Not enough room on the left; check if it fits on the right
      const rightX = anchor.bounds.x + anchor.bounds.width + gap
      if (rightX + width <= workArea.x + workArea.width) {
        x = rightX
      } else {
        // Fallback: clamp to the left edge of work area
        x = Math.max(workArea.x, Math.min(preferredX, workArea.x + workArea.width - width))
      }
    }
    y = anchor.bounds.y
  } else if (anchor?.type === 'note') {
    // 2. Note window: spawn right beside (on the right side)
    const preferredX = anchor.bounds.x + anchor.bounds.width + gap
    y = anchor.bounds.y
    if (preferredX + width <= workArea.x + workArea.width) {
      x = preferredX
    } else {
      // Not enough room on the right; try on the left side of the note
      const leftX = anchor.bounds.x - width - gap
      if (leftX >= workArea.x) {
        x = leftX
      } else {
        // Wrap down below the note
        x = anchor.bounds.x
        y = anchor.bounds.y + 40
      }
    }
  } else {
    // 3. Fallback: center in the workArea with slight vertical elevation
    x = workArea.x + Math.max(0, Math.floor((workArea.width - width) / 2))
    y = workArea.y + Math.max(0, Math.floor((workArea.height - height) / 3))
  }

  // Clamp Y within workArea
  if (y + height > workArea.y + workArea.height) {
    y = Math.max(workArea.y, workArea.y + workArea.height - height)
  }
  if (y < workArea.y) {
    y = workArea.y
  }

  // Clamp X within workArea
  if (x + width > workArea.x + workArea.width) {
    x = Math.max(workArea.x, workArea.x + workArea.width - width)
  }
  if (x < workArea.x) {
    x = workArea.x
  }

  // Prevent exact overlapping with existing notes
  let attempts = 0
  while (attempts < 6) {
    const overlapping = existingNotes.some(
      (n) => Math.abs(n.x - x) < 20 && Math.abs(n.y - y) < 20
    )
    if (!overlapping) break

    // Shift down and slightly right/left depending on available space
    if (anchor?.type === 'manager' && x - 24 >= workArea.x) {
      x -= 24
      y += 28
    } else if (x + width + 24 <= workArea.x + workArea.width) {
      x += 24
      y += 28
    } else {
      y += 32
    }

    // Re-clamp
    if (y + height > workArea.y + workArea.height) {
      y = Math.max(workArea.y, workArea.y + 40)
    }
    attempts++
  }

  return { x, y, width, height }
}

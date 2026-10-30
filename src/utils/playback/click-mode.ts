export const CLICK_MODES = ["native", "pause", "pause-reels"] as const
export type ClickMode = (typeof CLICK_MODES)[number]

// Read the original boolean until the user chooses a new mode. Existing false
// stays Native, existing true/default stays Pause, and the new key always wins.
export function resolveClickMode(
  value: unknown,
  legacyValue?: unknown
): ClickMode {
  if (CLICK_MODES.includes(value as ClickMode)) return value as ClickMode
  return legacyValue === false ? "native" : "pause"
}

const nativeClicks = new WeakSet<HTMLVideoElement>()
export function isNativeReelClick(video: HTMLVideoElement) {
  return nativeClicks.has(video)
}

export function triggerNativeReels(
  video: HTMLVideoElement,
  anchor?: HTMLAnchorElement | null
) {
  nativeClicks.add(video)
  try {
    // Run Instagram's own navigation handler/default action, preserving its
    // current post identity and SPA behavior instead of inventing a destination.
    if (anchor) anchor.click()
    else video.click()
  } finally {
    nativeClicks.delete(video)
  }
}

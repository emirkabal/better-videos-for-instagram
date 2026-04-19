import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://www.instagram.com/*"],
  world: "MAIN",
  run_at: "document_start",
  all_frames: true
}

// Dynamic guard: covers SPA navigation from / to /reels/ without page reload
const isOnReels = () => location.pathname.startsWith("/reels")

// =============================================================================
// DEFENSIVE LAYER — Runs on ALL pages (including /reels/ and iframes)
// Purpose: Neutralize Instagram's unload event registrations that cause
// Permissions Policy violations and RunComet freeze loops.
// =============================================================================

// LEVEL 1: Intercept at EventTarget.prototype (the ROOT of all addEventListener calls).
// This catches everything — even if Instagram's bundled code captured a reference to
// addEventListener BEFORE our script ran, the prototype method is what ultimately executes.
const originalAEL = EventTarget.prototype.addEventListener
EventTarget.prototype.addEventListener = function (
  type: string,
  listener: EventListenerOrEventListenerObject | null,
  options?: boolean | AddEventListenerOptions
) {
  // Only intercept 'unload'/'afterunload' on Window targets
  if (
    (type === "unload" || type === "afterunload") &&
    this instanceof Window
  ) {
    return originalAEL.call(this, "pagehide", listener, options)
  }
  return originalAEL.call(this, type, listener, options)
}

// LEVEL 2: Trap window.onunload property assignment.
// Instagram may use `window.onunload = handler` which bypasses addEventListener entirely.
Object.defineProperty(window, "onunload", {
  set(_fn) {
    // Silently discard — the handler will never fire anyway due to Permissions Policy
  },
  get() {
    return null
  },
  configurable: true
})

// LEVEL 3: Silence violation logs from console.error AND console.warn.
// The browser may log violations via either channel depending on Chrome version.
const nativeConsoleError = console.error
const nativeConsoleWarn = console.warn

console.error = function (...args: unknown[]) {
  const msg = typeof args[0] === "string" ? args[0] : ""
  if (
    msg.includes("Permissions policy violation") ||
    msg.includes("unload") && msg.includes("deprecated")
  ) {
    return
  }
  nativeConsoleError.apply(console, args)
}

console.warn = function (...args: unknown[]) {
  const msg = typeof args[0] === "string" ? args[0] : ""
  if (
    msg.includes("Permissions policy violation") ||
    msg.includes("unload") && msg.includes("deprecated")
  ) {
    return
  }
  nativeConsoleWarn.apply(console, args)
}

// LEVEL 4: Error event shield — kill unload/policy errors before they reach RunComet.
originalAEL.call(
  window,
  "error",
  (e: ErrorEvent) => {
    if (
      e.message?.includes("unload") ||
      e.message?.includes("Permissions policy")
    ) {
      e.stopImmediatePropagation()
      e.preventDefault()
    }
  },
  true
)

// bfcache lifecycle handler
originalAEL.call(
  window,
  "pagehide",
  (event: PageTransitionEvent) => {
    if (event.persisted) {
      // Page entered bfcache — our patch has no timers/rAF, so we're safe.
    }
    // If !event.persisted, page is truly being destroyed — nothing to clean up.
  },
  true
)

let activeSpeed = 1

// Listen for speed changes from the Isolated World (React UI)
window.addEventListener("message", (event) => {
  if (event.data?.type === "BIGV_SPEED_CHANGE") {
    activeSpeed = event.data.speed
    
    if (isOnReels()) return

    // Force the new speed on all existing video elements immediately
    document.querySelectorAll('video').forEach(video => {
      try {
        // This triggers our monkey-patched setter below!
        video.playbackRate = activeSpeed
      } catch (e) {}
    })
  }
})

// Monkey-patch the native HTMLMediaElement prototype
const rawPlaybackRate = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'playbackRate')

if (rawPlaybackRate) {
  Object.defineProperty(HTMLMediaElement.prototype, 'playbackRate', {
    set: function(value) {
      if (isOnReels()) {
        return rawPlaybackRate.set.call(this, value)
      }
      // Ignore whatever Instagram wants, force our active speed
      return rawPlaybackRate.set.call(this, activeSpeed)
    },
    get: function() {
      if (isOnReels()) {
        return rawPlaybackRate.get.call(this)
      }
      // STEALTH MODE: Instagram monitors the speed to sync its UI.
      // We always return 1 so it thinks everything is normal, preventing desync panics.
      return 1
    }
  })
}

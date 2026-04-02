import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://www.instagram.com/*"],
  world: "MAIN",
  run_at: "document_start"
}

// 1. Intercept global addEventListener for 'unload' and 'afterunload' to avoid Comet crashes
const originalAddEventListener = window.addEventListener
window.addEventListener = function (type, listener, options) {
  // Bypass if on Reels
  if (location.pathname.startsWith("/reels/")) {
    return originalAddEventListener.call(this, type, listener, options)
  }

  // If Instagram tries to register an 'unload', silently swap for 'pagehide'
  // This avoids the policy violation and RunComet freeze loop
  if (type === "unload" || type === "afterunload") {
    return originalAddEventListener.call(this, "pagehide", listener, options)
  }
  return originalAddEventListener.call(this, type, listener, options)
}

// Extra Shield: Silence the violation error log
// This prevents the Main Thread from freezing by trying to draw red logs in the console
const nativeConsoleError = console.error
console.error = function (...args) {
  // Bypass if on Reels
  if (location.pathname.startsWith("/reels/")) {
    return nativeConsoleError.apply(console, args)
  }

  if (
    typeof args[0] === "string" &&
    args[0].includes("Permissions policy violation")
  ) {
    return
  }
  nativeConsoleError.apply(console, args)
}

// bfcache lifecycle handler
window.addEventListener(
  "pagehide",
  (event) => {
    if (event.persisted) {
      // The page went into the bfcache (it was not destroyed).
      // Since our patch.ts has no setIntervals or rAF, we are safe.
      // This is here to ensure compliance with the extension's performance rules.
    } else {
      // The page is truly being closed/destroyed.
    }
  },
  true
)

// 2. Error Shield (Silent Kill)
// RunComet generates massive error logs when the video is accelerated.
// We silently kill the 'Permissions Policy' or 'unload' errors that flood the CPU.
window.addEventListener(
  "error",
  (e) => {
    if (e.message?.includes("unload") || e.message?.includes("Permissions policy")) {
      e.stopImmediatePropagation()
      e.preventDefault()
    }
  },
  true
)

let activeSpeed = 1

// Listen for speed changes from the Isolated World (React UI)
window.addEventListener("message", (event) => {
  if (event.data?.type === "BIGV_SPEED_CHANGE") {
    activeSpeed = event.data.speed
    
    // Bypass if on Reels
    if (location.pathname.startsWith("/reels/")) return

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
      if (location.pathname.startsWith("/reels/")) {
        return rawPlaybackRate.set.call(this, value)
      }
      // Ignore whatever Instagram wants, force our active speed
      return rawPlaybackRate.set.call(this, activeSpeed)
    },
    get: function() {
      if (location.pathname.startsWith("/reels/")) {
        return rawPlaybackRate.get.call(this)
      }
      // STEALTH MODE: Instagram monitors the speed to sync its UI.
      // We always return 1 so it thinks everything is normal, preventing desync panics.
      return 1
    }
  })
}

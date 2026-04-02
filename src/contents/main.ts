import type { PlasmoCSConfig } from "plasmo"

import { Global, Reels, Stories } from "~modules/instagram"

export const config: PlasmoCSConfig = {
  matches: ["https://www.instagram.com/*"]
}

const REGEX =
  /^(?:https?:\/\/(?:www\.)?instagram\.com)?(?:\/[\w.-]+)?\/(stories|reels)\/([\w.-]+)(?:\/([\w.-]+))?\/?$/i

const globalInjector = new Global()
const reelsInjector = new Reels()
const storiesInjector = new Stories()

let currentPathname = ""

const load = () => {
  // Ignore if the route hasn't changed (prevents unnecessary re-initialization)
  const pathname = location.pathname
  if (pathname === currentPathname) return
  currentPathname = pathname

  const match = pathname.match(REGEX)
  const first = match?.[1]

  if (first === "reels") {
    globalInjector.delete()
    storiesInjector.delete()
    reelsInjector.delete() // DISABLE EXTENSION ON REELS
  } else if (first === "stories") {
    globalInjector.delete()
    reelsInjector.delete()
    storiesInjector.wayToInject()
  } else {
    reelsInjector.delete()
    storiesInjector.delete()
    globalInjector.wayToInject()
  }
}

// Small delay to ensure the DOM has already been updated by Instagram's React
const navigate = () => setTimeout(load, 50)

// --- SPA Navigation Detection without setInterval ---

// Native event triggered when using the browser's "Back/Forward" button
window.addEventListener("popstate", navigate)

// Instagram uses history.pushState/replaceState for SPA navigation.
// These methods DO NOT trigger "popstate", so we need to monkey-patch them.
const originalPushState = history.pushState.bind(history)
history.pushState = function (...args: Parameters<typeof history.pushState>) {
  originalPushState(...args)
  navigate()
}

const originalReplaceState = history.replaceState.bind(history)
history.replaceState = function (
  ...args: Parameters<typeof history.replaceState>
) {
  originalReplaceState(...args)
  navigate()
}

// Initial execution (for when the content script loads on an already open page)
document.addEventListener("DOMContentLoaded", load)
load()

import type { PlasmoCSConfig } from "plasmo"

import { Global, Reels, Stories } from "~modules/instagram"

export const config: PlasmoCSConfig = {
  matches: ["https://www.instagram.com/*"]
}

const REGEX =
  /^(?:https?:\/\/(?:www\.)?instagram\.com)?(?:\/[\w.-]+)?\/(stories|reel|reels)\/([\w.-]+)(?:\/([\w.-]+))?\/?$/i
const global = new Global()
const reels = new Reels()
const stories = new Stories()

reels.ensureQuickShareReady()

let previousUrl = ""
const load = () => {
  const match = location.pathname.match(REGEX)
  const first = match?.[1]
  switch (first) {
    case "reel":
    case "reels":
      global.delete()
      stories.delete()
      reels.wayToInject()
      break
    case "stories":
      global.delete()
      reels.delete()
      stories.wayToInject()
      break
    default:
      reels.delete()
      stories.delete()
      global.wayToInject()
  }
}

setInterval(() => {
  if (location.href !== previousUrl) {
    previousUrl = location.href
    load()
  }
}, 100)

document.addEventListener("DOMContentLoaded", load)

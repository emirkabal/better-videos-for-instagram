import type { PlasmoCSConfig } from "plasmo"

import { Global, Reels, Stories } from "~modules/instagram"

export const config: PlasmoCSConfig = {
  matches: ["https://www.instagram.com/*"]
}

const global = new Global()
const reels = new Reels()
const stories = new Stories()

type PageMode = "global" | "reels" | "stories"

const getPageMode = (): PageMode => {
  const section = location.pathname.split("/").filter(Boolean)[0]
  console.log("section: ", section)

  if (section === "reel" || section === "reels") return "reels"
  if (section === "stories") return "stories"
  return "global"
}

const load = () => {
  switch (getPageMode()) {
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

let previousUrl = ""
const loadWhenUrlChanges = () => {
  if (location.href === previousUrl) return

  previousUrl = location.href
  load()
}

setInterval(() => {
  loadWhenUrlChanges()
}, 250)

loadWhenUrlChanges()

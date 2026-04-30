import type { PlasmoCSConfig } from "plasmo"

import { Storage } from "@plasmohq/storage"

import { Global, Reels, Stories } from "~modules/instagram"

export const config: PlasmoCSConfig = {
  matches: ["https://www.instagram.com/*"],
  run_at: "document_start"
}

const REGEX =
  /^(?:https?:\/\/(?:www\.)?instagram\.com)?(?:\/[\w.-]+)?\/(stories|reels)\/([\w.-]+)(?:\/([\w.-]+))?\/?$/i
const global = new Global()
const reels = new Reels()
const stories = new Stories()
const storage = new Storage()

let previousUrl = ""
let openExternalReelsAsPosts = false

storage.get("bigv-open-external-reels-as-posts").then((value) => {
  openExternalReelsAsPosts = value ?? false
  openExternalReelAsPost()
})
storage.watch({
  "bigv-open-external-reels-as-posts": (c) => {
    openExternalReelsAsPosts = c.newValue
    load()
  }
})

const openExternalReelAsPost = () => {
  if (!openExternalReelsAsPosts) return

  const [, id] = location.pathname.match(/^\/reel\/([^/]+)\/?$/i) ?? []
  if (!id) return

  const referrer = document.referrer ? new URL(document.referrer) : null
  if (referrer?.hostname.endsWith("instagram.com")) return

  location.replace(`/p/${id}/${location.search}`)
}

const load = () => {
  openExternalReelAsPost()

  const match = location.pathname.match(REGEX)
  const first = match?.[1]
  switch (first) {
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

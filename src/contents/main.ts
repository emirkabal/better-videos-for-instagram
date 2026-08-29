import type { PlasmoCSConfig } from "plasmo"

import { Storage, type StorageCallbackMap } from "@plasmohq/storage"

import { Global, Reels, Stories } from "~modules/instagram"
import { CONTROLLER_ENABLED_STORAGE_KEY } from "~utils/constants"

export const config: PlasmoCSConfig = {
  matches: ["https://www.instagram.com/*"]
}

const global = new Global()
const reels = new Reels()
const stories = new Stories()
const storage = new Storage()

let controllerEnabled = true

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

const deleteControllers = () => {
  global.delete()
  reels.delete()
  stories.delete()
}

let previousUrl = ""
const loadWhenUrlChanges = () => {
  if (!controllerEnabled) return
  if (location.href === previousUrl) return

  previousUrl = location.href
  load()
}

const controllerWatch: StorageCallbackMap = {
  [CONTROLLER_ENABLED_STORAGE_KEY]: ({ newValue }) => {
    controllerEnabled = newValue ?? true
    previousUrl = ""

    if (controllerEnabled) loadWhenUrlChanges()
    else deleteControllers()
  }
}

const start = async () => {
  controllerEnabled =
    (await storage.get<boolean>(CONTROLLER_ENABLED_STORAGE_KEY)) ?? true
  storage.watch(controllerWatch)

  setInterval(loadWhenUrlChanges, 250)
  loadWhenUrlChanges()
}

void start()

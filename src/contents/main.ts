import type { PlasmoCSConfig } from "plasmo"

import { Storage, type StorageCallbackMap } from "@plasmohq/storage"

import { Global, Reels, Stories } from "~modules/instagram"
import {
  CLICK_TO_PAUSE_STORAGE_KEY,
  CONTROLLER_ENABLED_STORAGE_KEY
} from "~utils/constants"
import { getPageMode } from "~utils/page-mode"
import { pictureInPicture } from "~utils/picture-in-picture"

export const config: PlasmoCSConfig = {
  matches: ["https://www.instagram.com/*"]
}

const global = new Global()
const reels = new Reels()
const stories = new Stories()
const storage = new Storage()

let controllerEnabled = true

const load = () => {
  const mode = getPageMode(location.pathname)
  pictureInPicture.setPageMode(mode)
  switch (mode) {
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
  pictureInPicture.close()
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
  [CLICK_TO_PAUSE_STORAGE_KEY]: ({ newValue }) => {
    global.setClickToPause(newValue ?? true)
  },
  [CONTROLLER_ENABLED_STORAGE_KEY]: ({ newValue }) => {
    controllerEnabled = newValue ?? true
    previousUrl = ""

    if (controllerEnabled) loadWhenUrlChanges()
    else deleteControllers()
  }
}

const start = async () => {
  const [enabled, clickToPause] = await Promise.all([
    storage.get<boolean>(CONTROLLER_ENABLED_STORAGE_KEY),
    storage.get<boolean>(CLICK_TO_PAUSE_STORAGE_KEY)
  ])
  controllerEnabled = enabled ?? true
  global.setClickToPause(clickToPause ?? true)
  storage.watch(controllerWatch)

  setInterval(loadWhenUrlChanges, 250)
  loadWhenUrlChanges()
}

void start()

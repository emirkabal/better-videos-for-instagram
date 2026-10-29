import { Storage } from "@plasmohq/storage"

import {
  CONTROLLER_ENABLED_STORAGE_KEY,
  UNINSTALL_FEEDBACK_URL
} from "~utils/constants"
import { shouldShowWelcome } from "~utils/welcome"

const storage = new Storage()

chrome.runtime.setUninstallURL(UNINSTALL_FEEDBACK_URL)

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason !== "install" && details.reason !== "update") return

  if (details.reason === "install") {
    void storage.set(CONTROLLER_ENABLED_STORAGE_KEY, true)
  }

  const currentVersion = chrome.runtime.getManifest().version
  // Unpacked extension reloads also report "update", even at the same version.
  if (
    !shouldShowWelcome(details.reason, currentVersion, details.previousVersion)
  )
    return
  void (async () => {
    const key = "bigv-welcome-version"
    const saved = await chrome.storage.local.get(key)
    if (
      !shouldShowWelcome(
        details.reason,
        currentVersion,
        details.previousVersion,
        saved[key]
      )
    )
      return
    await chrome.storage.local.set({ [key]: currentVersion })
    await chrome.tabs.create({
      url: chrome.runtime.getURL(`tabs/welcome.html?reason=${details.reason}`)
    })
  })().catch((error) => console.error("Could not open welcome page", error))
})

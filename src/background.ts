import { Storage } from "@plasmohq/storage"

import {
  CONTROLLER_ENABLED_STORAGE_KEY,
  UNINSTALL_FEEDBACK_URL
} from "~utils/constants"

const storage = new Storage()

chrome.runtime.setUninstallURL(UNINSTALL_FEEDBACK_URL)

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason !== "install" && details.reason !== "update") return

  if (details.reason === "install") {
    void storage.set(CONTROLLER_ENABLED_STORAGE_KEY, true)
  }

  void chrome.tabs.create({
    url: chrome.runtime.getURL(`tabs/welcome.html?reason=${details.reason}`)
  })
})

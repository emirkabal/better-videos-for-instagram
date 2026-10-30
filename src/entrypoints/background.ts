import { defineBackground } from "wxt/utils/define-background"
import { registerMainWorldScripts } from "@/utils/extension/main-world-scripts"
import { settings, welcomeVersion } from "@/utils/storage/settings"

import { UNINSTALL_FEEDBACK_URL } from "@/utils/constants"
import { shouldShowWelcome } from "@/utils/extension/welcome"

export default defineBackground(() => {
  void registerMainWorldScripts(chrome.scripting).catch((error) =>
    console.error("Could not register Instagram page scripts", error)
  )

  chrome.runtime.setUninstallURL(UNINSTALL_FEEDBACK_URL)

  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason !== "install" && details.reason !== "update") return

    const currentVersion = chrome.runtime.getManifest().version
    // Unpacked extension reloads also report "update", even at the same version.
    if (
      !shouldShowWelcome(
        details.reason,
        currentVersion,
        details.previousVersion
      )
    )
      return
    void (async () => {
      const [saved, enabled] = await Promise.all([
        welcomeVersion.getValue(),
        settings.showFeatureUpdates.getValue()
      ])
      if (
        !shouldShowWelcome(
          details.reason,
          currentVersion,
          details.previousVersion,
          saved ?? undefined,
          enabled !== false
        )
      )
        return
      await welcomeVersion.setValue(currentVersion)
      await chrome.tabs.create({
        url: chrome.runtime.getURL(`welcome.html?reason=${details.reason}`)
      })
    })().catch((error) => console.error("Could not open welcome page", error))
  })
})

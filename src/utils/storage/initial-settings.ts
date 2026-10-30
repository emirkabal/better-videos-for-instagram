import {
  CLICK_TO_PAUSE_STORAGE_KEY,
  CLICK_MODE_STORAGE_KEY,
  CONTROLLER_ENABLED_STORAGE_KEY
} from "../constants"
import { resolveClickMode } from "../playback/click-mode"

export async function readInitialSettings(
  get: (key: string) => Promise<unknown>,
  timeoutMs = 1500
) {
  let timer: ReturnType<typeof setTimeout> | undefined
  const defaults = {
    enabled: true,
    clickMode: resolveClickMode(undefined),
    storedClickMode: undefined as unknown,
    legacyClickToPause: undefined as unknown,
    storageAvailable: false
  }
  try {
    return await Promise.race([
      Promise.allSettled([
        get(CONTROLLER_ENABLED_STORAGE_KEY),
        get(CLICK_TO_PAUSE_STORAGE_KEY),
        get(CLICK_MODE_STORAGE_KEY)
      ]).then(([enabled, click, mode]) => ({
        enabled:
          enabled.status === "fulfilled" && typeof enabled.value === "boolean"
            ? enabled.value
            : true,
        clickMode: resolveClickMode(
          mode.status === "fulfilled" ? mode.value : undefined,
          click.status === "fulfilled" ? click.value : undefined
        ),
        storedClickMode: mode.status === "fulfilled" ? mode.value : undefined,
        legacyClickToPause:
          click.status === "fulfilled" ? click.value : undefined,
        storageAvailable:
          enabled.status === "fulfilled" &&
          click.status === "fulfilled" &&
          mode.status === "fulfilled"
      })),
      new Promise<typeof defaults>((resolve) => {
        timer = setTimeout(() => resolve(defaults), timeoutMs)
      })
    ])
  } catch {
    return defaults
  } finally {
    if (timer) clearTimeout(timer)
  }
}

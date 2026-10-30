import { storage } from "wxt/utils/storage"
import { CLICK_MODES, type ClickMode } from "../playback/click-mode"
import {
  CONTROLLER_ENABLED_STORAGE_KEY,
  CLICK_MODE_STORAGE_KEY,
  CLICK_TO_PAUSE_STORAGE_KEY,
  UPDATE_PAGE_ENABLED_STORAGE_KEY
} from "../constants"
import { createSetting, decodeLegacyValue } from "./setting"

const boolean = (value: unknown): value is boolean => typeof value === "boolean"
const optionalBoolean = (value: unknown): value is boolean | null =>
  value === null || boolean(value)
function defineSetting<T>(
  key: string,
  fallback: T,
  valid: (value: unknown) => value is T
) {
  return createSetting(
    storage.defineItem<unknown>(`sync:${key}`),
    fallback,
    valid
  )
}

export const settings = {
  controllerEnabled: defineSetting(
    CONTROLLER_ENABLED_STORAGE_KEY,
    true,
    boolean
  ),
  clickMode: defineSetting<ClickMode | null>(
    CLICK_MODE_STORAGE_KEY,
    null,
    (value): value is ClickMode | null =>
      value === null || CLICK_MODES.includes(value as ClickMode)
  ),
  legacyClickToPause: defineSetting<boolean | null>(
    CLICK_TO_PAUSE_STORAGE_KEY,
    null,
    optionalBoolean
  ),
  showFeatureUpdates: defineSetting(
    UPDATE_PAGE_ENABLED_STORAGE_KEY,
    true,
    boolean
  ),
  pauseOnComments: defineSetting("bigv-pause-on-comments", true, boolean),
  maxVolumeBalance: defineSetting(
    "bigv-max-volume-balance",
    100,
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value) && value >= 100
  )
}
export const welcomeVersion = storage.defineItem<string>(
  "local:bigv-welcome-version"
)
export const readStoredSetting = async (key: string) =>
  decodeLegacyValue(await storage.getItem<unknown>(`sync:${key}`))

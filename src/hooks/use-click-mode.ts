import { useSetting } from "./use-setting"
import { settings } from "@/utils/storage/settings"

import { resolveClickMode } from "@/utils/playback/click-mode"

export function useClickMode() {
  const [stored, setStored] = useSetting(settings.clickMode)
  const [legacy] = useSetting(settings.legacyClickToPause)
  return [resolveClickMode(stored, legacy), setStored] as const
}

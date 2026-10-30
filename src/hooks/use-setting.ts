import { useSyncExternalStore } from "react"
import { createSettingStore, type Setting } from "@/utils/storage/setting"

const stores = new WeakMap<object, unknown>()

export function useSetting<T>(setting: Setting<T>) {
  let store = stores.get(setting) as
    ReturnType<typeof createSettingStore<T>> | undefined
  if (!store) {
    store = createSettingStore(setting)
    stores.set(setting, store)
  }
  const value = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    () => setting.fallback
  )
  return [value, store.setValue] as const
}

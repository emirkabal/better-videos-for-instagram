export interface Setting<T> {
  key: string
  fallback: T
  getValue(): Promise<T>
  setValue(value: T): Promise<void>
  watch(callback: (value: T, previous: T) => void): () => void
}

type RawItem = {
  key: string
  getValue(): Promise<unknown>
  setValue(value: unknown): Promise<void>
  watch(callback: (value: unknown, previous: unknown) => void): () => void
}

// Plasmo serialized sync values as JSON text. Read both representations without
// rewriting on startup: another open context may already be saving a new value.
// The next explicit write stores WXT's native value under the same key.
export function decodeLegacyValue(value: unknown): unknown {
  if (typeof value !== "string") return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

export function createSetting<T>(
  item: RawItem,
  fallback: T,
  valid: (value: unknown) => value is T
): Setting<T> {
  const normalize = (raw: unknown): T => {
    const value = decodeLegacyValue(raw)
    return valid(value) ? value : fallback
  }
  return {
    key: item.key,
    fallback,
    async getValue() {
      return normalize(await item.getValue())
    },
    async setValue(value) {
      if (!valid(value)) throw new TypeError(`Invalid setting: ${item.key}`)
      await item.setValue(value)
    },
    watch(callback) {
      return item.watch((value, previous) =>
        callback(normalize(value), normalize(previous))
      )
    }
  }
}

export function createSettingStore<T>(setting: Setting<T>) {
  let value = setting.fallback
  let revision = 0
  let generation = 0
  let unwatch: (() => void) | undefined
  const listeners = new Set<() => void>()
  const publish = (next: T) => {
    if (Object.is(next, value)) return
    value = next
    listeners.forEach((listener) => listener())
  }
  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    if (listeners.size === 1) {
      const current = ++generation
      try {
        unwatch = setting.watch((next) => {
          revision++
          publish(next)
        })
      } catch (error) {
        console.warn("Could not watch extension setting", setting.key, error)
      }
      const initialRevision = revision
      void setting
        .getValue()
        .then((next) => {
          if (current === generation && initialRevision === revision)
            publish(next)
        })
        .catch((error) =>
          console.warn("Could not read extension setting", setting.key, error)
        )
    }
    return () => {
      listeners.delete(listener)
      if (!listeners.size) {
        generation++
        unwatch?.()
        unwatch = undefined
      }
    }
  }
  return {
    subscribe,
    getSnapshot: () => value,
    async setValue(next: T) {
      // The WXT watcher is authoritative; failed or out-of-order writes must
      // not replace a newer snapshot with an optimistic local copy.
      try {
        await setting.setValue(next)
      } catch (error) {
        console.warn("Could not save extension setting", setting.key, error)
      }
    }
  }
}

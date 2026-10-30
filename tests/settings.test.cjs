const assert = require("node:assert/strict")
const test = require("node:test")
const loadSource = require("./load-source.cjs")
const { createSetting, createSettingStore } = loadSource(
  "src/utils/storage/setting.ts"
)
const boolean = (value) => typeof value === "boolean"
function item(initial) {
  let value = initial
  const listeners = new Set(),
    writes = []
  return {
    key: "sync:fixture",
    writes,
    getValue: async () => value,
    async setValue(next) {
      writes.push(next)
      const before = value
      value = next
      listeners.forEach((cb) => cb(next, before))
    },
    watch(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    count: () => listeners.size
  }
}
test("legacy JSON false and native false survive reads without migration writes", async () => {
  for (const value of ["false", false]) {
    const raw = item(value),
      setting = createSetting(raw, true, boolean)
    assert.equal(await setting.getValue(), false)
    assert.deepEqual(raw.writes, [])
    await setting.setValue(true)
    assert.deepEqual(raw.writes, [true])
  }
})
test("legacy JSON strings, numbers and native click modes normalize consistently", async () => {
  const mode = (value) => ["native", "pause", "pause-reels"].includes(value)
  for (const value of ['"pause-reels"', "pause-reels"])
    assert.equal(
      await createSetting(item(value), "pause", mode).getValue(),
      "pause-reels"
    )
  for (const value of ["350", 350])
    assert.equal(
      await createSetting(
        item(value),
        100,
        (value) => typeof value === "number"
      ).getValue(),
      350
    )
  for (const value of [null, undefined, "broken", '"false"', {}])
    assert.equal(
      await createSetting(item(value), true, boolean).getValue(),
      true
    )
})
test("watchers decode legacy writes, native writes and removal; cleanup unsubscribes", async () => {
  const raw = item("false"),
    setting = createSetting(raw, true, boolean),
    changes = []
  const stop = setting.watch((next, before) => changes.push([next, before]))
  await raw.setValue(true)
  await raw.setValue("false")
  await raw.setValue(null)
  assert.deepEqual(changes, [
    [true, false],
    [false, true],
    [true, false]
  ])
  stop()
  assert.equal(raw.count(), 0)
  await raw.setValue(false)
  assert.equal(changes.length, 3)
  await assert.rejects(() => setting.setValue("bad"), { name: "TypeError" })
})
test("shared store uses one watcher, publishes changes and releases it after the last subscriber", async () => {
  const raw = item("false"),
    store = createSettingStore(createSetting(raw, true, boolean))
  let updates = 0
  const first = store.subscribe(() => updates++),
    second = store.subscribe(() => updates++)
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(store.getSnapshot(), false)
  assert.equal(raw.count(), 1)
  await store.setValue(true)
  assert.equal(store.getSnapshot(), true)
  assert.equal(updates, 4)
  first()
  assert.equal(raw.count(), 1)
  second()
  assert.equal(raw.count(), 0)
})
test("an in-flight initial read cannot overwrite a newer watched setting", async () => {
  const raw = item(true)
  let resolveRead
  raw.getValue = () =>
    new Promise((resolve) => {
      resolveRead = resolve
    })
  const store = createSettingStore(createSetting(raw, true, boolean)),
    stop = store.subscribe(() => {})
  await raw.setValue(false)
  resolveRead(true)
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(store.getSnapshot(), false)
  stop()
})

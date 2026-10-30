const assert = require("node:assert/strict")
const test = require("node:test")
const loadSource = require("./load-source.cjs")
const { readInitialSettings } = loadSource(
  "src/utils/storage/initial-settings.ts",
  {
    setTimeout,
    clearTimeout
  }
)
const { BoundedMap } = loadSource("src/utils/bounded-map.ts")
const { observeFullscreenAudio } = loadSource("src/utils/fullscreen/audio.ts")

test("storage failures and timeouts do not prevent startup; explicit disabled settings survive", async () => {
  const failed = await readInitialSettings(async () => {
    throw new Error("unavailable")
  })
  assert.equal(failed.enabled, true)
  assert.equal(failed.storageAvailable, false)
  const timedOut = await readInitialSettings(() => new Promise(() => {}), 5)
  assert.equal(timedOut.enabled, true)
  assert.equal(timedOut.storageAvailable, false)
  const disabled = await readInitialSettings(async () => false)
  assert.equal(disabled.enabled, false)
  assert.equal(disabled.clickMode, "native")
})
test("media caches evict oldest entries and retain replaced entries", () => {
  const map = new BoundedMap(2)
  map.set("a", 1)
  map.set("b", 2)
  map.set("a", 3)
  map.set("c", 4)
  assert.equal(map.size, 2)
  assert.equal(map.has("b"), false)
  assert.equal(map.get("a"), 3)
})
test("fullscreen mutes background videos, blocks renewed audio and restores prior mute states", () => {
  const foreground = { muted: false, isConnected: true },
    background = { muted: false, isConnected: true },
    alreadyMuted = { muted: true, isConnected: true }
  const doc = Object.assign(new EventTarget(), {
    fullscreenElement: null,
    querySelectorAll: () => [foreground, background, alreadyMuted]
  })
  const stop = observeFullscreenAudio(doc)
  doc.fullscreenElement = { contains: (video) => video === foreground }
  doc.dispatchEvent(new Event("fullscreenchange"))
  assert.equal(background.muted, true)
  assert.equal(foreground.muted, false)
  background.muted = false
  doc.dispatchEvent(new Event("volumechange"))
  assert.equal(background.muted, true)
  doc.fullscreenElement = null
  doc.dispatchEvent(new Event("fullscreenchange"))
  assert.equal(background.muted, false)
  assert.equal(alreadyMuted.muted, true)
  stop()
})

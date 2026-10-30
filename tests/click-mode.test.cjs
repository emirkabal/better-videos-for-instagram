const assert = require("node:assert/strict")
const test = require("node:test")
const loadSource = require("./load-source.cjs")
const { resolveClickMode, triggerNativeReels, isNativeReelClick } = loadSource(
  "src/utils/playback/click-mode.ts"
)

test("legacy preferences keep their behavior and the new selection wins", () => {
  assert.equal(resolveClickMode(undefined, false), "native")
  assert.equal(resolveClickMode(undefined, true), "pause")
  assert.equal(resolveClickMode(undefined), "pause")
  assert.equal(resolveClickMode("pause-reels", false), "pause-reels")
  assert.equal(resolveClickMode("native", true), "native")
  assert.equal(resolveClickMode("invalid", false), "native")
})

test("the Reels action bypasses pause interception only during its native click", () => {
  const video = {
    click() {
      assert.equal(isNativeReelClick(video), true)
    }
  }
  triggerNativeReels(video)
  assert.equal(isNativeReelClick(video), false)
  const anchor = {
    click() {
      assert.equal(isNativeReelClick(video), true)
    }
  }
  triggerNativeReels(video, anchor)
  assert.equal(isNativeReelClick(video), false)
  assert.throws(() =>
    triggerNativeReels(video, {
      click() {
        throw new Error("failed")
      }
    })
  )
  assert.equal(isNativeReelClick(video), false)
})

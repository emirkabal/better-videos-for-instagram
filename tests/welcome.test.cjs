const assert = require("node:assert/strict")
const test = require("node:test")
const loadSource = require("./load-source.cjs")
const { shouldShowWelcome } = loadSource("src/utils/extension/welcome.ts")

test("rebuilding/reloading the same extension version never opens welcome", () => {
  assert.equal(shouldShowWelcome("update", "1.3.2", "1.3.2"), false)
})
test("fresh installs open welcome and patches never open the update page", () => {
  assert.equal(shouldShowWelcome("install", "1.3.2"), true)
  assert.equal(shouldShowWelcome("update", "1.3.2", "1.3.1"), false)
  assert.equal(shouldShowWelcome("update", "1.3.2", "1.3.1", "1.3.2"), false)
  assert.equal(shouldShowWelcome("chrome_update", "1.3.2"), false)
  assert.equal(shouldShowWelcome("update", "1.5.1", "1.5.0"), false)
  assert.equal(shouldShowWelcome("update", "1.5.9", "1.5.0"), false)
})

test("feature/major updates respect opt-out, duplicate suppression and version order", () => {
  assert.equal(shouldShowWelcome("update", "1.6.0", "1.5.0"), true)
  assert.equal(shouldShowWelcome("update", "2.0.0", "1.9.9"), true)
  assert.equal(
    shouldShowWelcome("update", "1.6.0", "1.5.0", undefined, false),
    false
  )
  assert.equal(shouldShowWelcome("update", "1.6.0", "1.5.0", "1.6.0"), false)
  assert.equal(shouldShowWelcome("update", "1.5.0", "1.6.0"), false)
  assert.equal(shouldShowWelcome("update", "1.6.0", undefined), false)
  assert.equal(shouldShowWelcome("update", "invalid", "1.5.0"), false)
})

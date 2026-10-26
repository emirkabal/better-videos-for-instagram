const assert = require("node:assert/strict")
const test = require("node:test")
const loadSource = require("./load-source.cjs")
const { shouldShowWelcome } = loadSource("src/utils/welcome.ts")

test("rebuilding/reloading the same extension version never opens welcome", () => {
  assert.equal(shouldShowWelcome("update", "1.3.2", "1.3.2"), false)
})
test("fresh installs and actual version updates open welcome once", () => {
  assert.equal(shouldShowWelcome("install", "1.3.2"), true)
  assert.equal(shouldShowWelcome("update", "1.3.2", "1.3.1"), true)
  assert.equal(shouldShowWelcome("update", "1.3.2", "1.3.1", "1.3.2"), false)
  assert.equal(shouldShowWelcome("chrome_update", "1.3.2"), false)
})

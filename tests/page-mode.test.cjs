const assert = require("node:assert/strict")
const test = require("node:test")
const loadSource = require("./load-source.cjs")
const { getPageMode } = loadSource("src/utils/page-mode.ts")

test("Reel URL changes keep the same variant; home, posts and messages use the global variant", () => {
  for (const route of ["/reels/", "/reel/first/", "/reels/next/"])
    assert.equal(getPageMode(route), "reels")
  assert.equal(getPageMode("/stories/account/123/"), "stories")
  for (const route of ["/", "/p/post/", "/direct/t/123/", "/account/"])
    assert.equal(getPageMode(route), "global")
})

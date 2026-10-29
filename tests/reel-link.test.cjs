const assert = require("node:assert/strict")
const test = require("node:test")
const loadSource = require("./load-source.cjs")

const { toInstagramReelUrl, getNativeReelUrl } = loadSource(
  "src/utils/reel-link.ts",
  { URL }
)

test("native Reel links preserve the current video's shortcode", () => {
  for (const href of [
    "/reel/AbC_123-x/",
    "/reels/AbC_123-x/?utm_source=feed",
    "https://instagram.com/reel/AbC_123-x/"
  ]) {
    assert.equal(
      toInstagramReelUrl(href),
      "https://www.instagram.com/reel/AbC_123-x/"
    )
  }
})

test("unrelated URLs and navigation pages are not treated as a specific Reel", () => {
  for (const href of [
    null,
    "",
    "/reels/",
    "/reels/audio/",
    "/reels/audio/123/",
    "/p/post/",
    "https://example.com/reel/abc/",
    "javascript:alert(1)"
  ]) {
    assert.equal(toInstagramReelUrl(href), null)
  }
})

function makeVideo(href, savedHref, links = []) {
  const anchor = {
    getAttribute: (name) => (name === "href" ? href : savedHref)
  }
  const article = {
    querySelectorAll: () => links.map((href) => ({ getAttribute: () => href }))
  }
  return { closest: (selector) => (selector === "a" ? anchor : article) }
}

test("click-to-pause does not lose the original Reel destination", () => {
  const video = makeVideo(null, "/reel/current/")
  assert.equal(
    getNativeReelUrl(video),
    "https://www.instagram.com/reel/current/"
  )
})

test("a recycled video's new native link wins over the saved link", () => {
  const video = makeVideo("/reel/new/", "/reel/old/")
  assert.equal(getNativeReelUrl(video), "https://www.instagram.com/reel/new/")
})

test("the enclosing video link wins over other Reels mentioned in a post", () => {
  const video = makeVideo("/reel/current/", null, ["/reel/other/"])
  assert.equal(
    getNativeReelUrl(video),
    "https://www.instagram.com/reel/current/"
  )
})

test("an unambiguous link in the same post can open that Reel", () => {
  const video = makeVideo(null, null, [
    "/account/",
    "/reel/current/",
    "/reels/current/?source=feed"
  ])
  assert.equal(
    getNativeReelUrl(video),
    "https://www.instagram.com/reel/current/"
  )
})

test("ambiguous or missing links never open another video", () => {
  assert.equal(
    getNativeReelUrl(makeVideo(null, null, ["/reel/one/", "/reel/two/"])),
    null
  )
  assert.equal(getNativeReelUrl({ closest: () => null }), null)
})

const assert = require("node:assert/strict")
const test = require("node:test")
const loadSource = require("./load-source.cjs")

const { getSpritePosition } = loadSource(
  "src/components/Controller/ProgressBarHorizontal/InstagramSpritePreview.tsx"
)
const sheet = {
  mediaId: "123_456",
  maxThumbnailsPerSprite: 4,
  thumbnailsPerRow: 2,
  thumbnailDuration: 1,
  spriteUrls: ["first.jpg", "second.jpg"]
}

test("sprite boundaries select the next sheet's first cell", () => {
  const position = getSpritePosition(4, sheet, 100, 50)
  assert.equal(position.spriteIndex, 1)
  assert.equal(position.backgroundPosition, "-0px -0px")
})

test("end-of-video previews clamp to the last cell instead of wrapping", () => {
  for (const time of [8, 12, 100]) {
    const position = getSpritePosition(time, sheet, 100, 50)
    assert.equal(position.spriteIndex, 1)
    assert.equal(position.backgroundPosition, "-100px -50px")
  }
})

test("negative preview time clamps to the first cell", () => {
  const position = getSpritePosition(-1, sheet, 100, 50)
  assert.equal(position.spriteIndex, 0)
  assert.equal(position.backgroundPosition, "-0px -0px")
})

test("invalid sprite metadata and time cannot produce invalid CSS", () => {
  for (const invalid of [
    { thumbnailDuration: Infinity },
    { maxThumbnailsPerSprite: 1.5 },
    { thumbnailsPerRow: 0 },
    { spriteUrls: [] }
  ])
    assert.equal(getSpritePosition(1, { ...sheet, ...invalid }, 100, 50), null)
  assert.equal(getSpritePosition(NaN, sheet, 100, 50), null)
})

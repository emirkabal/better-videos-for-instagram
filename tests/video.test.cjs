const assert = require("node:assert/strict")
const test = require("node:test")
const loadSource = require("./load-source.cjs")

function video({
  top = 100,
  left = 100,
  width = 400,
  height = 600,
  paused = false,
  hidden = false,
  src = "blob:reel"
} = {}) {
  return {
    src,
    currentSrc: src,
    paused,
    ended: false,
    readyState: 4,
    closest: () => (hidden ? {} : null),
    getBoundingClientRect: () => ({
      top,
      left,
      width,
      height,
      right: left + width,
      bottom: top + height
    })
  }
}

const { getActiveInstagramVideo } = loadSource("src/utils/video.ts", {
  window: { innerWidth: 1200, innerHeight: 800 }
})

test("offscreen playback does not outrank a visible paused Reel", () => {
  const visible = video({ paused: true })
  assert.equal(getActiveInstagramVideo([video({ top: 900 }), visible]), visible)
})

test("no active video when all candidates are hidden, offscreen or empty", () => {
  assert.equal(
    getActiveInstagramVideo([
      video({ top: -700 }),
      video({ left: 1500 }),
      video({ hidden: true }),
      video({ width: 0 })
    ]),
    null
  )
  assert.equal(getActiveInstagramVideo([]), null)
})

test("visible playing videos take priority over paused videos", () => {
  const playing = video({ top: 400 })
  assert.equal(
    getActiveInstagramVideo([video({ paused: true }), playing]),
    playing
  )
})

test("the most visible playing video wins regardless of DOM order", () => {
  const centered = video()
  const edge = video({ top: 550 })
  assert.equal(getActiveInstagramVideo([edge, centered]), centered)
  assert.equal(getActiveInstagramVideo([centered, edge]), centered)
})

test("unrelated non-Instagram videos are ignored", () => {
  assert.equal(
    getActiveInstagramVideo([video({ src: "https://example.test/video.mp4" })]),
    null
  )
})

test("each candidate's geometry is read once per selection", () => {
  let reads = 0
  const candidate = video()
  const rect = candidate.getBoundingClientRect()
  candidate.getBoundingClientRect = () => {
    reads += 1
    return rect
  }
  getActiveInstagramVideo([candidate])
  assert.equal(reads, 1)
})

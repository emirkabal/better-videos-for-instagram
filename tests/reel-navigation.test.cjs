const assert = require("node:assert/strict")
const test = require("node:test")
const loadSource = require("./load-source.cjs")
const { navigateReel, getReelScroller } = loadSource(
  "src/utils/reel-navigation.ts",
  { Event }
)

function setup() {
  let id = 0
  const timers = new Map(),
    positions = []
  const clock = {
    setTimeout(fn) {
      timers.set(++id, fn)
      return id
    },
    clearTimeout(id) {
      timers.delete(id)
    }
  }
  const scroller = Object.assign(new EventTarget(), {
    clientHeight: 600,
    scrollHeight: 1200,
    scrollTop: 600,
    isConnected: true,
    scrollTo({ top }) {
      this.scrollTop = top
      positions.push(top)
    }
  })
  const doc = {
    querySelector: () => scroller,
    defaultView: { getComputedStyle: (node) => node.style }
  }
  const video = { ownerDocument: doc, parentElement: null }
  return {
    scroller,
    video,
    clock,
    positions,
    timers,
    tick() {
      const batch = [...timers.values()]
      timers.clear()
      batch.forEach((fn) => fn())
    }
  }
}

test("a next request at the loaded boundary continues after delayed pagination without another click", () => {
  const { video, scroller, clock, tick, positions } = setup()
  let cancel
  cancel = navigateReel(video, 1, clock, () => {
    if (scroller.scrollTop === 1200) cancel()
  })
  tick()
  assert.equal(scroller.scrollTop, 600)
  tick()
  assert.equal(
    scroller.scrollTop,
    599,
    "nudge prompts lazy-load sentinels again"
  )
  scroller.scrollHeight = 2400
  tick()
  assert.equal(scroller.scrollTop, 1200)
  tick()
  assert.deepEqual(
    positions,
    [600, 599, 1200],
    "one request advances exactly one Reel"
  )
})

test("closing or changing the source cancels pending pagination, and retries are bounded", () => {
  const { video, clock, tick, timers, positions } = setup()
  const cancel = navigateReel(video, 1, clock, () => {})
  tick()
  cancel()
  tick()
  assert.equal(positions.length, 1)
  navigateReel(video, 1, clock, () => {})
  for (let i = 0; i < 40; i++) tick()
  assert.equal(timers.size, 0)
  assert.equal(positions.length, 33)
})

test("navigation uses the video's real scroll ancestor instead of an unrelated main child", () => {
  const { video, scroller } = setup()
  const nested = {
    clientHeight: 500,
    style: { overflowY: "auto", scrollSnapType: "none" },
    parentElement: null
  }
  video.parentElement = {
    clientHeight: 400,
    style: { overflowY: "hidden", scrollSnapType: "none" },
    parentElement: nested
  }
  assert.equal(getReelScroller(video), nested)
  assert.notEqual(getReelScroller(video), scroller)
})

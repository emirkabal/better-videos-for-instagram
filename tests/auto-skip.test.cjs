const assert = require("node:assert/strict")
const test = require("node:test")
const loadSource = require("./load-source.cjs")
const { observeAutoSkip } = loadSource("src/utils/playback/auto-skip.ts")

function setup(loop = true) {
  const video = Object.assign(new EventTarget(), {
    currentTime: 0,
    duration: 10,
    paused: false,
    ended: false,
    loop
  })
  const frames = new Map()
  let id = 0,
    advances = 0,
    allowed = true
  const cleanup = observeAutoSkip(
    video,
    () => allowed,
    () => advances++,
    {
      requestAnimationFrame(fn) {
        frames.set(++id, fn)
        return id
      },
      cancelAnimationFrame(id) {
        frames.delete(id)
      }
    }
  )
  return {
    video,
    cleanup,
    frames,
    get advances() {
      return advances
    },
    set allowed(value) {
      allowed = value
    },
    time(value) {
      video.currentTime = value
      video.dispatchEvent(new Event("timeupdate"))
    },
    event(name) {
      video.dispatchEvent(new Event(name))
    }
  }
}
test("natural playback advances once before looping, and again on a later replay", () => {
  const s = setup()
  s.time(9.7)
  s.time(9.95)
  s.time(9.99)
  s.event("ended")
  assert.equal(s.advances, 1)
  s.time(0)
  s.time(9.7)
  s.time(9.95)
  assert.equal(s.advances, 2)
  s.cleanup()
})
test("manual seeking to the end and paused videos do not auto-advance", () => {
  const s = setup()
  s.time(0.5)
  s.event("seeking")
  s.time(9.99)
  s.event("seeked")
  s.event("ended")
  assert.equal(s.advances, 0)
  s.video.paused = true
  s.time(9.995)
  assert.equal(s.advances, 0)
  s.cleanup()
})
test("comments/inactive videos block advance; normal playback uses ended", () => {
  const s = setup(false)
  s.time(9.7)
  s.time(9.95)
  assert.equal(s.advances, 0)
  s.allowed = false
  s.event("ended")
  assert.equal(s.advances, 0)
  s.allowed = true
  s.event("ended")
  assert.equal(s.advances, 1)
  s.cleanup()
})
test("source changes reset completion and cleanup cancels listeners and frames", () => {
  const s = setup()
  s.time(9.7)
  s.time(9.95)
  s.event("emptied")
  s.time(0)
  s.time(9.7)
  s.time(9.95)
  assert.equal(s.advances, 2)
  s.cleanup()
  assert.equal(s.frames.size, 0)
  s.time(0)
  s.time(9.7)
  s.time(9.95)
  assert.equal(s.advances, 2)
})

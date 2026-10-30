const assert = require("node:assert/strict")
const test = require("node:test")
const loadSource = require("./load-source.cjs")

function setup() {
  const frames = new Map()
  let nextFrame = 0
  const document = new EventTarget()
  document.hidden = false
  const video = Object.assign(new EventTarget(), {
    duration: 100,
    currentTime: 20,
    paused: false,
    ended: false
  })
  const api = loadSource("src/utils/playback/progress.ts", {
    document,
    requestAnimationFrame: (callback) => {
      frames.set(++nextFrame, callback)
      return nextFrame
    },
    cancelAnimationFrame: (id) => frames.delete(id)
  })
  const painted = []
  const cleanup = api.observePlaybackProgress(video, (progress) =>
    painted.push(progress)
  )
  const step = () => {
    const callbacks = [...frames.values()]
    frames.clear()
    callbacks.forEach((callback) => callback())
  }
  return { api, video, document, frames, painted, step, cleanup }
}

test("playback follows the media clock on every frame without timeupdate events", () => {
  const { video, painted, frames, step, cleanup } = setup()
  for (const time of [20.016, 20.033, 20.05]) {
    video.currentTime = time
    step()
    assert.ok(Math.abs(painted.at(-1) - time) < 0.00001)
    assert.equal(frames.size, 1)
  }
  cleanup()
})

test("pause and buffering stop animation; playback resumes with one frame loop", () => {
  const { video, frames, step, painted, cleanup } = setup()
  video.paused = true
  video.dispatchEvent(new Event("pause"))
  assert.equal(frames.size, 0)
  video.currentTime = 30
  video.dispatchEvent(new Event("timeupdate"))
  assert.equal(painted.at(-1), 30)
  video.paused = false
  video.dispatchEvent(new Event("play"))
  video.dispatchEvent(new Event("playing"))
  assert.equal(frames.size, 1)
  video.dispatchEvent(new Event("waiting"))
  assert.equal(frames.size, 0)
  video.dispatchEvent(new Event("playing"))
  step()
  assert.equal(frames.size, 1)
  cleanup()
})

test("seeking and looping snap directly to the correct position", () => {
  const { video, frames, painted, step, cleanup } = setup()
  video.currentTime = 80
  video.dispatchEvent(new Event("seeking"))
  assert.equal(painted.at(-1), 80)
  assert.equal(frames.size, 0)
  video.dispatchEvent(new Event("seeked"))
  assert.equal(frames.size, 1)
  video.currentTime = 0
  step()
  assert.equal(painted.at(-1), 0)
  cleanup()
})

test("hidden tabs stop animating and resynchronize when shown", () => {
  const { video, document, frames, painted, cleanup } = setup()
  document.hidden = true
  document.dispatchEvent(new Event("visibilitychange"))
  assert.equal(frames.size, 0)
  video.currentTime = 45
  document.hidden = false
  document.dispatchEvent(new Event("visibilitychange"))
  assert.equal(painted.at(-1), 45)
  assert.equal(frames.size, 1)
  cleanup()
})

test("cleanup removes subscriptions and cancels pending animation", () => {
  const { video, document, frames, painted, cleanup } = setup()
  cleanup()
  const count = painted.length
  video.dispatchEvent(new Event("play"))
  video.dispatchEvent(new Event("timeupdate"))
  document.dispatchEvent(new Event("visibilitychange"))
  assert.equal(frames.size, 0)
  assert.equal(painted.length, count)
})

test("invalid durations and media positions cannot produce invalid transforms", () => {
  const { api, video, cleanup } = setup()
  for (const duration of [0, NaN, Infinity, -1]) {
    video.duration = duration
    assert.equal(api.getPlaybackProgress(video), 0)
  }
  video.duration = 100
  for (const [currentTime, expected] of [
    [-1, 0],
    [200, 100],
    [NaN, 0]
  ]) {
    video.currentTime = currentTime
    assert.equal(api.getPlaybackProgress(video), expected)
  }
  cleanup()
})

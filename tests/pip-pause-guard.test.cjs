const assert = require("node:assert/strict")
const test = require("node:test")
const loadSource = require("./load-source.cjs")

test("Feed fullscreen pins its source and blocks other autoplay, while explicit pause and exit work", async () => {
  class Media {
    pauses = 0
    plays = 0
    pause() {
      this.pauses++
    }
    play() {
      this.plays++
      return Promise.resolve()
    }
  }
  class Video extends Media {
    ended = false
    intended = "true"
    getAttribute() {
      return this.intended
    }
  }
  const source = new Video()
  const background = new Video()
  const doc = {
    hidden: false,
    hasFocus: () => true,
    fullscreenElement: { contains: (value) => value === source },
    querySelector: () => source
  }
  loadSource("src/features/instagram/bridges/pip-pause-guard.ts", {
    window: {},
    document: doc,
    HTMLMediaElement: Media,
    HTMLVideoElement: Video
  }).installPipPauseGuard()
  source.pause()
  assert.equal(
    source.pauses,
    0,
    "Instagram's reflow pause cannot stop the selected source"
  )
  await background.play()
  assert.equal(background.plays, 0, "the second Feed video cannot start")
  source.intended = "false"
  source.pause()
  assert.equal(source.pauses, 1, "user pause still works")
  doc.fullscreenElement = null
  await background.play()
  source.pause()
  assert.equal(background.plays, 1)
  assert.equal(
    source.pauses,
    2,
    "stale markers cannot affect ordinary playback"
  )
})

test("the MAIN-world guard protects only a playing source in a live PiP session", () => {
  class Media {
    pauses = 0
    pause() {
      this.pauses++
    }
  }
  class Video extends Media {
    ended = false
    intended = "true"
    getAttribute() {
      return this.intended
    }
  }
  const pipWindow = { closed: false }
  const document = {
    hidden: true,
    hasFocus: () => false,
    pictureInPictureElement: null
  }
  const window = { documentPictureInPicture: { window: pipWindow } }
  loadSource("src/features/instagram/bridges/pip-pause-guard.ts", {
    window,
    document,
    HTMLMediaElement: Media,
    HTMLVideoElement: Video
  }).installPipPauseGuard()
  const source = new Video()
  source.pause()
  assert.equal(source.pauses, 0)
  source.intended = "false"
  source.pause()
  assert.equal(source.pauses, 1, "explicit PiP pause is allowed")
  source.intended = "true"
  document.hidden = false
  document.hasFocus = () => true
  source.pause()
  assert.equal(source.pauses, 2, "focused main-page pause is allowed")
  document.hidden = true
  pipWindow.closed = true
  source.pause()
  assert.equal(
    source.pauses,
    3,
    "a stale marker after extension reload cannot block ordinary pause"
  )
  const unrelated = new Video()
  unrelated.intended = null
  unrelated.pause()
  assert.equal(unrelated.pauses, 1)
  const audio = new Media()
  audio.pause()
  assert.equal(audio.pauses, 1)
})

test("only live Reel PiP keeps pagination visible/focused and native state returns on close", () => {
  class Doc {
    background = true
    focused = false
    marker = null
    get hidden() {
      return this.background
    }
    get visibilityState() {
      return this.background ? "hidden" : "visible"
    }
    hasFocus() {
      return this.focused
    }
    documentElement = { getAttribute: () => this.marker }
  }
  class Media {
    pauses = 0
    pause() {
      this.pauses++
    }
  }
  class Video extends Media {
    ended = false
    getAttribute() {
      return "true"
    }
  }
  const document = new Doc(),
    pip = { closed: false }
  const window = { documentPictureInPicture: { window: pip } }
  loadSource("src/features/instagram/bridges/pip-pause-guard.ts", {
    Document: Doc,
    window,
    document,
    HTMLMediaElement: Media,
    HTMLVideoElement: Video
  }).installPipPauseGuard()
  assert.equal(
    document.hidden,
    true,
    "feed PiP does not change page visibility"
  )
  document.marker = "true"
  assert.equal(document.hidden, false)
  assert.equal(document.visibilityState, "visible")
  assert.equal(document.hasFocus(), true)
  const source = new Video()
  source.pause()
  assert.equal(
    source.pauses,
    0,
    "pause guard still reads real focus/visibility"
  )
  pip.closed = true
  assert.equal(document.hidden, true)
  assert.equal(document.visibilityState, "hidden")
  assert.equal(document.hasFocus(), false)
  source.pause()
  assert.equal(source.pauses, 1)
  pip.closed = false
  document.marker = null
  assert.equal(
    document.hidden,
    true,
    "removing the session marker also restores native values"
  )
})

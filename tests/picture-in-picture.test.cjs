const assert = require("node:assert/strict")
const test = require("node:test")
const loadSource = require("./load-source.cjs")

function setup(native = false) {
  let captured = []
  const scrolls = []
  const timers = new Map()
  const windowRequests = []
  let timerId = 0
  const clock = {
    setTimeout(callback) {
      const id = ++timerId
      timers.set(id, callback)
      return id
    },
    clearTimeout(id) {
      timers.delete(id)
    }
  }
  const scroller = Object.assign(new EventTarget(), {
    clientHeight: 600,
    scrollTop: 600,
    scrollHeight: 1800,
    isConnected: true,
    scrollTo(options) {
      scrolls.push(options)
      this.scrollTop = options.top
    }
  })
  const attributes = new Map()
  const mainDocument = Object.assign(new EventTarget(), {
    documentElement: {
      setAttribute: (key, value) => attributes.set(key, value),
      removeAttribute: (key) => attributes.delete(key),
      getAttribute: (key) => attributes.get(key)
    },
    querySelector: () => scroller,
    scrollingElement: scroller,
    querySelectorAll: () => [],
    hidden: false,
    hasFocus: () => true,
    pictureInPictureEnabled: native,
    pictureInPictureElement: null
  })
  const pipWindow = Object.assign(new EventTarget(), {
    ...clock,
    closed: false,
    close() {
      this.closed = true
      this.dispatchEvent(new Event("pagehide"))
    }
  })
  const nodes = []
  const node = (tag) => {
    const element = {
      tag,
      children: [],
      append(...children) {
        this.children.push(...children)
      },
      setAttribute() {},
      click() {
        this.onclick?.()
      },
      play: () => Promise.resolve()
    }
    nodes.push(element)
    return element
  }
  pipWindow.document = {
    title: "",
    documentElement: {},
    head: node("head"),
    body: node("body"),
    createElement: node
  }
  const opener = Object.assign(new EventTarget(), {
    ...clock,
    documentPictureInPicture: native
      ? undefined
      : {
          requestWindow: async (options) => {
            windowRequests.push(options)
            return pipWindow
          }
        }
  })
  class Stream {
    constructor(tracks = []) {
      this.tracks = tracks
    }
    getTracks() {
      return this.tracks
    }
    getVideoTracks() {
      return this.tracks.filter((track) => track.kind === "video")
    }
  }
  function video(id, readyState = 4) {
    const attributes = new Map()
    const element = Object.assign(new EventTarget(), {
      id,
      ownerDocument: mainDocument,
      parentElement: null,
      readyState,
      videoWidth: 240,
      videoHeight: 480,
      paused: false,
      muted: false,
      disablePictureInPicture: false,
      setAttribute(key, value) {
        attributes.set(key, value)
      },
      getAttribute(key) {
        return attributes.get(key) ?? null
      },
      removeAttribute(key) {
        attributes.delete(key)
      },
      captureStream() {
        const track = {
          id,
          kind: "video",
          stopped: false,
          stop() {
            this.stopped = true
          }
        }
        captured.push(track)
        return new Stream([track])
      },
      async requestPictureInPicture() {
        const previous = mainDocument.pictureInPictureElement
        mainDocument.pictureInPictureElement = this
        previous?.dispatchEvent(new Event("leavepictureinpicture"))
        return {}
      },
      play() {
        this.paused = false
        this.dispatchEvent(new Event("play"))
        return Promise.resolve()
      },
      pause() {
        if (this.paused) return
        this.paused = true
        this.dispatchEvent(new Event("pause"))
      }
    })
    return element
  }
  mainDocument.exitPictureInPicture = async () => {
    mainDocument.pictureInPictureElement = null
  }
  const { PictureInPictureController } = loadSource(
    "src/utils/pip/controller.ts",
    {
      window: opener,
      document: mainDocument,
      MediaStream: Stream,
      chrome: { i18n: { getMessage: () => "", getUILanguage: () => "en" } },
      localStorage: { setItem() {} },
      StorageEvent: Event,
      HTMLElement: Object,
      Event
    }
  )
  return {
    controller: new PictureInPictureController(),
    video,
    pipWindow,
    nodes,
    captured,
    scrolls,
    windowRequests,
    runTimers() {
      const batch = [...timers.values()]
      timers.clear()
      batch.forEach((callback) => callback())
    },
    document: mainDocument
  }
}

test("Document PiP follows the next Reel without opening a new window", async () => {
  const { controller, video, pipWindow, nodes, captured, windowRequests } =
    setup()
  const first = video("first"),
    second = video("second")
  await controller.toggle(first, true)
  assert.equal(windowRequests[0].width / windowRequests[0].height, 9 / 16)
  const mirror = nodes.find((node) => node.tag === "video")
  assert.equal(mirror.srcObject.getVideoTracks()[0].id, "first")
  controller.follow(second)
  assert.equal(mirror.srcObject.getVideoTracks()[0].id, "second")
  assert.equal(captured[0].stopped, true)
  assert.equal(pipWindow.closed, false)
  assert.equal(controller.getSnapshot(), true)
  controller.close()
  assert.ok(captured.every((track) => track.stopped))
})

test("a loading next Reel can replace a removed old video when data arrives", async () => {
  const { controller, video, pipWindow, nodes } = setup()
  const first = video("first"),
    next = video("next", 0)
  await controller.toggle(first, true)
  controller.follow(next)
  assert.equal(pipWindow.closed, false)
  next.readyState = 4
  next.dispatchEvent(new Event("loadeddata"))
  assert.equal(
    nodes.find((node) => node.tag === "video").srcObject.getVideoTracks()[0].id,
    "next"
  )
  first.dispatchEvent(new Event("playing"))
  assert.equal(
    nodes.find((node) => node.tag === "video").srcObject.getVideoTracks()[0].id,
    "next",
    "obsolete source cannot overwrite current stream"
  )
  controller.close()
})

test("closing PiP prevents later autoplay from reopening it", async () => {
  const { controller, video, pipWindow, captured } = setup()
  const first = video("first")
  await controller.toggle(first, true)
  pipWindow.close()
  assert.equal(controller.getSnapshot(), false)
  const count = captured.length
  controller.follow(video("next"))
  first.dispatchEvent(new Event("playing"))
  assert.equal(captured.length, count)
})

test("regular video PiP does not follow unrelated Reels", async () => {
  const { controller, video, nodes } = setup()
  await controller.toggle(video("feed"), false)
  controller.follow(video("unrelated"))
  assert.equal(
    nodes.find((node) => node.tag === "video").srcObject.getVideoTracks()[0].id,
    "feed"
  )
  controller.close()
})

test("native PiP handoff ignores the previous video's leave event", async () => {
  const { controller, video, document } = setup(true)
  await controller.toggle(video("first"), true)
  const next = video("next")
  controller.follow(next)
  await new Promise(setImmediate)
  assert.equal(document.pictureInPictureElement, next)
  assert.equal(controller.getSnapshot(), true)
  controller.close()
})

test("focus loss resumes Instagram's automatic pause, but an explicit PiP pause stays paused", async () => {
  const { controller, video, document } = setup()
  const source = video("feed")
  await controller.toggle(source)
  document.hasFocus = () => false
  source.pause()
  assert.equal(source.paused, false)
  await new Promise(setImmediate)
  controller.setPlaying(false)
  assert.equal(source.paused, true)
  assert.equal(source.getAttribute("data-bigv-pip-playing"), "false")
  await new Promise(setImmediate)
  assert.equal(source.paused, true)
  controller.setPlaying(true)
  assert.equal(source.paused, false)
  controller.close()
  assert.equal(source.getAttribute("data-bigv-pip-playing"), null)
  source.pause()
  assert.equal(source.paused, true, "closing restores ordinary pause behavior")
})

test("a focused main-page pause remains intentional and is preserved on handoff", async () => {
  const { controller, video } = setup()
  const first = video("first"),
    next = video("next")
  await controller.toggle(first, true)
  first.pause()
  next.paused = true
  controller.follow(next)
  assert.equal(next.paused, true)
  assert.equal(first.getAttribute("data-bigv-pip-playing"), null)
  controller.close()
})

test("the shared controls renderer follows the source and is disposed on close", async () => {
  const { controller, video } = setup()
  const updates = []
  let destroyed = 0
  controller.setControlsRenderer((_host, actions) => {
    assert.equal(actions.followReels, true)
    return {
      update: (source) => updates.push(source.id),
      destroy: () => destroyed++
    }
  })
  await controller.toggle(video("first"), true)
  controller.follow(video("second"))
  assert.deepEqual(updates, ["first", "second"])
  controller.close()
  assert.equal(destroyed, 1)
})

test("PiP previous/next scroll one Reel in either direction, only during a Reel session", async () => {
  const { controller, video, scrolls, runTimers } = setup()
  let actions
  controller.setControlsRenderer((_host, controls) => {
    actions = controls
    return { update() {}, destroy() {} }
  })
  await controller.toggle(video("first"), true)
  actions.previous()
  runTimers()
  actions.next()
  runTimers()
  assert.equal(scrolls[0].top, 0)
  assert.equal(scrolls[1].top, 600)
  controller.close()
  actions.previous()
  assert.equal(scrolls.length, 2)
  await controller.toggle(video("feed"), false)
  actions.next()
  actions.previous()
  assert.equal(scrolls.length, 2, "feed PiP cannot scroll the Reel list")
  controller.close()
})

test("clicking or pressing Space on the PiP video toggles the current source, including after a Reel handoff", async () => {
  const { controller, video, nodes } = setup()
  const first = video("first"),
    second = video("second")
  await controller.toggle(first, true)
  const mirror = nodes.find((node) => node.tag === "video")
  mirror.click()
  assert.equal(first.paused, true)
  mirror.onkeydown({ key: " ", preventDefault() {} })
  assert.equal(first.paused, false)
  controller.follow(second)
  mirror.click()
  assert.equal(second.paused, true)
  assert.equal(first.paused, true)
  controller.close()
})

test("changing the page variant closes Reel and feed PiP; another Reel does not", async () => {
  for (const [initial, destination] of [
    ["reels", "global"],
    ["reels", "stories"],
    ["global", "reels"]
  ]) {
    const { controller, video, pipWindow } = setup()
    controller.setPageMode(initial)
    await controller.toggle(video("source"), initial === "reels")
    controller.setPageMode(initial)
    assert.equal(pipWindow.closed, false)
    controller.setPageMode(destination)
    assert.equal(pipWindow.closed, true)
    assert.equal(controller.getSnapshot(), false)
  }
})

test("a variant change cancels a PiP window that is still opening", async () => {
  const { controller, video, pipWindow } = setup()
  controller.setPageMode("reels")
  const opening = controller.toggle(video("source"), true)
  controller.setPageMode("global")
  await opening
  assert.equal(pipWindow.closed, true)
  assert.equal(controller.getSnapshot(), false)
  assert.equal(controller.getPending(), false)
})

test("Story photo PiP follows photo/video/photo changes in one window and disposes captured tracks", async () => {
  const { controller, video, nodes, windowRequests, captured, pipWindow } =
    setup()
  const updates = []
  controller.setControlsRenderer(() => ({
    update: (media) => updates.push(media.id),
    updateImage: (media) => updates.push(media.id),
    destroy() {}
  }))
  const first = {
    tagName: "IMG",
    id: "photo1",
    currentSrc: "https://cdninstagram.com/1.jpg"
  }
  const second = {
    tagName: "IMG",
    id: "photo2",
    currentSrc: "https://cdninstagram.com/2.jpg"
  }
  controller.setPageMode("stories")
  await controller.toggleImageStory(first)
  const photo = nodes.find((node) => node.tag === "img")
  assert.equal(photo.src, first.currentSrc)
  controller.followStory(second)
  assert.equal(photo.src, second.currentSrc)
  const clip = video("story-video")
  clip.paused = true
  controller.followStory(clip)
  assert.equal(photo.hidden, true)
  assert.equal(clip.paused, false)
  controller.followStory(first)
  assert.equal(photo.hidden, false)
  assert.equal(photo.src, first.currentSrc)
  assert.equal(clip.paused, true)
  assert.equal(captured[0].stopped, true)
  assert.equal(windowRequests.length, 1)
  assert.deepEqual(updates, ["photo1", "photo2", "story-video", "photo1"])
  controller.close()
  assert.equal(pipWindow.closed, true)
  controller.followStory(second)
  assert.equal(
    windowRequests.length,
    1,
    "closed Story PiP never reopens on navigation"
  )
})

test("photo Story support is capability based and pending opens are cancelled on page changes", async () => {
  const nativeOnly = setup(true)
  assert.equal(nativeOnly.controller.supportedImageStory(), false)
  await assert.rejects(() =>
    nativeOnly.controller.toggleImageStory({ tagName: "IMG", src: "photo.jpg" })
  )
  const { controller, pipWindow } = setup()
  controller.setPageMode("stories")
  const opening = controller.toggleImageStory({
    tagName: "IMG",
    src: "photo.jpg"
  })
  controller.setPageMode("global")
  await opening
  assert.equal(pipWindow.closed, true)
  assert.equal(controller.getSnapshot(), false)
  assert.equal(controller.getPending(), false)
})

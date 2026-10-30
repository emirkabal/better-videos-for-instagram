const assert = require("node:assert/strict")
const test = require("node:test")
const loadSource = require("./load-source.cjs")
const { isNativeAudioControl, observeNativeAudioIntent, getAudioScope } =
  loadSource("src/features/instagram/media/native-audio-controls.ts", {
    setTimeout,
    clearTimeout
  })

function control(label, extension = false) {
  return {
    tagName: "BUTTON",
    getAttribute: (key) => (key === "aria-label" ? label : null),
    querySelectorAll: () => [],
    querySelector: () => null,
    closest: () => (extension ? {} : null)
  }
}

test("audio actions are recognized without hiding Tags, captions, soundtrack links or extension controls", () => {
  for (const label of [
    "Mute",
    "Unmute",
    "Audio is muted.",
    "Turn sound on",
    "Adjust volume",
    "Sesi aç",
    "Sesi kapat",
    "كتم الصوت",
    "إلغاء كتم الصوت",
    "Activer le son",
    "Ton aus",
    "Включить звук"
  ]) {
    assert.equal(isNativeAudioControl(control(label)), true, label)
  }
  for (const label of [
    "Tags",
    "Tagged people",
    "Play",
    "Audio",
    "Original audio",
    "Soundtrack",
    "Captions",
    "Fullscreen",
    "Mute account"
  ]) {
    assert.equal(isNativeAudioControl(control(label)), false, label)
  }
  assert.equal(isNativeAudioControl(control("Mute", true)), false)
})

test("nested native volume labels are checked separately and video containers never match audio", () => {
  const wrapper = control(null)
  wrapper.querySelectorAll = (selector) =>
    selector.startsWith("svg[viewBox")
      ? []
      : [control("Adjust volume"), control("Audio is muted")]
  assert.equal(isNativeAudioControl(wrapper), true)
  wrapper.querySelector = () => ({ tagName: "VIDEO" })
  assert.equal(isNativeAudioControl(wrapper), false)
})

test("audio scope reaches the live eight-wrapper layout, stops at another video and respects article boundaries", () => {
  const nodes = Array.from({ length: 12 }, () => ({
    tagName: "DIV",
    parentElement: null,
    getAttribute: () => null,
    querySelectorAll: () => [{}]
  }))
  nodes.forEach((node, i) => {
    node.parentElement = nodes[i + 1] ?? null
  })
  nodes[11].querySelectorAll = () => [{}, {}]
  const video = { parentElement: nodes[0] }
  assert.equal(getAudioScope(video), nodes[10])
  nodes[8].tagName = "ARTICLE"
  assert.equal(getAudioScope(video), nodes[8])
})

test("only explicit native audio actions update preferences, after the site's handler; cleanup cancels pending work", async () => {
  const listeners = new Map()
  const audio = control("Unmute")
  const tags = control("Tags")
  let started = 0,
    changes = 0
  const video = {
    ownerDocument: {
      addEventListener: (type, fn) => listeners.set(type, fn),
      removeEventListener: (type) => listeners.delete(type)
    },
    parentElement: { contains: (el) => el === audio || el === tags }
  }
  const stop = observeNativeAudioIntent(
    video,
    () => changes++,
    () => started++
  )
  const event = (target, isTrusted = true) => ({
    isTrusted,
    target: { closest: () => target }
  })
  listeners.get("click")(event(tags))
  listeners.get("click")(event(audio, false))
  assert.equal(started, 0)
  listeners.get("click")(event(audio))
  assert.equal(started, 1)
  assert.equal(changes, 0)
  await new Promise((resolve) => setTimeout(resolve, 5))
  assert.equal(changes, 1)
  listeners.get("click")(event(audio))
  stop()
  await new Promise((resolve) => setTimeout(resolve, 5))
  assert.equal(changes, 1)
  assert.equal(listeners.size, 0)
})

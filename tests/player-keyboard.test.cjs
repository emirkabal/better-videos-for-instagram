const assert = require("node:assert/strict")
const test = require("node:test")
const loadSource = require("./load-source.cjs")
class DetailEvent extends Event {
  constructor(type, options) {
    super(type)
    this.detail = options.detail
  }
}
const globals = { CustomEvent: DetailEvent }
const {
  getPlayerCommand,
  isKeyboardControl,
  runPlayerCommand,
  observePlayerKeyboard
} = loadSource("src/utils/playback/keyboard.ts", globals)
function video() {
  return Object.assign(new EventTarget(), {
    currentTime: 50,
    duration: 100,
    volume: 0.5,
    muted: false,
    paused: true,
    hasAttribute: () => false,
    play() {
      this.paused = false
      return Promise.resolve()
    },
    pause() {
      this.paused = true
    }
  })
}
class Key extends Event {
  constructor(key, options = {}) {
    super("keydown", { cancelable: true })
    Object.assign(this, { key, repeat: false, ...options })
  }
  composedPath() {
    return this.path ?? []
  }
}
test("conventional keys map to seeking, volume and toggles; modified and composing input stays native", () => {
  for (const [key, kind, amount] of [
    ["ArrowLeft", "seek", -5],
    ["ArrowRight", "seek", 5],
    ["j", "seek", -10],
    ["l", "seek", 10],
    ["ArrowUp", "volume", 5],
    ["ArrowDown", "volume", -5],
    ["+", "volume", 5],
    ["=", "volume", 5],
    ["-", "volume", -5],
    [" ", "play"],
    ["K", "play"],
    ["m", "mute"]
  ]) {
    const command = getPlayerCommand(new Key(key))
    assert.equal(command.kind, kind)
    assert.equal(command.amount, amount)
  }
  for (const options of [
    { ctrlKey: true },
    { metaKey: true },
    { altKey: true },
    { shiftKey: true },
    { isComposing: true }
  ])
    assert.equal(getPlayerCommand(new Key("k", options)), null)
  const prevented = new Key("k")
  prevented.preventDefault()
  assert.equal(getPlayerCommand(prevented), null)
  assert.equal(getPlayerCommand(new Key("Escape")), null)
  assert.equal(getPlayerCommand(new Key("+", { shiftKey: true })).amount, 5)
  assert.equal(
    getPlayerCommand(new Key("+", { ctrlKey: true, shiftKey: true })),
    null
  )
  assert.equal(
    getPlayerCommand(new Key("ن", { code: "KeyK" })).kind,
    "play",
    "physical letter shortcuts work with non-Latin keyboard layouts"
  )
})
test("vertical navigation passes through without prevention while plus/minus retain volume; policy follows route changes", () => {
  const doc = new EventTarget(),
    v = video()
  let volumeArrows = false,
    native = 0
  const stop = observePlayerKeyboard(doc, () => v, {
    volumeArrows: () => volumeArrows
  })
  doc.addEventListener("keydown", () => native++)
  for (const name of ["ArrowDown", "ArrowUp"]) {
    const key = new Key(name)
    doc.dispatchEvent(key)
    assert.equal(key.defaultPrevented, false)
  }
  assert.equal(v.volume, 0.5)
  assert.equal(native, 2)
  doc.dispatchEvent(new Key("+", { shiftKey: true }))
  assert.equal(v.volume, 0.55)
  doc.dispatchEvent(new Key("-"))
  assert.equal(v.volume, 0.5)
  assert.equal(native, 2)
  volumeArrows = true
  doc.dispatchEvent(new Key("ArrowUp"))
  assert.equal(v.volume, 0.55)
  assert.equal(native, 2)
  stop()
})
test("Reels Space and its repeats stay native; K still toggles and route changes restore Space", () => {
  const doc = new EventTarget(),
    v = video()
  let spaceToggle = false,
    native = 0
  const stop = observePlayerKeyboard(doc, () => v, {
    spaceToggle: () => spaceToggle
  })
  doc.addEventListener("keydown", () => native++)
  for (const repeat of [false, true]) {
    const key = new Key(" ", { repeat })
    doc.dispatchEvent(key)
    assert.equal(key.defaultPrevented, false)
  }
  assert.equal(v.paused, true)
  assert.equal(native, 2)
  doc.dispatchEvent(new Key("k"))
  assert.equal(v.paused, false)
  assert.equal(native, 2)
  spaceToggle = true
  doc.dispatchEvent(new Key(" "))
  assert.equal(v.paused, true)
  assert.equal(native, 2)
  stop()
})
test("typing and native interactive controls keep their keys, while a video surface is eligible", () => {
  const input = { tagName: "INPUT", closest: () => ({ matches: () => false }) }
  assert.equal(isKeyboardControl(input), true)
  assert.equal(
    isKeyboardControl({
      tagName: "DIV",
      isContentEditable: true,
      closest: () => null
    }),
    true
  )
  assert.equal(
    isKeyboardControl({ tagName: "VIDEO", closest: () => ({}) }),
    false
  )
  assert.equal(
    isKeyboardControl({
      tagName: "DIV",
      closest: () => ({
        matches: () => true,
        querySelector: () => ({ tagName: "VIDEO" })
      })
    }),
    false
  )
})
test("seeking clamps to media boundaries, preserves paused state and reports actual seconds", () => {
  const v = video(),
    feedback = []
  v.addEventListener("bigv-player-feedback", (e) => feedback.push(e.detail))
  const doc = {}
  v.currentTime = 98
  runPlayerCommand(v, { kind: "seek", amount: 5 }, doc)
  assert.equal(v.currentTime, 100)
  assert.equal(v.paused, true)
  assert.equal(feedback[0].value, 2)
  assert.equal(feedback[0].document, doc)
  v.currentTime = 3
  runPlayerCommand(v, { kind: "seek", amount: -10 }, doc)
  assert.equal(v.currentTime, 0)
  assert.equal(feedback[1].value, -3)
  v.duration = NaN
  runPlayerCommand(v, { kind: "seek", amount: 5 }, doc)
  assert.equal(v.currentTime, 0)
  assert.equal(feedback.length, 2)
})
test("audio intent is saved before volume changes, clamps extremes, and M restores audible volume from zero", () => {
  const v = video(),
    intents = []
  v.addEventListener("bigv-audio-intent", (e) =>
    intents.push({ before: v.volume, ...e.detail })
  )
  v.volume = 0.98
  runPlayerCommand(v, { kind: "volume", amount: 5 }, {})
  assert.equal(v.volume, 1)
  assert.equal(intents[0].before, 0.98)
  assert.equal(intents[0].savePreference, true)
  runPlayerCommand(v, { kind: "mute" }, {})
  assert.equal(v.muted, true)
  runPlayerCommand(v, { kind: "mute" }, {})
  assert.equal(v.muted, false)
  v.volume = 0.02
  runPlayerCommand(v, { kind: "volume", amount: -5 }, {})
  assert.equal(v.volume, 0)
  assert.equal(v.muted, true)
  runPlayerCommand(v, { kind: "mute" }, {})
  assert.equal(v.volume, 0.02)
  assert.equal(v.muted, false)
})
test("listener consumes handled keys once, allows repeated seeking but suppresses repeated toggles, and cleans up", () => {
  const doc = new EventTarget(),
    v = video()
  let native = 0
  const stop = observePlayerKeyboard(doc, () => v)
  doc.addEventListener("keydown", () => native++)
  doc.dispatchEvent(new Key("k"))
  assert.equal(v.paused, false)
  doc.dispatchEvent(new Key("k", { repeat: true }))
  assert.equal(v.paused, false)
  doc.dispatchEvent(new Key("ArrowRight", { repeat: true }))
  assert.equal(v.currentTime, 55)
  assert.equal(native, 0)
  doc.dispatchEvent(
    new Key("k", {
      path: [{ tagName: "INPUT", closest: () => ({ matches: () => false }) }]
    })
  )
  assert.equal(v.paused, false)
  assert.equal(native, 1)
  stop()
  doc.dispatchEvent(new Key("k"))
  assert.equal(v.paused, false)
  assert.equal(native, 2)
})
test("photo PiP arrows navigate Stories; unrelated keys and missing videos stay native", () => {
  const doc = new EventTarget(),
    directions = []
  let native = 0
  const stop = observePlayerKeyboard(doc, () => null, {
    photoNavigation: (d) => directions.push(d)
  })
  doc.addEventListener("keydown", () => native++)
  for (const key of ["ArrowRight", "ArrowLeft", "k", "l"])
    doc.dispatchEvent(new Key(key))
  assert.deepEqual(directions, [1, -1])
  assert.equal(native, 2)
  stop()
  observePlayerKeyboard(doc, () => null)
  const key = new Key("ArrowRight")
  doc.dispatchEvent(key)
  assert.equal(key.defaultPrevented, false)
})

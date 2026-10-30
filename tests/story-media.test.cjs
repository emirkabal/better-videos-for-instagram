const assert = require("node:assert/strict")
const test = require("node:test")
const loadSource = require("./load-source.cjs")

const view = {
  innerWidth: 1200,
  innerHeight: 850,
  getComputedStyle: (node) => ({
    display: "block",
    visibility: "visible",
    opacity: "1",
    ...node.style
  })
}
const { getActiveStoryMedia } = loadSource(
  "src/features/instagram/media/stories.ts",
  {
    URL,
    window: view
  }
)
function media(
  tagName,
  {
    left = 420,
    top = 30,
    width = 360,
    height = 600,
    src = "https://scontent.cdninstagram.com/story",
    hidden = false,
    style = {}
  } = {}
) {
  return {
    tagName,
    src,
    currentSrc: src,
    style,
    parentElement: null,
    closest: () => (hidden ? {} : null),
    getBoundingClientRect: () => ({
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height
    })
  }
}
const doc = (items, center = []) => ({
  defaultView: view,
  querySelectorAll: () => items,
  elementsFromPoint: () => center
})

test("Story media selects the central photo over adjacent playing video and skips avatars", () => {
  const photo = media("IMG")
  const adjacent = media("VIDEO", { left: 50, width: 250 })
  const avatar = media("IMG", { width: 40, height: 40 })
  assert.equal(getActiveStoryMedia(doc([adjacent, avatar, photo])), photo)
})
test("Story media respects visual stacking and excludes hidden, offscreen and unrelated images", () => {
  const video = media("VIDEO")
  const photo = media("IMG")
  assert.equal(getActiveStoryMedia(doc([video, photo], [photo, video])), photo)
  const items = [
    media("IMG", { hidden: true }),
    media("IMG", { style: { opacity: "0" } }),
    media("IMG", { top: 900 }),
    media("IMG", { src: "https://cdninstagram.com.evil.test/photo.png" })
  ]
  assert.equal(getActiveStoryMedia(doc(items)), null)
  assert.equal(
    getActiveStoryMedia(doc([media("IMG", { src: "blob:story" })])).tagName,
    "IMG"
  )
})

test("Story navigation uses visible native labels and skips extension or disabled buttons", () => {
  const { navigateStory } = loadSource(
    "src/features/instagram/navigation/stories.ts"
  )
  let clicks = 0
  function button(
    label,
    { extension = false, disabled = false, visible = true } = {}
  ) {
    const control = {
      getAttribute: (key) =>
        key === "aria-disabled" && disabled ? "true" : null,
      hasAttribute: () => false,
      getClientRects: () => (visible ? [{}] : []),
      click: () => clicks++
    }
    return {
      getAttribute: (key) => (key === "aria-label" ? label : null),
      closest: (selector) =>
        selector.includes("data-bigv") ? (extension ? {} : null) : control
    }
  }
  const source = {
    querySelectorAll: () => [
      button("Next Story", { extension: true }),
      button("Next", { disabled: true }),
      button("Next", { visible: false }),
      button("Next post"),
      button("Sonraki hikaye")
    ]
  }
  assert.equal(navigateStory(1, source), true)
  assert.equal(clicks, 1)
  assert.equal(navigateStory(-1, source), false)
  assert.equal(clicks, 1)
})

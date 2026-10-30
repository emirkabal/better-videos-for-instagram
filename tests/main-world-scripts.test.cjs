const assert = require("node:assert/strict")
const test = require("node:test")
const loadSource = require("./load-source.cjs")
const { registerMainWorldScripts } = loadSource(
  "src/utils/extension/main-world-scripts.ts"
)

function scripting(initial = []) {
  const registered = new Map(initial.map((script) => [script.id, script]))
  return {
    registered,
    async getRegisteredContentScripts() {
      return [...registered.values()]
    },
    async unregisterContentScripts({ ids }) {
      ids.forEach((id) => registered.delete(id))
    },
    async updateContentScripts(scripts) {
      for (const script of scripts) {
        assert.ok(registered.has(script.id))
        registered.set(script.id, script)
      }
    },
    async registerContentScripts(scripts) {
      for (const script of scripts) {
        assert.ok(!registered.has(script.id), "duplicate registration")
        registered.set(script.id, script)
      }
    }
  }
}

test("Plasmo registrations migrate once; restart repairs existing registrations without duplicates", async () => {
  const api = scripting([
    { id: "srcContentsInstagramPipMain", js: ["old-pip.js"] },
    { id: "srcContentsInstagramSpritesheetMain", js: ["old-preview.js"] },
    {
      id: "bigv-native-controls-main",
      js: ["instagram-native-controls-main.js"]
    },
    { id: "unrelated", js: ["leave-alone.js"] }
  ])
  await registerMainWorldScripts(api)
  await registerMainWorldScripts(api)
  assert.equal(api.registered.size, 3)
  assert.equal(api.registered.has("bigv-native-controls-main"), false)
  assert.deepEqual(api.registered.get("unrelated").js, ["leave-alone.js"])
  for (const id of ["bigv-pip-main", "bigv-spritesheet-main"]) {
    const script = api.registered.get(id)
    assert.equal(script.world, "MAIN")
    assert.equal(script.runAt, "document_start")
    assert.equal(script.persistAcrossSessions, true)
    assert.deepEqual([...script.matches], ["https://www.instagram.com/*"])
  }
  assert.deepEqual(
    [...api.registered.get("bigv-pip-main").js],
    ["instagram-pip-main.js"]
  )
})

test("fresh install and partially registered state both install all page scripts", async () => {
  for (const initial of [[], [{ id: "bigv-pip-main", js: ["stale.js"] }]]) {
    const api = scripting(initial)
    await registerMainWorldScripts(api)
    assert.equal(api.registered.size, 2)
    assert.deepEqual(
      [...api.registered.get("bigv-pip-main").js],
      ["instagram-pip-main.js"]
    )
  }
})

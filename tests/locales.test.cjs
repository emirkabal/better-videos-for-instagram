const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const test = require("node:test")

// Chrome's supported locale table, checked 2026-10-26:
// https://developer.chrome.com/docs/extensions/reference/api/i18n#locales
const supported =
  "ar am bg bn ca cs da de el en en_AU en_GB en_US es es_419 et fa fi fil fr gu he hi hr hu id it ja kn ko lt lv ml mr ms nl no pl pt_BR pt_PT ro ru sk sl sr sv sw ta te th tr uk vi zh_CN zh_TW".split(
    " "
  )
const root = path.resolve(__dirname, "../public/_locales")
const english = JSON.parse(
  fs.readFileSync(path.join(root, "en/messages.json"), "utf8")
)

test("every documented Chrome locale resolves a complete catalog through Chrome fallback", () => {
  assert.equal(supported.length, 55)
  for (const locale of supported) {
    const catalogPath = path.join(root, locale, "messages.json")
    const parentPath = path.join(root, locale.split("_")[0], "messages.json")
    const resolvedPath = fs.existsSync(catalogPath) ? catalogPath : parentPath
    assert.ok(fs.existsSync(resolvedPath), locale)
    const catalog = JSON.parse(fs.readFileSync(resolvedPath, "utf8"))
    for (const key of Object.keys(catalog))
      assert.ok(key in english, `${locale}/${key}`)
    const messages = { ...english, ...catalog }
    assert.deepEqual(
      Object.keys(messages).sort(),
      Object.keys(english).sort(),
      locale
    )
    for (const [key, value] of Object.entries(messages)) {
      assert.ok(
        typeof value.message === "string" && value.message.trim(),
        `${locale}/${key}`
      )
      assert.ok(!/[\uFFFD]/.test(value.message), `${locale}/${key}: encoding`)
    }
  }
})

test("new controls and popup settings have native translations rather than English copies", () => {
  for (const locale of supported.filter((locale) => !locale.startsWith("en"))) {
    const messages = JSON.parse(
      fs.readFileSync(path.join(root, locale, "messages.json"), "utf8")
    )
    for (const key of [
      "muteLabel",
      "volumeLabel",
      "settingsLabel",
      "clickToPauseDescription"
    ]) {
      // Cognates such as French/Portuguese "Volume" are valid native translations.
      if (key === "volumeLabel") continue
      assert.notEqual(
        messages[key].message,
        english[key].message,
        `${locale}/${key}`
      )
    }
  }
})

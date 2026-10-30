const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")

const target = process.argv[2]
assert.ok(
  ["chrome-mv3", "firefox-mv2"].includes(target),
  "Specify a production build target"
)
const root = path.resolve(__dirname, "../.output", target)
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "manifest.json"), "utf8")
)
const contract = require("../tests/fixtures/manifest-contract.json")[
  `${target}-prod`
]
for (const key of ["permissions", "host_permissions"]) {
  assert.deepEqual(
    [...(manifest[key] || [])].sort(),
    [...(contract[key] || [])].sort(),
    `${key} changed`
  )
}
assert.equal(manifest.default_locale, contract.default_locale)
if (contract.browser_specific_settings)
  assert.deepEqual(
    manifest.browser_specific_settings,
    contract.browser_specific_settings
  )
assert.deepEqual(
  [
    ...new Set(manifest.content_scripts.flatMap((script) => script.matches))
  ].sort(),
  [...contract.matches].sort()
)
for (const file of [
  "instagram-pip-main.js",
  "instagram-spritesheet-main.js",
  "popup.html",
  "welcome.html",
  "tabs/welcome.html",
  ...Object.values(manifest.icons)
]) {
  assert.ok(
    fs.existsSync(path.join(root, file)),
    `Missing extension resource: ${file}`
  )
}
for (const script of manifest.content_scripts) {
  for (const file of [...(script.js || []), ...(script.css || [])])
    assert.ok(
      fs.existsSync(path.join(root, file)),
      `Missing content resource: ${file}`
    )
  for (const file of script.css || []) {
    const css = fs.readFileSync(path.join(root, file), "utf8")
    for (const [, selector, declarations] of css.matchAll(
      /([^{}]+)\{([^{}]*)\}/g
    )) {
      if (/--welcome-[\w-]+\s*:|scroll-padding-top:\s*110px/.test(declarations))
        assert.ok(
          selector
            .split(",")
            .every((part) => part.includes(".bigv-welcome-document")),
          `Unscoped welcome styles in ${file}: ${selector}`
        )
      assert.ok(
        !/aria-label\s*=\s*["']?Video(?:\\ | )progress/.test(selector),
        `Language-specific native control override in ${file}`
      )
    }
  }
}
assert.ok(
  fs.existsSync(
    path.join(root, "_locales", manifest.default_locale, "messages.json")
  ),
  "Missing default locale"
)
console.log(
  `Checked ${target}: content resources, scoped welcome styles and default locale.`
)

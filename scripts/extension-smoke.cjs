// Load the real unpacked extension with real Chrome APIs, without a user profile
// or an Instagram account. Complements the media/UI fixture matrix.
const assert = require("node:assert/strict")
const path = require("node:path")
const { chromium } = require("playwright")

;(async () => {
  const extension = path.resolve(__dirname, "../.output/chrome-mv3")
  const context = await chromium.launchPersistentContext("", {
    channel: "chromium",
    headless: true,
    args: [
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`
    ]
  })
  context.setDefaultTimeout(10000)
  try {
    const worker =
      context.serviceWorkers()[0] ||
      (await context.waitForEvent("serviceworker"))
    const id = new URL(worker.url()).hostname
    await worker.evaluate(async () => {
      for (let i = 0; i < 100; i++) {
        const registered = await chrome.scripting.getRegisteredContentScripts()
        if (registered.length === 2) return
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
      throw new Error("MAIN scripts were not registered")
    })
    await worker.evaluate(() =>
      chrome.storage.sync.set({
        "bigv-controller-enabled": "false",
        "bigv-click-to-pause": "false",
        "bigv-update-page-enabled": "false"
      })
    )
    const page = await context.newPage()
    page.on("pageerror", (error) => console.error("Page error:", error.message))
    const media = require("node:fs").readFileSync(
      path.resolve(__dirname, "../src/assets/welcome/flower.mp4")
    )
    await page.route(
      "https://scontent.cdninstagram.com/fixture.mp4",
      (route) => {
        const range = /^bytes=(\d+)-(\d*)$/.exec(
          route.request().headers().range ?? ""
        )
        const start = range ? Number(range[1]) : 0
        const end = range?.[2]
          ? Math.min(Number(range[2]), media.length - 1)
          : media.length - 1
        return route.fulfill({
          status: range ? 206 : 200,
          contentType: "video/mp4",
          headers: {
            "accept-ranges": "bytes",
            "content-length": String(end - start + 1),
            ...(range
              ? { "content-range": `bytes ${start}-${end}/${media.length}` }
              : {})
          },
          body: media.subarray(start, end + 1)
        })
      }
    )
    await page.route("https://www.instagram.com/**", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<!doctype html><html lang="en"><head><script>
        window.guardAtStart = Boolean(window[Symbol.for("better-instagram-videos.pip-pause-guard")]);
        window.bridgeAtStart = Boolean(window[Symbol.for("better-instagram-videos.spritesheet-api-bridge-installed")]);
      </script></head><body><article style="width:360px;height:600px;position:relative"><a href="/reel/fixture/"><video preload="auto" style="width:100%;height:100%" src="https://scontent.cdninstagram.com/fixture.mp4"></video></a>${require("node:fs").readFileSync(path.resolve(__dirname, "../tests/fixtures/instagram-native-volume.html"), "utf8")}<button id="tags" aria-label="Tags">Tags</button></article></body></html>`
      })
    )
    await page.goto("https://www.instagram.com/")
    const disabled = await worker.evaluate(async () => {
      const [tab] = await chrome.tabs.query({
        url: "https://www.instagram.com/*"
      })
      for (let i = 0; i < 100; i++) {
        try {
          const state = await chrome.tabs.sendMessage(tab.id, {
            type: "bigv-diagnostics"
          })
          if (state.enabled === false && state.storageAvailable) return state
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
      throw new Error("Legacy disabled setting was not preserved")
    })
    assert.equal(disabled.controllers, 0)
    assert.equal(await page.locator("[data-bigv-controller]").count(), 0)
    assert.equal(
      await worker.evaluate(
        async () =>
          (await chrome.storage.sync.get("bigv-controller-enabled"))[
            "bigv-controller-enabled"
          ]
      ),
      "false",
      "startup never rewrites the legacy preference"
    )
    await worker.evaluate(() =>
      chrome.storage.sync.set({ "bigv-controller-enabled": true })
    )
    await page.waitForSelector("[data-bigv-ready]")
    assert.deepEqual(
      await page.evaluate(() => [window.guardAtStart, window.bridgeAtStart]),
      [true, true],
      "both MAIN scripts precede Instagram's first script"
    )
    const diagnostic = await worker.evaluate(async () => {
      const [tab] = await chrome.tabs.query({
        url: "https://www.instagram.com/*"
      })
      return chrome.tabs.sendMessage(tab.id, { type: "bigv-diagnostics" })
    })
    assert.equal(diagnostic.clickMode, "native")
    assert.equal(diagnostic.controllers, 1)
    await page.waitForFunction(
      () => document.querySelector("video").readyState >= 2
    )
    await page.locator("video").hover()
    await page.keyboard.press("ArrowRight")
    await page.waitForFunction(() => {
      const video = document.querySelector("video")
      return Math.abs(video.currentTime - Math.min(5, video.duration)) < 0.1
    })
    await page.locator(".bigv-player-feedback.is-forward.is-visible").waitFor()
    // Use real media and trusted key presses across the extension's isolated
    // world, rather than just the mocked media used in the browser matrix.
    await page.locator("video").evaluate((v) => (v.currentTime = 0))
    await page.waitForFunction(
      () =>
        !document.querySelector("video").seeking &&
        document.querySelector("video").currentTime < 0.1
    )
    await page.keyboard.press("k")
    await page.waitForFunction(() => !document.querySelector("video").paused)
    await page.keyboard.press("Space")
    await page.waitForFunction(() => document.querySelector("video").paused)
    const wasMuted = await page.locator("video").evaluate((v) => v.muted)
    await page.keyboard.press("m")
    await page.waitForFunction(
      (before) => document.querySelector("video").muted !== before,
      wasMuted
    )
    assert.equal(
      await page.evaluate(() =>
        JSON.parse(localStorage.getItem("better-instagram-videos-muted"))
      ),
      !wasMuted
    )
    await page.keyboard.press("ArrowUp")
    await page.waitForFunction(
      () =>
        Math.abs(document.querySelector("video").volume - 0.55) < 0.001 &&
        !document.querySelector("video").muted &&
        Math.abs(
          JSON.parse(localStorage.getItem("better-instagram-videos-volume")) -
            0.55
        ) < 0.001
    )
    const popup = await context.newPage()
    await popup.setViewportSize({ width: 360, height: 1000 })
    await popup.goto(`chrome-extension://${id}/popup.html`)
    await popup.waitForSelector(
      '.click-mode-options input[value="native"]:checked'
    )
    await popup.locator(".controller .switch").click()
    await page.waitForSelector("[data-bigv-controller]", { state: "detached" })
    await popup.locator(".controller .switch").click()
    await page.waitForSelector("[data-bigv-ready]")
    assert.equal(
      await worker.evaluate(
        async () =>
          (await chrome.storage.sync.get("bigv-controller-enabled"))[
            "bigv-controller-enabled"
          ]
      ),
      true,
      "WXT writes native values and updates another open context"
    )
    await popup.waitForFunction(
      () => document.querySelector(".brand img").naturalWidth > 0
    )
    await popup.locator(".keyboard-shortcuts summary").click()
    assert.equal(await popup.locator(".keyboard-shortcuts kbd").count(), 8)
    await popup.screenshot({
      path: path.resolve(
        __dirname,
        "../build/browser-regressions/chromium/popup-keyboard-real-extension.png"
      ),
      fullPage: true
    })
    assert.equal(
      await popup.locator(".bigv-update-preferences input").isChecked(),
      false
    )
    await popup
      .locator('.click-mode-options input[value="pause-reels"]')
      .click()
    await popup.waitForSelector(
      '.click-mode-options input[value="pause-reels"]:checked'
    )
    await page.locator("video").hover()
    await page.waitForSelector(".bigv-open-reel-button")
    // Old welcome URLs keep working after an upgrade, including the reason.
    await popup.goto(
      `chrome-extension://${id}/tabs/welcome.html?reason=update#controls`
    )
    await popup.waitForURL(
      `chrome-extension://${id}/welcome.html?reason=update#controls`
    )
    await popup.waitForSelector(".bigv-update-preferences input")
    assert.equal(
      await popup.locator(".bigv-update-preferences input").isChecked(),
      false
    )
    const saved = await worker.evaluate(() => chrome.storage.sync.get(null))
    assert.equal(saved["bigv-click-to-pause"], "false")
    assert.equal(saved["bigv-click-mode"], "pause-reels")
    assert.equal(saved["bigv-update-page-enabled"], "false")
    await page.goto("https://www.instagram.com/reels/fixture/")
    await page.waitForSelector("[data-bigv-ready]")
    await page.waitForFunction(
      () =>
        getComputedStyle(document.querySelector("[data-fixture-native-volume]"))
          .visibility === "hidden"
    )
    assert.equal(
      await page
        .locator("#tags")
        .evaluate((el) => getComputedStyle(el).visibility),
      "visible"
    )
    console.log(
      "Real extension: MAIN at document_start, content script, legacy settings, keyboard seek/play/pause/mute/volume with real media and saved audio, shortcut reference, live popup changes, welcome redirect, update opt-out and native audio identification without React metadata passed."
    )
  } finally {
    await context.close()
  }
})().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

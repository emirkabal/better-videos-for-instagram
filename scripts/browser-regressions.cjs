const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const { chromium, firefox } = require("playwright")

const root = path.resolve(__dirname, "..")
const builds = ["chrome-mv3", "firefox-mv2"]
const english = JSON.parse(
  fs.readFileSync(path.join(root, "public/_locales/en/messages.json"))
)
const output = path.join(
  root,
  "build/browser-regressions",
  process.env.BIGV_BROWSER || "chromium"
)
fs.mkdirSync(output, { recursive: true })

async function fixture(
  browser,
  target,
  {
    route = "/reels/fixture/",
    lang = "en",
    width = 1200,
    linked = false,
    clickMode,
    legacyClick,
    documentPip = false
  } = {}
) {
  const base = path.join(root, ".output", target)
  const manifest = JSON.parse(fs.readFileSync(path.join(base, "manifest.json")))
  const page = await browser.newPage({ viewport: { width, height: 850 } })
  page.setDefaultTimeout(7000)
  const errors = []
  page.on("pageerror", (error) => errors.push(error.message))
  const local = JSON.parse(
    fs.readFileSync(path.join(root, `public/_locales/${lang}/messages.json`))
  )
  await page.addInitScript(
    ({ messages, language, linked, clickMode, legacyClick, documentPip }) => {
      const listeners = new Set()
      const messageListeners = new Set()
      window.diagnose = () =>
        new Promise((resolve) => {
          for (const fn of messageListeners)
            fn({ type: "bigv-diagnostics" }, { id: "fixture" }, resolve)
        })
      const values = {}
      if (clickMode !== undefined)
        values["bigv-click-mode"] = JSON.stringify(clickMode)
      if (legacyClick !== undefined)
        values["bigv-click-to-pause"] = JSON.stringify(legacyClick)
      const storage = {
        onChanged: {
          addListener: (fn) => listeners.add(fn),
          removeListener: (fn) => listeners.delete(fn)
        },
        async get(keys, callback) {
          const result = Object.fromEntries(
            (Array.isArray(keys)
              ? keys
              : typeof keys === "string"
                ? [keys]
                : Object.keys(values)
            ).map((key) => [key, values[key]])
          )
          callback?.(result)
          return result
        },
        async set(next, callback) {
          const changes = {}
          for (const [key, value] of Object.entries(next)) {
            changes[key] = { oldValue: values[key], newValue: value }
            values[key] = value
          }
          for (const listener of listeners) listener(changes, "sync")
          callback?.()
        },
        async remove(keys) {
          for (const key of [keys].flat()) delete values[key]
        }
      }
      Object.assign((window.chrome ??= {}), {
        storage: {
          sync: storage,
          local: storage,
          onChanged: {
            addListener: (fn) => listeners.add(fn),
            removeListener: (fn) => listeners.delete(fn)
          }
        },
        runtime: {
          id: "fixture",
          getManifest: () => ({ version: "1.5.0", manifest_version: 3 }),
          getURL: (file) => `${location.origin}/__extension__/${file}`,
          onMessage: {
            addListener: (fn) => messageListeners.add(fn),
            removeListener: (fn) => messageListeners.delete(fn)
          }
        },
        i18n: {
          getMessage: (key) =>
            key === "@@bidi_dir"
              ? language === "ar"
                ? "rtl"
                : "ltr"
              : messages[key]?.message || "",
          getUILanguage: () => language
        }
      })
      window.browser = window.chrome
      if (documentPip) {
        window.nativeDocumentPip = window.documentPictureInPicture
        Object.defineProperty(window, "documentPictureInPicture", {
          configurable: true,
          value: {
            requestWindow: async () => {
              const pipWindow = window.open(
                `${location.origin}/__pip_fixture__`,
                "bigv-fixture-pip",
                "width=440,height=700"
              )
              // Use a loaded same-origin document: Chromium's initial
              // about:blank popup defers image fetching, unlike Document PiP.
              await new Promise((resolve) =>
                pipWindow.addEventListener("load", resolve, { once: true })
              )
              return pipWindow
            }
          }
        })
        HTMLMediaElement.prototype.captureStream = () => new MediaStream()
      }
      const playback = new WeakMap()
      const originalPlay = HTMLMediaElement.prototype.play
      const originalPause = HTMLMediaElement.prototype.pause
      HTMLMediaElement.prototype.play = function () {
        const state = playback.get(this)
        if (!state) return originalPlay.call(this)
        state.paused = false
        this.dispatchEvent(new Event("play", { bubbles: false }))
        this.dispatchEvent(new Event("playing"))
        return Promise.resolve()
      }
      HTMLMediaElement.prototype.pause = function () {
        const state = playback.get(this)
        if (!state) return originalPause.call(this)
        if (state.paused) return
        state.paused = true
        this.dispatchEvent(new Event("pause", { bubbles: false }))
      }
      window.configureVideo = (video) => {
        let time = 0,
          paused = true
        const state = { paused }
        playback.set(video, state)
        Object.defineProperties(video, {
          readyState: { get: () => 4 },
          duration: { get: () => 10 },
          currentTime: {
            get: () => time,
            set: (value) => {
              time = value
            }
          },
          paused: { get: () => state.paused },
          ended: { get: () => time >= 10 }
        })
      }
      document.addEventListener("DOMContentLoaded", () => {
        for (const video of document.querySelectorAll("video"))
          window.configureVideo(video)
        window.nativeTagClicks = 0
        window.nativeReelClicks = 0
        document
          .querySelector(".fixture-player")
          ?.addEventListener("click", (event) => {
            if (
              !(event.target instanceof Element) ||
              event.target.closest("button, input, .bigv-control")
            )
              return
            window.nativeReelClicks++
          })
        document
          .querySelector("#tags")
          ?.addEventListener("click", () => window.nativeTagClicks++)
      })
    },
    {
      messages: { ...english, ...local },
      language: lang,
      linked,
      clickMode,
      legacyClick,
      documentPip
    }
  )
  const player =
    '<article class="fixture-player"><video src="https://scontent.cdninstagram.com/fixture.mp4"></video><button id="native-audio" aria-label="' +
    (lang === "ar" ? "كتم الصوت" : lang === "tr" ? "Sesi kapat" : "Mute") +
    '" onclick="const v=this.parentElement.querySelector(\'video\');v.muted=!v.muted">♪</button><button id="tags" aria-label="Tags"><div><svg width="16" height="16"><circle cx="8" cy="8" r="6" /></svg></div></button><div id="native-progress" role="slider" aria-label="' +
    (lang === "en" ? "Video progress" : "Video ilerlemesi") +
    '" aria-valuemin="0"></div></article>'
  await page.context().route("**/*", async (request) => {
    const url = new URL(request.request().url())
    if (url.pathname === "/__pip_fixture__")
      return request.fulfill({
        contentType: "text/html",
        body: "<!doctype html><html><head></head><body></body></html>"
      })
    if (url.pathname.startsWith("/__extension__/")) {
      const file = path.join(base, url.pathname.slice("/__extension__/".length))
      if (fs.existsSync(file)) return request.fulfill({ path: file })
    }
    if (
      url.hostname === "scontent.cdninstagram.com" &&
      url.pathname.endsWith(".png")
    )
      return request.fulfill({
        path: path.join(root, "src/assets/icon.png"),
        headers: { "access-control-allow-origin": "*" }
      })
    if (request.request().resourceType() !== "document") return request.abort()
    return request.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html lang="${lang}"><head><style>body{margin:0;background:#eee}main{display:flex;justify-content:center;padding-top:30px}.fixture-player{position:relative;width:min(360px,100vw);height:600px;background:#222}.fixture-player video{display:block;width:100%;height:100%}#tags{position:absolute;top:8px;left:8px}#native-progress{position:absolute;bottom:0;width:100%;height:2px;background:red}</style></head><body><main>${linked ? `<a id="native-link" href="/reel/destination/">${player}</a>` : player}</main></body></html>`
    })
  })
  await page.goto(`https://www.instagram.com${route}`)
  const guard = fs
    .readdirSync(base)
    .find((file) => /^instagram-pip-main\.js$/.test(file))
  if (guard) await page.addScriptTag({ path: path.join(base, guard) })
  for (const script of manifest.content_scripts) {
    for (const css of script.css || [])
      await page.addStyleTag({ path: path.join(base, css) })
    for (const js of script.js || [])
      await page.addScriptTag({ path: path.join(base, js) })
  }
  await page.waitForSelector("[data-bigv-ready]", { timeout: 10000 })
  return { page, errors }
}

;(async () => {
  const engine = process.env.BIGV_BROWSER === "firefox" ? firefox : chromium
  const browser = await engine.launch({
    headless: true,
    channel: process.env.BIGV_BROWSER_CHANNEL || undefined
  })
  const results = []
  try {
    await require("./keyboard-ui-regressions.cjs")(
      browser,
      fixture,
      builds,
      output,
      results
    )
    await require("./story-ui-regressions.cjs")(
      browser,
      fixture,
      builds,
      output,
      results
    )
    await require("./player-ui-regressions.cjs")(
      browser,
      fixture,
      builds,
      output,
      results
    )
    for (const target of builds) {
      for (const lang of ["en", "tr", "ar"]) {
        console.log(`Checking ${target}/${lang}`)
        const { page, errors } = await fixture(browser, target, {
          lang,
          width: lang === "ar" ? 390 : 1200
        })
        console.log("  mounted")
        assert.equal(await page.locator(".bigv-player-dock").count(), 1)
        assert.equal(await page.locator(".bigv-speed-button").count(), 1)
        assert.equal(
          (await page.locator(".bigv-speed-button").innerText()).trim(),
          "1.0×"
        )
        assert.equal(await page.locator(".bigv-autoskip").count(), 1)
        assert.equal(
          await page
            .locator("#native-progress")
            .evaluate((el) => getComputedStyle(el).visibility),
          "visible"
        )
        assert.equal(
          await page
            .locator("#tags svg")
            .evaluate((el) => getComputedStyle(el).visibility),
          "visible"
        )
        assert.notEqual(
          await page
            .locator("html")
            .evaluate((el) => getComputedStyle(el).scrollPaddingTop),
          "110px"
        )
        await page.locator("video").hover()
        await page.locator(".bigv-speed-button").click()
        await page.locator(".bigv-speed-option").last().click()
        await page.waitForFunction(
          () => document.querySelector("video").playbackRate === 2
        )
        console.log("  speed")
        assert.equal(
          (await page.locator(".bigv-speed-button").innerText()).trim(),
          "2.0×"
        )
        await page.locator(".bigv-autoskip").click()
        assert.equal(
          await page.locator(".bigv-autoskip").getAttribute("aria-pressed"),
          "true"
        )
        console.log("  auto-skip")
        await page.locator("#tags").click()
        assert.equal(await page.evaluate(() => window.nativeTagClicks), 1)
        const oldId = await page
          .locator("[data-bigv-controller]")
          .getAttribute("id")
        await page.locator(".bigv-player-dock").evaluate((el) => el.remove())
        await page
          .waitForFunction(
            (oldId) =>
              document.querySelector("[data-bigv-ready]")?.id !== oldId &&
              document.querySelector(".bigv-speed-button"),
            oldId
          )
          .catch(async (error) => {
            console.log(
              await page.evaluate(() => ({
                html: document.querySelector(".fixture-player").innerHTML,
                errors: window.__errors
              })),
              errors
            )
            throw error
          })
        assert.equal(await page.locator("[data-bigv-controller]").count(), 1)
        console.log("  repaired")
        const diagnostic = await page.evaluate(() =>
          Promise.race([
            window.diagnose(),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("Diagnostic response timed out")),
                3000
              )
            )
          ])
        )
        assert.equal(diagnostic.controllers, 1)
        assert.equal(diagnostic.sources.https, 1)
        await page.screenshot({
          path: path.join(output, `${target}-${lang}.png`)
        })
        assert.deepEqual(errors, [])
        results.push(
          `${target}/${lang}: paused HTTPS video, fallback container, speed, auto-skip toggle, native controls, DOM repair, diagnostics, CSS isolation`
        )
        await page.close()
      }
    }
    for (const target of builds) {
      for (const layout of ["anchor", "role"]) {
        for (const mode of ["native", "pause", "pause-reels"]) {
          const { page, errors } = await fixture(browser, target, {
            route: "/",
            linked: layout === "anchor",
            clickMode: mode
          })
          if (layout === "role")
            await page
              .locator(".fixture-player")
              .evaluate((el) => el.setAttribute("role", "button"))
          await page.locator("video").click({ position: { x: 180, y: 280 } })
          if (mode === "native") {
            if (layout === "anchor")
              await page.waitForURL("**/reel/destination/")
            else
              assert.equal(
                await page.evaluate(() => window.nativeReelClicks),
                1
              )
          } else {
            assert.equal(
              await page.locator("video").evaluate((video) => video.paused),
              false
            )
            assert.equal(await page.evaluate(() => window.nativeReelClicks), 0)
            assert.equal(new URL(page.url()).pathname, "/")
            if (mode === "pause-reels" && layout === "anchor") {
              if (layout === "anchor")
                await page
                  .locator("#native-link")
                  .evaluate((el) =>
                    el.setAttribute("href", "/reel/recycled-video/")
                  )
              await page.locator(".bigv-open-reel-button").click()
              if (layout === "anchor")
                await page.waitForURL("**/reel/recycled-video/")
              else
                assert.equal(
                  await page.evaluate(() => window.nativeReelClicks),
                  1
                )
            } else
              assert.equal(
                await page.locator(".bigv-open-reel-button").count(),
                0
              )
          }
          assert.deepEqual(errors, [])
          results.push(
            `${target}/${layout}/${mode}: click behavior, current-video native navigation`
          )
          await page.close()
        }
      }
      const { page, errors } = await fixture(browser, target, { route: "/" })
      await page.evaluate(async () => {
        const background = document.createElement("video")
        background.id = "background-video"
        background.src = "https://scontent.cdninstagram.com/background.mp4"
        background.style.cssText =
          "position:fixed;right:0;top:0;width:100px;height:150px"
        document.body.append(background)
        window.configureVideo(background)
        await document.querySelector(".fixture-player video").play()
        await background.play()
      })
      await page.locator(".fixture-player video").hover()
      await page.locator(".fixture-player .better-ig-fullscreen-button").click()
      await page.waitForFunction(() => document.fullscreenElement !== null)
      await page.evaluate(async () => {
        document.querySelector(".fixture-player video").pause()
        await document.querySelector("#background-video").play()
      })
      assert.equal(
        await page
          .locator(".fixture-player video")
          .evaluate((video) => video.paused),
        false
      )
      assert.equal(
        await page
          .locator("#background-video")
          .evaluate((video) => video.paused),
        true
      )
      await page
        .locator(".fixture-player video")
        .click({ position: { x: 180, y: 280 } })
      assert.equal(
        await page
          .locator(".fixture-player video")
          .evaluate((video) => video.paused),
        true,
        "explicit fullscreen pause works"
      )
      await page
        .locator(".fixture-player video")
        .click({ position: { x: 180, y: 280 } })
      assert.equal(
        await page
          .locator(".fixture-player video")
          .evaluate((video) => video.paused),
        false
      )
      await page.evaluate(() => document.exitFullscreen())
      assert.equal(
        await page
          .locator("#background-video")
          .evaluate((video) => video.paused),
        true,
        "exit must not restart the background video"
      )
      assert.deepEqual(errors, [])
      results.push(
        `${target}/fullscreen: selected Feed source stays playing, background autoplay blocked, user pause/play and exit preserved`
      )
      await page.close()
    }
    for (const legacy of [false, true]) {
      const { page } = await fixture(browser, builds[0], {
        route: "/",
        legacyClick: legacy
      })
      const diagnostic = await page.evaluate(() => window.diagnose())
      assert.equal(diagnostic.clickMode, legacy ? "pause" : "native")
      await page.close()
    }
    results.push("Legacy migration: false stays Native, true stays Pause")
    const { page, errors } = await fixture(browser, builds[0], {
      route: "/",
      linked: true
    })
    await page.locator("video").hover()
    await page.locator(".bigv-speed-button").click()
    assert.equal(
      await page.locator("#native-link").getAttribute("href"),
      "/reel/destination/"
    )
    assert.equal(new URL(page.url()).pathname, "/")
    await page.locator("#tags").click()
    assert.equal(await page.evaluate(() => window.nativeTagClicks), 1)
    assert.deepEqual(errors, [])
    results.push(
      "Feed: native link preserved, extension controls and Tags do not toggle the video"
    )
    await page.evaluate(() =>
      history.pushState({}, "", "/stories/account/123/")
    )
    await page.waitForSelector(".bigv-player-dock.stories")
    assert.equal(await page.locator("[data-bigv-controller]").count(), 1)
    await page.evaluate(() =>
      chrome.storage.sync.set({ "bigv-controller-enabled": "false" })
    )
    await page.waitForFunction(
      () => !document.querySelector("[data-bigv-controller]")
    )
    assert.equal(
      await page
        .locator("#native-progress")
        .evaluate((el) => getComputedStyle(el).visibility),
      "visible"
    )
    await page.evaluate(() =>
      chrome.storage.sync.set({ "bigv-controller-enabled": "true" })
    )
    await page.waitForSelector(".bigv-player-dock.stories")
    assert.deepEqual(errors, [])
    results.push(
      "Feed to Stories navigation, disable restores native page, re-enable attaches once"
    )
    await page.evaluate(() => {
      chrome.tabs = {
        query: async () => [{ id: 1, url: "https://www.instagram.com/" }],
        sendMessage: async () => ({
          controllers: 1,
          storageAvailable: true,
          page: "global",
          sources: { blob: 0, https: 1 }
        })
      }
    })
    const popup = fs.readFileSync(
      path.join(root, ".output", builds[0], "popup.html"),
      "utf8"
    )
    await page.setViewportSize({ width: 380, height: 850 })
    await page.setContent(
      popup.replace(/(src|href)="\//g, '$1="/__extension__/')
    )
    await page.locator(".diagnostics summary").click()
    await page.waitForFunction(() =>
      document
        .querySelector(".diagnostics textarea")
        ?.value.includes('"controllers": 1')
    )
    assert.ok(
      (await page.locator(".diagnostics textarea").inputValue()).includes(
        '"https": 1'
      )
    )
    await page.screenshot({ path: path.join(output, "popup-diagnostics.png") })
    await page.locator('.click-mode-options input[value="pause-reels"]').check()
    assert.equal(
      await page
        .locator('.click-mode-options input[value="pause-reels"]')
        .isChecked(),
      true
    )
    await page
      .locator('.click-mode-options input[value="pause-reels"]')
      .press("ArrowLeft")
    assert.equal(
      await page
        .locator('.click-mode-options input[value="pause"]')
        .isChecked(),
      true
    )
    await page.locator(".bigv-update-preferences input").uncheck()
    await page.locator(".diagnostics summary").click()
    await page.locator(".keyboard-shortcuts summary").click()
    assert.equal(await page.locator(".keyboard-shortcuts kbd").count(), 8)
    await page.screenshot({
      path: path.join(output, "popup-keyboard-shortcuts.png"),
      fullPage: true
    })
    await page.locator(".keyboard-shortcuts summary").click()
    await page.screenshot({
      path: path.join(output, "popup-preferences.png"),
      fullPage: true
    })
    const welcome = fs.readFileSync(
      path.join(root, ".output", builds[0], "welcome.html"),
      "utf8"
    )
    await page.setContent(
      welcome.replace(/(src|href)="\//g, '$1="/__extension__/')
    )
    await page.waitForSelector(".bigv-update-preferences.is-floating input")
    const primaryColors = await page
      .locator(".welcome-primary")
      .evaluate((el) => ({
        color: getComputedStyle(el).color,
        background: getComputedStyle(el).backgroundColor
      }))
    assert.notEqual(
      primaryColors.color,
      primaryColors.background,
      "welcome action text remains readable with scoped styles"
    )
    assert.equal(
      await page.locator(".bigv-update-preferences input").isChecked(),
      false,
      "popup opt-out also applies on the welcome page"
    )
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    assert.equal(
      await page.locator(".bigv-update-preferences").isVisible(),
      true
    )
    await page.screenshot({ path: path.join(output, "welcome-opt-out.png") })
    await page.locator(".bigv-update-preferences input").check()
    const savedPreferences = await page.evaluate(() =>
      chrome.storage.sync.get(["bigv-update-page-enabled", "bigv-click-mode"])
    )
    assert.equal(
      savedPreferences["bigv-update-page-enabled"],
      true,
      "welcome preference saves to the shared popup setting"
    )
    assert.equal(
      savedPreferences["bigv-click-mode"],
      "pause",
      "new click preference survives UI remounts"
    )
    assert.deepEqual(errors, [])
    results.push(
      "Popup/welcome: native radio keyboard controls, shared update opt-out, fixed visible switch, preferences persist"
    )
    await page.close()
    fs.writeFileSync(
      path.join(output, "results.json"),
      JSON.stringify(results, null, 2)
    )
    console.log(results.join("\n"))
  } finally {
    await browser.close()
  }
})().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

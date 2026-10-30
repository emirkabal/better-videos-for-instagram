const assert = require("node:assert/strict")
const path = require("node:path")

module.exports = async function keyboardRegressions(
  browser,
  fixture,
  builds,
  output,
  results
) {
  for (const target of builds) {
    for (const route of ["/", "/reels/fixture/", "/stories/fixture/1/"]) {
      const { page, errors } = await fixture(browser, target, {
        route,
        documentPip: true
      })
      const video = page.locator(".fixture-player video")
      const volumeUp = route === "/" ? "ArrowUp" : "+"
      const volumeDown = route === "/" ? "ArrowDown" : "-"
      await video.evaluate((v) => {
        v.currentTime = 2
      })
      if (route === "/") {
        await page.mouse.move(2, 800)
        await page.keyboard.press("ArrowRight")
        assert.equal(
          await video.evaluate((v) => v.currentTime),
          2,
          "Feed scrolling keeps its keys before player engagement"
        )
      }
      await video.hover()
      if (route !== "/") {
        await page.evaluate(() => {
          window.nativeVerticalKeys = []
          window.nativeSpaceKeys = []
          window.nativeReelIndex = 0
          document.addEventListener("keydown", (event) => {
            if (event.key === " ") {
              window.nativeSpaceKeys.push({
                repeat: event.repeat,
                prevented: event.defaultPrevented
              })
              window.nativeReelIndex++
              return
            }
            if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return
            window.nativeVerticalKeys.push({
              key: event.key,
              prevented: event.defaultPrevented
            })
            window.nativeReelIndex += event.key === "ArrowDown" ? 1 : -1
          })
        })
        await page.keyboard.press("ArrowDown")
        assert.equal(await page.evaluate(() => window.nativeReelIndex), 1)
        await page.keyboard.press("ArrowUp")
        assert.deepEqual(await page.evaluate(() => window.nativeVerticalKeys), [
          { key: "ArrowDown", prevented: false },
          { key: "ArrowUp", prevented: false }
        ])
        assert.equal(
          await video.evaluate((v) => v.volume),
          0.5,
          "native vertical navigation never changes volume"
        )
        if (route === "/reels/fixture/") {
          await page.locator(".better-ig-fullscreen-button").click()
          await page.waitForFunction(() => Boolean(document.fullscreenElement))
          await page.evaluate(() => document.activeElement.blur())
          await page.keyboard.press("ArrowDown")
          assert.equal(
            await page.evaluate(() => window.nativeReelIndex),
            1,
            "Reels fullscreen keeps native next navigation"
          )
          await page.keyboard.press("ArrowUp")
          assert.equal(await page.evaluate(() => window.nativeReelIndex), 0)
          assert.equal(await video.evaluate((v) => v.volume), 0.5)
          assert.equal(
            await page.evaluate(() =>
              window.nativeVerticalKeys.every((event) => !event.prevented)
            ),
            true
          )
          await page.keyboard.press("Space")
          assert.equal(
            await page.evaluate(() => window.nativeReelIndex),
            1,
            "Reels fullscreen Space reaches native next navigation"
          )
          assert.equal(
            await video.evaluate((v) => v.paused),
            true,
            "fullscreen Space never toggles playback"
          )
          await page.evaluate(() => document.exitFullscreen())
          await page.waitForFunction(() => !document.fullscreenElement)
          await video.hover()
        }
      }
      await page.keyboard.press("ArrowRight")
      assert.equal(await video.evaluate((v) => v.currentTime), 7)
      const feedback = page.locator(".bigv-player-feedback.is-visible")
      await feedback.waitFor()
      assert.match(
        await feedback.getAttribute("aria-label"),
        /Seek forward · 5 s/
      )
      await page.waitForFunction(
        () =>
          Number(
            getComputedStyle(document.querySelector(".bigv-player-feedback"))
              .opacity
          ) >= 0.99
      )
      if (route === "/reels/fixture/")
        await page.screenshot({
          path: path.join(output, `${target}-keyboard-seek.png`)
        })
      // Start a fresh forward sequence after screenshot work, so a slow
      // screenshot cannot put these presses outside the 800ms HUD window.
      await page.keyboard.press("ArrowLeft")
      await page.keyboard.press("ArrowRight")
      await page.keyboard.press("ArrowRight")
      assert.equal(await video.evaluate((v) => v.currentTime), 10)
      await page
        .getByRole("status", { name: "Seek forward · 8 s", exact: true })
        .waitFor()
      assert.match(
        await feedback.getAttribute("aria-label"),
        /Seek forward · 8 s/,
        "repeated seeks report accumulated actual seconds at the boundary"
      )
      await video.evaluate((v) => {
        v.currentTime = 7
      })
      await page.keyboard.press("ArrowLeft")
      assert.equal(await video.evaluate((v) => v.currentTime), 2)
      await page
        .getByRole("status", { name: "Seek backward · 5 s", exact: true })
        .waitFor()
      assert.match(
        await feedback.getAttribute("aria-label"),
        /Seek backward · 5 s/
      )
      await page.keyboard.press("k")
      assert.equal(await video.evaluate((v) => v.paused), false)
      if (route === "/reels/fixture/") {
        const before = await page.evaluate(() => window.nativeSpaceKeys.length)
        await page.keyboard.down("Space")
        await page.keyboard.down("Space")
        await page.keyboard.up("Space")
        assert.equal(
          await video.evaluate((v) => v.paused),
          false,
          "Reels Space never pauses a playing video"
        )
        assert.equal(
          await page.evaluate(() => window.nativeSpaceKeys.length),
          before + 2
        )
        assert.equal(
          await page.evaluate(() =>
            window.nativeSpaceKeys.every((key) => !key.prevented)
          ),
          true
        )
        await page.keyboard.press("k")
        assert.equal(
          await video.evaluate((v) => v.paused),
          true,
          "K remains the Reels playback key"
        )
      } else {
        await page.keyboard.down("Space")
        assert.equal(await video.evaluate((v) => v.paused), true)
        await page.keyboard.down("Space")
        assert.equal(
          await video.evaluate((v) => v.paused),
          true,
          "holding Space cannot toggle repeatedly"
        )
        await page.keyboard.up("Space")
      }
      await page.keyboard.press("m")
      await page.waitForFunction(
        () => document.querySelector(".fixture-player video").muted
      )
      assert.equal(
        await page.evaluate(() =>
          localStorage.getItem("better-instagram-videos-muted")
        ),
        "true"
      )
      await page.keyboard.press("m")
      await page.waitForFunction(
        () => !document.querySelector(".fixture-player video").muted
      )
      await page.keyboard.press(volumeUp)
      await page.waitForFunction(
        () =>
          Math.abs(
            document.querySelector(".fixture-player video").volume - 0.55
          ) < 0.0001
      )
      await page.keyboard.press(volumeDown)
      await page.waitForFunction(
        () =>
          Math.abs(
            document.querySelector(".fixture-player video").volume - 0.5
          ) < 0.0001
      )
      await page.keyboard.press("Control+ArrowRight")
      assert.equal(await video.evaluate((v) => v.currentTime), 2)
      if (route === "/") {
        await page.evaluate(() => {
          const article = document.createElement("article")
          article.id = "secondary-feed"
          article.style.cssText =
            "position:fixed;right:10px;top:30px;width:260px;height:440px;background:#333"
          const next = document.createElement("video")
          next.src = "https://scontent.cdninstagram.com/keyboard-secondary.mp4"
          next.style.cssText = "width:100%;height:100%"
          window.configureVideo(next)
          article.append(next)
          document.body.append(article)
        })
        await page.waitForSelector("#secondary-feed [data-bigv-ready]")
        await page.locator("#secondary-feed video").hover()
        await page.keyboard.press("ArrowRight")
        assert.equal(
          await page
            .locator("#secondary-feed video")
            .evaluate((v) => v.currentTime),
          5
        )
        assert.equal(
          await video.evaluate((v) => v.currentTime),
          2,
          "another Feed video is untouched"
        )
        await page
          .locator("#secondary-feed video")
          .click({ position: { x: 100, y: 150 } })
        await page.mouse.move(2, 800)
        await page.keyboard.press("k")
        assert.equal(
          await page.locator("#secondary-feed video").evaluate((v) => v.paused),
          true,
          "last selected visible video works away from the pointer"
        )
        await page.locator("#secondary-feed").evaluate((el) => el.remove())
        await video.hover()
      }
      await page.evaluate(() => {
        for (const [tag, type] of [
          ["textarea", ""],
          ["input", "text"],
          ["div", "contenteditable"]
        ]) {
          const editor = document.createElement(tag)
          editor.id = `editor-${tag}`
          if (type === "contenteditable")
            editor.contentEditable = "plaintext-only"
          else if (type) editor.type = type
          document.body.append(editor)
        }
      })
      for (const tag of ["textarea", "input", "div"]) {
        await page.locator(`#editor-${tag}`).focus()
        await page.keyboard.press("k")
        await page.keyboard.press("m")
        await page.keyboard.press("ArrowRight")
        assert.equal(await video.evaluate((v) => v.currentTime), 2)
        assert.equal(await video.evaluate((v) => v.paused), true)
        assert.equal(await video.evaluate((v) => v.muted), false)
      }
      await page.locator("#tags").focus()
      await page.keyboard.press("Space")
      assert.equal(
        await page.evaluate(() => window.nativeTagClicks),
        1,
        "focused native buttons retain Space"
      )
      await page.evaluate(() => {
        document.activeElement.blur()
        const dialog = document.createElement("div")
        dialog.id = "comments"
        dialog.setAttribute("role", "dialog")
        dialog.textContent = "Comments"
        document.body.append(dialog)
      })
      await video.hover()
      await page.keyboard.press("k")
      assert.equal(
        await video.evaluate((v) => v.paused),
        true,
        "comments modal blocks background shortcuts"
      )
      await page.locator("#comments").evaluate((el) => el.remove())
      if (route === "/") {
        await page.locator(".better-ig-fullscreen-button").click()
        await page.waitForFunction(() => Boolean(document.fullscreenElement))
        await page.evaluate(() => document.activeElement.blur())
        await page.keyboard.press("k")
        assert.equal(await video.evaluate((v) => v.paused), false)
        await page.keyboard.press("Space")
        assert.equal(
          await video.evaluate((v) => v.paused),
          true,
          "fullscreen has one pause handler"
        )
        await page.evaluate(() => document.exitFullscreen())
        await page.waitForFunction(() => !document.fullscreenElement)
      }
      // Reduced-volume settings also cap shortcuts and scale their 5% step.
      await page.evaluate(() =>
        chrome.storage.sync.set({ "bigv-max-volume-balance": "350" })
      )
      await page.waitForFunction(
        () =>
          document.querySelector(".fixture-player video").volume <=
          100 / 350 + 0.0001
      )
      await video.hover()
      await page.evaluate(() => document.activeElement.blur())
      await page.keyboard.press(volumeUp)
      await page.waitForFunction(
        () =>
          Math.abs(
            document.querySelector(".fixture-player video").volume - 100 / 350
          ) < 0.0001
      )
      await page.keyboard.press(volumeDown)
      await page.waitForFunction(
        () =>
          Math.abs(
            document.querySelector(".fixture-player video").volume - 95 / 350
          ) < 0.0001
      )
      await page.waitForTimeout(1000)
      await page.waitForFunction(
        () =>
          !document
            .querySelector(".bigv-player-feedback")
            .classList.contains("is-visible")
      )
      const popupEvent = page.waitForEvent("popup")
      await video.hover()
      await page.locator(".bigv-pip-button").click()
      const pip = await popupEvent
      await pip.waitForSelector(".bigv-pip-player")
      await pip.locator("video").focus()
      await pip.keyboard.press("k")
      assert.equal(
        await video.evaluate((v) => v.paused),
        false,
        "PiP uses explicit playback intent"
      )
      await pip.keyboard.press("Space")
      assert.equal(
        await video.evaluate((v) => v.paused),
        true,
        "mirror Space toggles only once"
      )
      await pip.keyboard.press("ArrowRight")
      assert.equal(await video.evaluate((v) => v.currentTime), 7)
      await pip.waitForSelector(".bigv-player-feedback.is-visible")
      assert.equal(
        await page.locator(".bigv-player-feedback.is-visible").count(),
        0,
        "PiP feedback stays in PiP"
      )
      await pip.keyboard.press("m")
      await page.waitForFunction(
        () => document.querySelector(".fixture-player video").muted
      )
      if (route === "/") {
        await page.evaluate(() => {
          window.detachedKeyboardSource = document.querySelector(
            ".fixture-player video"
          )
          window.detachedKeyboardSource.remove()
        })
        await page.waitForSelector("[data-bigv-controller]", {
          state: "detached"
        })
        await pip.locator("video").focus()
        await pip.keyboard.press("ArrowDown")
        await page.waitForFunction(
          () =>
            Math.abs(window.detachedKeyboardSource.volume - 90 / 350) <
              0.0001 &&
            Math.abs(
              JSON.parse(
                localStorage.getItem("better-instagram-videos-volume")
              ) -
                90 / 350
            ) < 0.0001
        )
        assert.equal(
          await page.evaluate(() =>
            localStorage.getItem("better-instagram-videos-muted")
          ),
          "false",
          "PiP persists audio even after the source React root is gone"
        )
        await page.evaluate(() =>
          document
            .querySelector(".fixture-player")
            .prepend(window.detachedKeyboardSource)
        )
        await page.waitForSelector("[data-bigv-ready]")
      }
      if (route !== "/") {
        await page.evaluate(() => {
          const old = document.querySelector(".fixture-player video")
          window.oldKeyboardSource = old
          const next = document.createElement("video")
          next.src = "https://scontent.cdninstagram.com/keyboard-next.mp4"
          window.configureVideo(next)
          old.replaceWith(next)
        })
        await pip.waitForFunction(
          () => document.querySelector(".bigv-pip-time")?.textContent === "0:00"
        )
        await pip.locator("video").focus()
        await pip.keyboard.press("ArrowRight")
        assert.equal(
          await video.evaluate((v) => v.currentTime),
          5,
          "PiP shortcuts follow the new source"
        )
        assert.equal(
          await page.evaluate(() => window.oldKeyboardSource.currentTime),
          7,
          "old source is not controlled after handoff"
        )
      }
      await pip.close()
      await page.evaluate(() =>
        chrome.storage.sync.set({ "bigv-controller-enabled": "false" })
      )
      await page.waitForSelector("[data-bigv-controller]", {
        state: "detached"
      })
      await page.evaluate(() => document.activeElement.blur())
      const before = await video.evaluate((v) => v.currentTime)
      await page.keyboard.press("ArrowRight")
      assert.equal(
        await video.evaluate((v) => v.currentTime),
        before,
        "disable removes shortcuts"
      )
      await page.evaluate(() =>
        chrome.storage.sync.set({ "bigv-controller-enabled": "true" })
      )
      await page.waitForSelector("[data-bigv-ready]")
      await video.hover()
      await page.keyboard.press("k")
      assert.equal(
        await video.evaluate((v) => v.paused),
        false,
        "re-enable registers a single listener"
      )
      assert.deepEqual(errors, [])
      results.push(
        `${target}/keyboard${route}: seek/feedback, play/pause/repeat, saved mute/volume, volume reduction, text/control/modal exclusions, fullscreen and PiP, disable/re-enable`
      )
      await page.close()
    }
  }
}

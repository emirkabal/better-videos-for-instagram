const assert = require("node:assert/strict")
const path = require("node:path")

module.exports = async function storyUiRegressions(
  browser,
  fixture,
  builds,
  output,
  results
) {
  for (const target of builds) {
    const { page, errors } = await fixture(browser, target, {
      route: "/stories/fixture/1/",
      documentPip: true
    })
    await page.evaluate(() => {
      const player = document.querySelector(".fixture-player")
      const reply = document.createElement("div")
      reply.id = "story-reply"
      reply.style.cssText =
        "position:absolute;bottom:12px;left:12px;right:12px;height:52px;border:1px solid white;border-radius:30px;color:white;padding:12px;box-sizing:border-box"
      reply.textContent = "Reply to fixture…  ♡"
      player.append(reply)
      window.storyIndex = 0
      window.storyChanges = []
      window.setStory = (index) => {
        window.storyIndex = Math.max(0, Math.min(2, index))
        window.storyChanges.push(window.storyIndex)
        const media = document.createElement(
          window.storyIndex === 0 ? "video" : "img"
        )
        media.id = "story-media"
        media.style.cssText =
          "display:block;width:100%;height:100%;object-fit:contain"
        media.src =
          window.storyPhotoUrls?.[window.storyIndex] ??
          `https://scontent.cdninstagram.com/story-${window.storyIndex}.${window.storyIndex === 0 ? "mp4" : "png"}`
        if (media.tagName === "VIDEO") window.configureVideo(media)
        player.querySelector("video,img").replaceWith(media)
        history.replaceState(
          {},
          "",
          `/stories/fixture/${window.storyIndex + 1}/`
        )
      }
      for (const [direction, label] of [
        [-1, "Previous Story"],
        [1, "Next Story"]
      ]) {
        const button = document.createElement("button")
        button.setAttribute("aria-label", label)
        button.textContent = label
        button.style.cssText = `position:fixed;top:10px;${direction === -1 ? "left" : "right"}:10px`
        button.onclick = () => window.setStory(window.storyIndex + direction)
        document.body.append(button)
      }
    })
    await page.locator("video").hover()
    await page.locator(".bigv-story-player.is-visible").waitFor()
    const panel = page.locator(".bigv-story-player")
    const bounds = await panel.boundingBox()
    const reply = await page.locator("#story-reply").boundingBox()
    const player = await page.locator(".fixture-player").boundingBox()
    assert.ok(
      bounds.y + bounds.height < reply.y,
      "Story controls clear the reply row"
    )
    assert.ok(
      Math.abs(bounds.x + bounds.width / 2 - player.x - player.width / 2) < 1
    )
    const play = page.locator(".bigv-story-play")
    const playBox = await play.boundingBox()
    assert.equal(Math.round(playBox.width), 32)
    assert.equal(Math.round(playBox.height), 32)
    const icon = await play.locator("svg").boundingBox()
    assert.equal(Math.round(icon.width), 20)
    assert.equal(Math.round(icon.height), 20)
    assert.ok(
      Math.abs(playBox.x + playBox.width / 2 - bounds.x - bounds.width / 2) < 1,
      "play button is centered"
    )
    await play.click()
    assert.equal(await page.locator("video").evaluate((v) => v.paused), false)
    await page.locator(".bigv-story-timeline .dragarea").hover()
    const tip = page.locator(".better-ig-progress-tooltip.visible")
    await tip.waitFor()
    const tipBox = await tip.boundingBox()
    const timeline = await page.locator(".bigv-story-timeline").boundingBox()
    assert.ok(
      tipBox.y + tipBox.height <= bounds.y,
      "tooltip opens above the entire panel, clearing playback controls"
    )
    await page.screenshot({
      path: path.join(output, `${target}-story-controls.png`)
    })
    await page
      .locator(".fixture-player")
      .evaluate((el) => (el.style.width = "280px"))
    await page.locator(".bigv-story-player.is-compact").waitFor()
    await page.locator(".bigv-story-timeline .dragarea").hover()
    const narrowPanel = await panel.boundingBox()
    const narrowTip = await tip.boundingBox()
    assert.ok(narrowTip.y + narrowTip.height <= narrowPanel.y)
    for (const button of await panel.locator("button").all()) {
      const box = await button.boundingBox()
      if (box)
        assert.ok(
          box.x >= narrowPanel.x &&
            box.x + box.width <= narrowPanel.x + narrowPanel.width,
          "compact buttons stay inside the panel"
        )
    }
    await page.screenshot({
      path: path.join(output, `${target}-story-compact.png`)
    })
    await page
      .locator(".fixture-player")
      .evaluate((el) => (el.style.width = "360px"))
    await page.waitForFunction(
      () =>
        !document
          .querySelector(".bigv-story-player")
          .classList.contains("is-compact")
    )
    const volumeRange = page.locator(".bigv-pip-volume-slider")
    const range = await volumeRange.boundingBox()
    await page.mouse.move(range.x + range.width / 2, range.y + range.height / 2)
    await page.mouse.down()
    await page.mouse.move(5, 800)
    await page.waitForTimeout(1800)
    assert.equal(
      await panel.evaluate((el) => el.classList.contains("is-visible")),
      true,
      "volume drag keeps panel visible outside the panel"
    )
    await page.mouse.up()
    await page.waitForFunction(
      () =>
        !document
          .querySelector(".bigv-story-player")
          .classList.contains("is-visible")
    )
    await page.locator("video").hover()
    await page
      .locator('[data-bigv-controller] button[aria-label="Next Story"]')
      .click()
    await page.waitForSelector(".bigv-story-player.is-photo")
    assert.equal(await page.evaluate(() => window.storyIndex), 1)
    assert.equal(await panel.locator(".bigv-story-play").count(), 0)
    await page.locator("#story-media").hover()
    const popupEvent = page.waitForEvent("popup")
    await page.locator(".bigv-pip-button").click()
    const pip = await popupEvent
    await pip.bringToFront()
    await pip.waitForSelector("[data-bigv-pip-photo]:not([hidden])")
    await pip.waitForFunction(
      () => document.querySelector("[data-bigv-pip-photo]").naturalWidth > 0,
      null,
      { timeout: 5000 }
    )
    assert.match(
      await pip.locator("[data-bigv-pip-photo]").getAttribute("src"),
      /story-1.png$/
    )
    await pip.locator("body").click({ position: { x: 5, y: 5 } })
    await pip.keyboard.press("ArrowRight")
    await pip.waitForFunction(() =>
      document
        .querySelector("[data-bigv-pip-photo]")
        .src.endsWith("story-2.png")
    )
    await pip.keyboard.press("ArrowLeft")
    await pip.waitForFunction(() =>
      document
        .querySelector("[data-bigv-pip-photo]")
        .src.endsWith("story-1.png")
    )
    await pip.getByRole("button", { name: "Next Story", exact: true }).click()
    await pip.waitForFunction(() =>
      document
        .querySelector("[data-bigv-pip-photo]")
        .src.endsWith("story-2.png")
    )
    await pip
      .getByRole("button", { name: "Previous Story", exact: true })
      .click()
    await pip.waitForFunction(() =>
      document
        .querySelector("[data-bigv-pip-photo]")
        .src.endsWith("story-1.png")
    )
    await pip
      .getByRole("button", { name: "Previous Story", exact: true })
      .click()
    await pip.waitForSelector("[data-bigv-pip-mirror]:not([hidden])")
    await page.waitForSelector(".bigv-story-play")
    await page.waitForFunction(() => !document.querySelector("video").paused)
    await pip.locator(".bigv-pip-play").waitFor()
    await pip.mouse.move(2, 2)
    await pip.waitForFunction(
      () =>
        !document
          .querySelector(".bigv-pip-player")
          .classList.contains("is-visible")
    )
    await page.evaluate(() => window.setStory(1))
    await pip.waitForSelector("[data-bigv-pip-photo]:not([hidden])")
    assert.equal(
      await pip
        .locator(".bigv-pip-player")
        .evaluate((el) => el.classList.contains("is-visible")),
      false,
      "photo handoff does not reveal controls"
    )
    await pip.mouse.move(160, 200)
    await pip.waitForSelector(".bigv-pip-player.is-visible")
    await pip.locator(".bigv-pip-player").hover()
    await pip.waitForFunction(
      () =>
        Number(
          getComputedStyle(document.querySelector(".bigv-pip-player")).opacity
        ) >= 0.99
    )
    await pip.screenshot({
      path: path.join(output, `${target}-story-photo-pip.png`)
    })
    await pip.close()
    await page.locator("#story-media").hover()
    await page
      .locator('[data-bigv-controller] button[aria-label="Previous Story"]')
      .click()
    await page.waitForSelector(".bigv-story-play")
    assert.equal(await page.evaluate(() => window.storyIndex), 0)
    // Exercise the real Chromium Document PiP API as well as the interactive
    // cross-browser mock. Blob images avoid Playwright's inability to route
    // network requests from Chromium's actual PiP target.
    if (await page.evaluate(() => Boolean(window.nativeDocumentPip))) {
      await page.evaluate(async () => {
        Object.defineProperty(window, "documentPictureInPicture", {
          configurable: true,
          value: window.nativeDocumentPip
        })
        const photo = await (
          await fetch("https://scontent.cdninstagram.com/story-native.png")
        ).blob()
        window.storyPhotoUrls = {
          1: URL.createObjectURL(photo),
          2: URL.createObjectURL(photo)
        }
        window.setStory(1)
      })
      await page.waitForSelector(".bigv-story-player.is-photo")
      await page.locator("#story-media").hover()
      await page.locator(".bigv-pip-button").click()
      await page.waitForFunction(
        () =>
          window.documentPictureInPicture.window?.document.querySelector(
            "[data-bigv-pip-photo]"
          )?.naturalWidth > 0
      )
      await page.evaluate(() =>
        documentPictureInPicture.window.document
          .querySelector('button[aria-label="Next Story"]')
          .click()
      )
      await page.waitForFunction(
        () =>
          documentPictureInPicture.window.document.querySelector(
            "[data-bigv-pip-photo]"
          ).src === window.storyPhotoUrls[2]
      )
      await page.evaluate(() =>
        documentPictureInPicture.window.document
          .querySelector('button[aria-label="Previous Story"]')
          .click()
      )
      await page.waitForFunction(
        () =>
          documentPictureInPicture.window.document.querySelector(
            "[data-bigv-pip-photo]"
          ).src === window.storyPhotoUrls[1]
      )
      await page.evaluate(() => documentPictureInPicture.window.close())
      results.push(
        `${target}/stories/native-document-pip: real API opens loaded photo, follows next/previous Story and closes`
      )
    }
    assert.deepEqual(errors, [])
    results.push(
      `${target}/stories: centered proportional controls above reply, tooltip upward, native previous/next, photo-first PiP and photo/video/photo following, controls stay hidden on handoff`
    )
    await page.close()
  }
}

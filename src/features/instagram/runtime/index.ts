import {
  settings as preferences,
  readStoredSetting
} from "@/utils/storage/settings"
import type { ClickMode } from "@/utils/playback/click-mode"

import { Feed, Reels, Stories } from "@/features/instagram/pages"
import { resolveClickMode } from "@/utils/playback/click-mode"
import { observeFullscreenAudio } from "@/utils/fullscreen/audio"
import { readInitialSettings } from "@/utils/storage/initial-settings"
import { getPageMode } from "@/features/instagram/runtime/page-mode"
import { pictureInPicture } from "@/utils/pip/controller"
import { isInstagramVideo } from "@/features/instagram/media/video"
import { getVideoContainer } from "@/utils/media/container"
import { observeInstagramKeyboard } from "./keyboard"

export function startInstagram() {
  let disposed = false
  let urlTimer: ReturnType<typeof setInterval> | undefined
  const feed = new Feed()
  const reels = new Reels()
  const stories = new Stories()
  const stopSettingsWatch: (() => void)[] = []

  let controllerEnabled = true
  let storageAvailable = true
  let stopAudioGuard: (() => void) | undefined
  let stopKeyboard: (() => void) | undefined
  let storedClickMode: unknown
  let storedLegacyClick: unknown
  const syncClickMode = () =>
    feed.setClickMode(resolveClickMode(storedClickMode, storedLegacyClick))

  const load = () => {
    stopKeyboard ??= observeInstagramKeyboard()
    stopAudioGuard ??= observeFullscreenAudio()
    const mode = getPageMode(location.pathname)
    pictureInPicture.setPageMode(mode)
    switch (mode) {
      case "reels":
        feed.delete()
        stories.delete()
        reels.wayToInject()
        break
      case "stories":
        feed.delete()
        reels.delete()
        stories.wayToInject()
        break
      default:
        reels.delete()
        stories.delete()
        feed.wayToInject()
    }
  }

  const deleteControllers = () => {
    pictureInPicture.close()
    feed.delete()
    reels.delete()
    stories.delete()
    stopAudioGuard?.()
    stopAudioGuard = undefined
    stopKeyboard?.()
    stopKeyboard = undefined
  }

  let previousUrl = ""
  const loadWhenUrlChanges = () => {
    if (!controllerEnabled) return
    if (location.href === previousUrl) return

    previousUrl = location.href
    load()
  }

  const start = async () => {
    let started = false
    let watchedEnabled: boolean | undefined
    let watchedClick: ClickMode | null | undefined
    let watchedLegacy: boolean | null | undefined
    let watchesAvailable = true
    // Subscribe before reading; events received during the initial read win
    // over that snapshot, including an explicit disabled preference.
    try {
      stopSettingsWatch.push(
        preferences.controllerEnabled.watch((value) => {
          watchedEnabled = value
          if (!started) return
          controllerEnabled = value
          previousUrl = ""
          if (controllerEnabled) loadWhenUrlChanges()
          else deleteControllers()
        })
      )
      stopSettingsWatch.push(
        preferences.clickMode.watch((value) => {
          watchedClick = value
          if (!started) return
          storedClickMode = value
          syncClickMode()
        })
      )
      stopSettingsWatch.push(
        preferences.legacyClickToPause.watch((value) => {
          watchedLegacy = value
          if (!started) return
          storedLegacyClick = value
          syncClickMode()
        })
      )
    } catch {
      watchesAvailable = false
    }
    const settings = await readInitialSettings(readStoredSetting)
    if (disposed) return
    storageAvailable = settings.storageAvailable && watchesAvailable
    controllerEnabled = watchedEnabled ?? settings.enabled
    storedClickMode =
      watchedClick !== undefined ? watchedClick : settings.storedClickMode
    storedLegacyClick =
      watchedLegacy !== undefined ? watchedLegacy : settings.legacyClickToPause
    syncClickMode()
    started = true

    urlTimer = setInterval(loadWhenUrlChanges, 250)
    loadWhenUrlChanges()
  }

  // Only return diagnostic categories. Never include video URLs, account IDs,
  // cookies, page text or authentication tokens in support data.
  const diagnose: Parameters<typeof chrome.runtime.onMessage.addListener>[0] = (
    message,
    sender,
    respond
  ) => {
    if (sender.id !== chrome.runtime.id || message?.type !== "bigv-diagnostics")
      return
    const videos = Array.from(document.querySelectorAll("video"))
    const supported = videos.filter(isInstagramVideo)
    respond({
      version: chrome.runtime.getManifest().version,
      enabled: controllerEnabled,
      clickMode: resolveClickMode(storedClickMode, storedLegacyClick),
      storageAvailable,
      page: getPageMode(location.pathname),
      language: document.documentElement.lang,
      videos: videos.length,
      supportedVideos: supported.length,
      waitingForMetadata: supported.filter((video) => video.readyState < 1)
        .length,
      missingContainer: supported.filter((video) => !getVideoContainer(video))
        .length,
      controllers: feed.count + reels.count + stories.count,
      sources: {
        blob: supported.filter((video) =>
          (video.currentSrc || video.src).startsWith("blob:")
        ).length,
        https: supported.filter((video) =>
          (video.currentSrc || video.src).startsWith("https:")
        ).length
      }
    })
  }
  chrome.runtime.onMessage.addListener(diagnose)
  void start()
  return () => {
    disposed = true
    clearInterval(urlTimer)
    stopSettingsWatch.splice(0).forEach((stop) => stop())
    chrome.runtime.onMessage.removeListener(diagnose)
    deleteControllers()
  }
}

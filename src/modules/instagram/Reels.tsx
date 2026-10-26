import { createRoot, type Root } from "react-dom/client"

import { Storage } from "@plasmohq/storage"

import Buttons from "~components/Buttons"
import {
  IG_NEW_VOLUME_INDICATOR,
  IG_REELS_VOLUME_INDICATOR
} from "~utils/constants"
import { pictureInPicture } from "~utils/picture-in-picture"
import { getActiveInstagramVideo, isInstagramVideo } from "~utils/video"

import { Variant } from "../Injector"
import IntervalInjector, {
  type IntervalInjectorOptions
} from "../IntervalInjector"

type ButtonInjection = {
  root: Root
  container: HTMLElement
  controller: HTMLElement
}

export default class Reels extends IntervalInjector {
  private commentsInterval: ReturnType<typeof setInterval> | null = null
  private pauseOnComments = true
  private buttonInjections: ButtonInjection[] = []
  private activeVideo: HTMLVideoElement | null = null

  private getActiveReelVideo(): HTMLVideoElement | null {
    return this.activeVideo
  }

  private muteInactivePlayingVideos(videos: Iterable<HTMLVideoElement>): void {
    const activeVideo = this.getActiveReelVideo()

    for (const video of videos) {
      if (!isInstagramVideo(video) || video === activeVideo) continue
      if (video.paused) continue

      video.muted = true
      video.volume = 0
    }
  }

  constructor(options?: IntervalInjectorOptions) {
    super({
      ...options,
      variant: Variant.Reels
    })

    this.loadState()
  }

  public async loadState() {
    const storage = new Storage()
    this.pauseOnComments = (await storage.get("bigv-pause-on-comments")) ?? true
    storage.watch({
      "bigv-pause-on-comments": (c) => {
        this.pauseOnComments = c.newValue ?? true
      }
    })
  }

  public beforeInject(): void {
    document.documentElement.setAttribute("data-bigv-reels-active", "true")
    this.hideElements(IG_REELS_VOLUME_INDICATOR, true)
    this.hideElements(IG_NEW_VOLUME_INDICATOR, false)
  }

  protected shouldInjectVideo(video: HTMLVideoElement): boolean {
    return this.getActiveReelVideo() === video
  }

  protected shouldInjectImmediately(video: HTMLVideoElement): boolean {
    return !video.paused
  }

  public injectMethod(): void {
    document.documentElement.setAttribute("data-bigv-reels-active", "true")
    const videos = document.querySelectorAll<HTMLVideoElement>("video")
    const previousActiveVideo = this.activeVideo
    this.activeVideo = getActiveInstagramVideo(videos)
    pictureInPicture.follow(this.activeVideo)
    this.muteInactivePlayingVideos(videos)
    super.injectMethod()
    if (this.activeVideo && this.activeVideo !== previousActiveVideo) {
      this.activeVideo.dispatchEvent(new Event("volumechange"))
    }
  }

  public beforeDelete(): void {
    pictureInPicture.stopFollowing()
    this.activeVideo = null
    document.documentElement.removeAttribute("data-bigv-reels-active")

    if (this.commentsInterval) {
      clearInterval(this.commentsInterval)
      this.commentsInterval = null
    }

    for (const { root, container } of this.buttonInjections) {
      root.unmount()
      container.remove()
    }

    this.buttonInjections = []
    localStorage.removeItem("bigv-comments-opened")
  }

  public onDelete(id: string): void {
    const index = this.buttonInjections.findIndex(
      ({ controller }) => controller.id === id
    )
    if (index !== -1) {
      const { root, container } = this.buttonInjections[index]
      root.unmount()
      container.remove()
      this.buttonInjections.splice(index, 1)
    }
  }

  public injected(): void {
    const injection = this.lastInjected
    if (!injection) return

    let el: HTMLElement | null = injection.sourceParent
    while (
      el &&
      !(
        el.lastElementChild &&
        !el.lastElementChild.hasAttribute("style") &&
        el.lastElementChild.classList.contains("html-div")
      )
    ) {
      el = el.parentElement
    }

    const target = el?.lastElementChild
    if (!target) return

    const buttons = document.createElement("div")
    buttons.setAttribute("bigv-inject", "")
    buttons.classList.add("bigv-buttons")
    target.insertAdjacentElement("afterbegin", buttons)

    const root = createRoot(buttons)

    root.render(
      <Buttons controllerId={injection.controller.id} video={injection.video} />
    )

    this.buttonInjections.push({
      root,
      container: buttons,
      controller: injection.controller
    })

    if (this.commentsInterval) clearInterval(this.commentsInterval)

    this.commentsInterval = setInterval(() => {
      if (!this.pauseOnComments) return

      const commentsDialog = document.querySelector("div[role='dialog']")
      if (commentsDialog) {
        localStorage.setItem("bigv-comments-opened", "1")
      } else {
        localStorage.removeItem("bigv-comments-opened")
      }
    }, 750)
  }
}

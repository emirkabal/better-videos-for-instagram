import { unmountComponentAtNode } from "react-dom"
import { createRoot, type Root } from "react-dom/client"

import { Storage } from "@plasmohq/storage"

import Buttons from "~components/Buttons"
import {
  IG_NEW_VOLUME_INDICATOR,
  IG_REELS_VOLUME_INDICATOR
} from "~utils/constants"

import { Variant, type InjectedProps } from "../Injector"
import IntervalInjector, {
  type IntervalInjectorOptions
} from "../IntervalInjector"

export default class Reels extends IntervalInjector {
  private commentsInterval: NodeJS.Timeout | null = null
  private pauseOnComments = true
  private list: [Root, HTMLElement, HTMLElement][] = []
  private reelGuardEvents = new WeakSet<HTMLVideoElement>()

  private getReelScore(video: HTMLVideoElement): number {
    const rect = video.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return 0

    const visibleWidth =
      Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0)
    const visibleHeight =
      Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0)

    if (visibleWidth <= 0 || visibleHeight <= 0) return 0

    const visibleRatio =
      (visibleWidth * visibleHeight) / (rect.width * rect.height)
    const videoCenter = rect.top + rect.height / 2
    const viewportCenter = window.innerHeight / 2
    const centerPenalty =
      Math.abs(videoCenter - viewportCenter) / Math.max(window.innerHeight, 1)

    return visibleRatio - centerPenalty
  }

  private getActiveReelVideo(): HTMLVideoElement | null {
    const videos = Array.from(
      document.querySelectorAll<HTMLVideoElement>("video")
    ).filter((video) => video.src.startsWith("blob:"))

    if (videos.length === 0) return null

    return videos.reduce<HTMLVideoElement | null>((activeVideo, video) => {
      if (!activeVideo) return video

      return this.getReelScore(video) > this.getReelScore(activeVideo)
        ? video
        : activeVideo
    }, null)
  }

  private syncReelAudioState(): void {
    const activeVideo = this.getActiveReelVideo()
    const videos = document.querySelectorAll<HTMLVideoElement>("video")

    for (const video of videos) {
      if (!video.src.startsWith("blob:")) continue

      if (video === activeVideo) {
        video.setAttribute("bigv-active-reel", "")
        continue
      }

      video.removeAttribute("bigv-active-reel")
      video.muted = true
      video.volume = 0
    }
  }

  private attachReelAudioGuard(): void {
    const videos = document.querySelectorAll<HTMLVideoElement>("video")

    for (const video of videos) {
      if (!video.src.startsWith("blob:") || this.reelGuardEvents.has(video)) {
        continue
      }

      this.reelGuardEvents.add(video)
      ;["play", "playing", "volumechange", "timeupdate", "seeked"].forEach(
        (event) => {
          video.addEventListener(
            event,
            () => {
              queueMicrotask(() => this.syncReelAudioState())
            },
            true
          )
        }
      )
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
        this.pauseOnComments = c.newValue
      }
    })
  }

  public beforeInject(): void {
    this.removeElements(IG_REELS_VOLUME_INDICATOR, true)
    this.removeElements(IG_NEW_VOLUME_INDICATOR, false)
  }

  protected shouldInjectVideo(video: HTMLVideoElement): boolean {
    return this.getActiveReelVideo() === video
  }

  public injectMethod(): void {
    this.attachReelAudioGuard()
    this.syncReelAudioState()
    super.injectMethod()
    this.syncReelAudioState()
  }

  public beforeDelete(): void {
    if (this.commentsInterval) {
      clearInterval(this.commentsInterval)
      this.commentsInterval = null
    }

    for (const [root, container] of this.list) {
      root.unmount()
      container.remove()
    }
  }

  public onDelete(id: string): void {
    const index = this.list.findIndex(
      ([_, __, controller]) => controller.id === id
    )
    if (index !== -1) {
      const [root, container] = this.list[index]
      root.unmount()
      container.remove()
      this.list.splice(index, 1)
    }
  }

  public injected(props: InjectedProps): void {
    if (!this.lastInjected) return

    let el = this.lastInjected[1]
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
      <Buttons ctx={{ download: props.downloadableMedia ?? undefined }} />
    )

    this.list.push([root, buttons, this.lastInjected[2]])

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

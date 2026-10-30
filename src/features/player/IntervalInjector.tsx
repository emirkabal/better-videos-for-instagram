import { isInstagramVideo } from "@/features/instagram/media/video"

import Injector, { type InjectorOptions } from "./Injector"

interface Options {
  intervalMs?: number
}

export type IntervalInjectorOptions = Options & InjectorOptions

export default class IntervalInjector extends Injector {
  private intervalMs = 500
  private interval: ReturnType<typeof setInterval> | null = null
  private scanTimer: ReturnType<typeof setTimeout> | null = null
  private observer: MutationObserver | null = null
  private schedule = () => {
    if (this.scanTimer) return
    this.scanTimer = setTimeout(() => {
      this.scanTimer = null
      this.injectMethod()
    }, 80)
  }

  constructor(options?: IntervalInjectorOptions) {
    super(options)
    this.intervalMs = options?.intervalMs ?? this.intervalMs
  }

  protected shouldInjectVideo(_video: HTMLVideoElement): boolean {
    return true
  }

  protected shouldInjectImmediately(video: HTMLVideoElement): boolean {
    return video.readyState >= HTMLMediaElement.HAVE_METADATA
  }

  public override deleted(): void {
    if (this.interval) clearInterval(this.interval)
    this.interval = null
    if (this.scanTimer) clearTimeout(this.scanTimer)
    this.scanTimer = null
    this.observer?.disconnect()
    this.observer = null
    document.removeEventListener("scroll", this.schedule, true)
    document.removeEventListener("loadedmetadata", this.schedule, true)
    document.removeEventListener("play", this.schedule, true)
  }

  public injectMethod(): void {
    this.pruneDisconnected()
    const videos = document.querySelectorAll("video")
    if (videos.length === 0) return

    for (const video of videos) {
      const typedVideo = video as HTMLVideoElement
      if (!isInstagramVideo(typedVideo)) continue

      if (
        !this.isInjected(typedVideo) &&
        this.shouldInjectImmediately(typedVideo) &&
        this.shouldInjectVideo(typedVideo)
      ) {
        this.inject(typedVideo, typedVideo.parentElement!)
      }
    }
  }

  public override wayToInject(): void {
    if (this.interval) {
      this.schedule()
      return
    }
    this.observer = new MutationObserver((records) => {
      if (
        records.some(
          (record) =>
            record.type === "childList" ||
            record.attributeName === "src" ||
            record.attributeName === "srcset"
        )
      )
        this.schedule()
    })
    this.observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src", "srcset"]
    })
    document.addEventListener("scroll", this.schedule, true)
    document.addEventListener("loadedmetadata", this.schedule, true)
    document.addEventListener("play", this.schedule, true)
    this.injectMethod()
    this.interval = setInterval(() => this.injectMethod(), this.intervalMs)
  }
}

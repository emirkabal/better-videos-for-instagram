import { isInstagramVideo } from "~utils/video"

import Injector, { type InjectorOptions } from "./Injector"

interface Options {
  intervalMs?: number
}

export type IntervalInjectorOptions = Options & InjectorOptions

export default class IntervalInjector extends Injector {
  private intervalMs = 100
  private interval: ReturnType<typeof setInterval> | null = null

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

  public deleted(): void {
    if (!this.interval) return

    clearInterval(this.interval)
    this.interval = null
  }

  public injectMethod(): void {
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

  public wayToInject(): void {
    if (this.interval) clearInterval(this.interval)
    this.injectMethod()
    this.interval = setInterval(() => this.injectMethod(), this.intervalMs)
  }
}

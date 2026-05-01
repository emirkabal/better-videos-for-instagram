import Injector, { type InjectorOptions } from "./Injector"

interface Options {
  intervalMs?: number
}

export type IntervalInjectorOptions = Options & InjectorOptions

export default class IntervalInjector extends Injector {
  private intervalMs = 100
  private interval: NodeJS.Timeout | number | undefined

  constructor(options?: IntervalInjectorOptions) {
    super(options)
    this.intervalMs = options?.intervalMs || this.intervalMs
  }

  protected shouldInjectVideo(_video: HTMLVideoElement): boolean {
    return true
  }

  protected shouldAttachListeners(_video: HTMLVideoElement): boolean {
    return true
  }

  protected shouldInjectImmediately(_video: HTMLVideoElement): boolean {
    return false
  }

  public deleted(): void {
    if (this.interval) clearInterval(this.interval)
  }

  public injectMethod(): void {
    const videos = document.querySelectorAll("video")
    if (videos.length === 0) return

    for (const video of videos) {
      if (!video?.src.startsWith("blob:")) continue

      const typedVideo = video as HTMLVideoElement

      if (
        !this.isInjected(typedVideo) &&
        !typedVideo.hasAttribute("bigv-attached-listeners")
      ) {
        typedVideo.setAttribute("bigv-attached-listeners", "")
        ;[
          "loadedmetadata",
          "loadeddata",
          "canplay",
          "play",
          "timeupdate",
          "playing"
        ].forEach((event) => {
          typedVideo.addEventListener(event, () => {
            if (!this.shouldAttachListeners(typedVideo)) return
            if (!this.shouldInjectVideo(typedVideo)) return
            this.inject(typedVideo, typedVideo.parentElement!)
          })
        })
      }

      if (
        !this.isInjected(typedVideo) &&
        this.shouldAttachListeners(typedVideo) &&
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

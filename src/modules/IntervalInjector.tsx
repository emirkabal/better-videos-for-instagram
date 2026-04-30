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

  public deleted(): void {
    if (this.interval) clearInterval(this.interval)
  }

  public injectMethod(): void {
    const videos = document.querySelectorAll("video")
    if (videos.length === 0) return
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i]
      if (!video?.src.startsWith("blob:")) continue
      if (!video.hasAttribute("bigv-attached-listeners")) {
        video.setAttribute("bigv-attached-listeners", "")
        ;[
          "loadedmetadata",
          "loadeddata",
          "canplay",
          "play",
          "timeupdate",
          "playing"
        ].forEach((event) => {
          video.addEventListener(event, () => {
            if (!this.shouldAttachListeners(video as HTMLVideoElement)) return
            if (!this.shouldInjectVideo(video as HTMLVideoElement)) return
            this.inject(video as HTMLVideoElement, video.parentElement!)
          })
        })
      }

      if (
        !this.isInjected(video as HTMLVideoElement) &&
        this.shouldAttachListeners(video as HTMLVideoElement) &&
        this.shouldInjectVideo(video as HTMLVideoElement)
      ) {
        this.inject(video as HTMLVideoElement, video.parentElement!)
      }
    }
  }

  public wayToInject(): void {
    if (this.interval) clearInterval(this.interval)
    this.injectMethod()
    this.interval = setInterval(() => this.injectMethod(), this.intervalMs)
  }
}

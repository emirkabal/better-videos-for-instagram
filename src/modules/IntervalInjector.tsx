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

  public deleted(): void {
    if (this.interval) clearInterval(this.interval)
  }

  public injectMethod(): void {
    const videos = document.querySelectorAll("video")
    if (videos.length === 0) return
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i]
      if (!video?.src.startsWith('blob:')) continue
      if (
        this.isInjected(video as HTMLVideoElement) ||
        video.hasAttribute("bigv-attached-listeners")
      )
        continue
      video.setAttribute("bigv-attached-listeners", "")
      ;["play", "timeupdate", "playing"].forEach((event) => {
        video.addEventListener(event, () => {
          this.inject(video as HTMLVideoElement, video.parentElement!)
        })
      })
    }
  }

  public wayToInject(): void {
    if (this.interval) clearInterval(this.interval)
    this.injectMethod()
    this.interval = setInterval(() => this.injectMethod(), this.intervalMs)
  }
}

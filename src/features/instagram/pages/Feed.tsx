import { isVideoInViewport } from "@/features/instagram/media/video"

import IntervalInjector from "../../player/IntervalInjector"

export default class Feed extends IntervalInjector {
  protected override shouldInjectVideo(video: HTMLVideoElement): boolean {
    return isVideoInViewport(video)
  }
}

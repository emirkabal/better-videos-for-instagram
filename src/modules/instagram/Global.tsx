import {
  IG_DIRECT_VOLUME_INDICATOR,
  IG_HOME_VOLUME_INDICATOR,
  IG_NEW_VOLUME_INDICATOR
} from "~utils/constants"
import { isVideoInViewport } from "~utils/video"

import IntervalInjector, {
  type IntervalInjectorOptions
} from "../IntervalInjector"

export default class Global extends IntervalInjector {
  constructor(options?: IntervalInjectorOptions) {
    super(options)
  }

  public beforeInject(): void {
    this.hideElements(IG_NEW_VOLUME_INDICATOR, false)
    this.hideElements(IG_DIRECT_VOLUME_INDICATOR, false)
    this.hideElements(IG_HOME_VOLUME_INDICATOR, true)
  }

  protected shouldInjectVideo(video: HTMLVideoElement): boolean {
    return isVideoInViewport(video)
  }
}

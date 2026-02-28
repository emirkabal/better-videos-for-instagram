import { IG_DIRECT_VOLUME_INDICATOR, IG_HOME_VOLUME_INDICATOR, IG_NEW_VOLUME_INDICATOR } from "~utils/constants"

import IntervalInjector, {
  type IntervalInjectorOptions
} from "../IntervalInjector"

export default class Global extends IntervalInjector {
  constructor(options?: IntervalInjectorOptions) {
    super(options)
  }

  public beforeInject(): void {
    this.removeElements(IG_NEW_VOLUME_INDICATOR, false)
    this.removeElements(IG_DIRECT_VOLUME_INDICATOR, false)
    this.removeElements(IG_HOME_VOLUME_INDICATOR, true)
  }


}

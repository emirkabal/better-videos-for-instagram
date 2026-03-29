import {
  IG_DIRECT_VOLUME_INDICATOR,
  IG_HOME_VOLUME_INDICATOR,
  IG_NEW_VOLUME_INDICATOR
} from "~utils/constants"

import { type InjectorOptions } from "../Injector"
import MutationInjector from "../MutationInjector"

export default class Global extends MutationInjector {
  constructor(options?: InjectorOptions) {
    super(options)
  }

  public beforeInject(): void {
    this.removeElements(IG_NEW_VOLUME_INDICATOR, false)
    this.removeElements(IG_DIRECT_VOLUME_INDICATOR, false)
    this.removeElements(IG_HOME_VOLUME_INDICATOR, true)
  }
}

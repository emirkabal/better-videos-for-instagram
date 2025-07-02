import { createRoot } from "react-dom/client"

import { Volume } from "~components/Controller"
import ViewIndicator from "~components/Controller/ViewIndicator"
import { Variant } from "~modules/Injector"
import { IG_STORIES_VOLUME_INDICATOR } from "~utils/constants"

import IntervalInjector, {
  type IntervalInjectorOptions
} from "../IntervalInjector"

export default class Stories extends IntervalInjector {
  constructor(options?: IntervalInjectorOptions) {
    super({
      ...options,
      variant: Variant.Stories
    })
  }

  public injected(): void {
    const igVolumeControl = document.querySelector(IG_STORIES_VOLUME_INDICATOR)
    if (!igVolumeControl) return

    const buttonsContainer = igVolumeControl.parentElement
    if (!buttonsContainer) return

    buttonsContainer.parentElement.parentElement.parentElement.style.paddingBottom =
      "64px"

    buttonsContainer.style.setProperty("position", "relative")

    // default ig progress bar
    const igDefaultProgressBars =
      igVolumeControl.parentElement.parentElement.parentElement.querySelector(
        "div"
      )

    igDefaultProgressBars.style.setProperty("display", "none")

    const [current, total] = [
      Array.from(igDefaultProgressBars.children).findIndex((e) => e.innerHTML) +
        1,
      igDefaultProgressBars.childElementCount
    ]

    igVolumeControl.remove()

    const volumeButton = document.createElement("div")
    const viewIndicator = document.createElement("div")
    viewIndicator.style.setProperty("margin-right", "52px")

    buttonsContainer.appendChild(volumeButton)
    buttonsContainer.insertBefore(
      viewIndicator,
      buttonsContainer.querySelector('div[role="button"]')
    )

    createRoot(volumeButton).render(<Volume variant={this.variant} />)
    createRoot(viewIndicator).render(
      <ViewIndicator current={current} total={total} />
    )
  }
}

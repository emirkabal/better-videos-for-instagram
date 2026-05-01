import { createRoot } from "react-dom/client"

import { Volume } from "~components/Controller"
import { Variant } from "~modules/Injector"
import {
  IG_STORIES_BUTTONS_CONTAINER_INDICATOR,
  IG_STORIES_PROGRESS_BARS_INDICATOR,
  IG_STORIES_VOLUME_INDICATOR
} from "~utils/constants"

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
    const volumeControl = document.querySelector(IG_STORIES_VOLUME_INDICATOR)

    const buttonsContainer = document.querySelector<HTMLElement>(
      IG_STORIES_BUTTONS_CONTAINER_INDICATOR
    )

    if (!buttonsContainer) return

    buttonsContainer.style.setProperty("position", "relative")

    const progressBars = document.querySelector<HTMLElement>(
      IG_STORIES_PROGRESS_BARS_INDICATOR
    )

    progressBars?.style.setProperty("display", "none")

    if (progressBars) {
      this.injectViewIndicator(buttonsContainer, progressBars)
    }

    if (volumeControl) {
      this.injectVolume(buttonsContainer, volumeControl)
    }
  }

  private injectViewIndicator(
    buttonsContainer: HTMLElement,
    progressBars: HTMLElement
  ): void {
    const current =
      Array.from(progressBars.children).findIndex(
        (element) => element.innerHTML
      ) + 1

    const total = progressBars.childElementCount

    const viewIndicator = document.createElement("div")

    viewIndicator.textContent = `${current} / ${total}`

    Object.assign(viewIndicator.style, {
      position: "absolute",
      top: "16px",
      color: "white",
      fontSize: "12px",
      left: "50%",
      transform: "translate(-50%, -50%)"
    })

    buttonsContainer.parentElement?.appendChild(viewIndicator)
  }

  private injectVolume(
    buttonsContainer: HTMLElement,
    volumeControl: Element
  ): void {
    buttonsContainer.style.setProperty("padding-bottom", "64px")

    volumeControl.remove()

    const volumeButton = document.createElement("div")
    buttonsContainer.appendChild(volumeButton)

    createRoot(volumeButton).render(<Volume variant={this.variant} />)
  }
}

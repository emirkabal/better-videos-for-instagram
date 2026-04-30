import { createRoot } from "react-dom/client"

import { Storage } from "@plasmohq/storage"

import { Volume } from "~components/Controller"
import ViewIndicator from "~components/Controller/ViewIndicator"
import { Variant } from "~modules/Injector"
import { IG_STORIES_VOLUME_INDICATOR } from "~utils/constants"

import IntervalInjector, {
  type IntervalInjectorOptions
} from "../IntervalInjector"

export default class Stories extends IntervalInjector {
  private showViewIndicator = true

  constructor(options?: IntervalInjectorOptions) {
    super({
      ...options,
      variant: Variant.Stories
    })

    this.loadState()
  }

  public async loadState() {
    const storage = new Storage()
    this.showViewIndicator =
      (await storage.get("bigv-show-story-view-indicator")) ?? true
    storage.watch({
      "bigv-show-story-view-indicator": (c) => {
        this.showViewIndicator = c.newValue
      }
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

    if (this.showViewIndicator) {
      igDefaultProgressBars.style.setProperty("display", "none")
    }

    const [current, total] = [
      Array.from(igDefaultProgressBars.children).findIndex((e) => e.innerHTML) +
        1,
      igDefaultProgressBars.childElementCount
    ]

    igVolumeControl.remove()

    const volumeButton = document.createElement("div")

    buttonsContainer.appendChild(volumeButton)

    createRoot(volumeButton).render(<Volume variant={this.variant} />)

    if (this.showViewIndicator) {
      const viewIndicator = document.createElement("div")
      viewIndicator.style.setProperty("margin-right", "52px")
      buttonsContainer.insertBefore(
        viewIndicator,
        buttonsContainer.querySelector('div[role="button"]')
      )
      createRoot(viewIndicator).render(
        <ViewIndicator current={current} total={total} />
      )
    }
  }
}

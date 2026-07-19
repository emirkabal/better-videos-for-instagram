import { createRoot, type Root } from "react-dom/client"

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

type StyleSnapshot = {
  element: HTMLElement
  property: string
  value: string
  priority: string
}

export default class Stories extends IntervalInjector {
  private roots: Root[] = []
  private addedElements: HTMLElement[] = []
  private styleSnapshots: StyleSnapshot[] = []

  constructor(options?: IntervalInjectorOptions) {
    super({
      ...options,
      variant: Variant.Stories
    })
  }

  public injected(): void {
    const buttonsContainer = document.querySelector<HTMLElement>(
      IG_STORIES_BUTTONS_CONTAINER_INDICATOR
    )

    if (!buttonsContainer) return

    this.cleanupStoryUi()
    this.setTemporaryStyle(buttonsContainer, "position", "relative")

    const progressBars = document.querySelector<HTMLElement>(
      IG_STORIES_PROGRESS_BARS_INDICATOR
    )

    if (progressBars) {
      this.setTemporaryStyle(progressBars, "display", "none")
      this.injectViewIndicator(buttonsContainer, progressBars)
    }

    const volumeControl = Array.from(
      document.querySelectorAll<HTMLElement>(IG_STORIES_VOLUME_INDICATOR)
    ).find((element) => !element.closest("[bigv-inject]"))

    if (volumeControl) {
      this.injectVolume(buttonsContainer, volumeControl)
    }
  }

  public beforeDelete(): void {
    this.cleanupStoryUi()
  }

  private setTemporaryStyle(
    element: HTMLElement,
    property: string,
    value: string,
    priority = ""
  ): void {
    this.styleSnapshots.push({
      element,
      property,
      value: element.style.getPropertyValue(property),
      priority: element.style.getPropertyPriority(property)
    })
    element.style.setProperty(property, value, priority)
  }

  private cleanupStoryUi(): void {
    this.roots.forEach((root) => root.unmount())
    this.addedElements.forEach((element) => element.remove())

    for (const { element, property, value, priority } of this.styleSnapshots) {
      if (value) element.style.setProperty(property, value, priority)
      else element.style.removeProperty(property)
    }

    this.roots = []
    this.addedElements = []
    this.styleSnapshots = []
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
    viewIndicator.className = "bigv-story-view-indicator"
    viewIndicator.textContent = `${current} / ${total}`

    const parent = buttonsContainer.parentElement
    if (!parent) return

    parent.appendChild(viewIndicator)
    this.addedElements.push(viewIndicator)
  }

  private injectVolume(
    buttonsContainer: HTMLElement,
    volumeControl: HTMLElement
  ): void {
    this.setTemporaryStyle(buttonsContainer, "padding-bottom", "64px")
    this.setTemporaryStyle(volumeControl, "display", "none", "important")

    const volumeButton = document.createElement("div")
    volumeButton.setAttribute("bigv-inject", "")
    buttonsContainer.appendChild(volumeButton)

    const root = createRoot(volumeButton)
    root.render(<Volume variant={this.variant} />)

    this.roots.push(root)
    this.addedElements.push(volumeButton)
  }
}

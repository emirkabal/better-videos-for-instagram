import { createRoot, type Root } from "react-dom/client"

import PlaybackSpeed from "~components/Controller/Buttons/PlaybackSpeed"
import PlayerControls from "~components/Controller/PlayerControls"
import Volume from "~components/Controller/Volume"
import { Variant, type InjectedProps } from "~modules/Injector"
import {
  IG_STORIES_BUTTONS_CONTAINER_INDICATOR,
  IG_STORIES_PROGRESS_BARS_INDICATOR
} from "~utils/constants"
import { getActiveInstagramVideo } from "~utils/video"

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

  protected shouldInjectVideo(video: HTMLVideoElement): boolean {
    return getActiveInstagramVideo() === video
  }

  public injected({ video }: InjectedProps): void {
    this.cleanupStoryUi()
    this.injectControls(video)
    const buttonsContainer = document.querySelector<HTMLElement>(
      IG_STORIES_BUTTONS_CONTAINER_INDICATOR
    )

    if (!buttonsContainer) return

    const progressBars = document.querySelector<HTMLElement>(
      IG_STORIES_PROGRESS_BARS_INDICATOR
    )

    if (progressBars) {
      this.setTemporaryStyle(progressBars, "display", "none")
      this.injectViewIndicator(buttonsContainer, progressBars)
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

  private injectControls(video: HTMLVideoElement): void {
    const videoContainer =
      video.closest<HTMLElement>("div:has(>[data-instancekey])") ??
      video.parentElement
    if (!videoContainer) return
    if (getComputedStyle(videoContainer).position === "static")
      this.setTemporaryStyle(videoContainer, "position", "relative")

    const volumeButton = document.createElement("div")
    volumeButton.setAttribute("bigv-inject", "")
    volumeButton.className = "bigv-story-controls-viewport"
    videoContainer.appendChild(volumeButton)

    const root = createRoot(volumeButton)
    root.render(
      <PlayerControls video={video} variant={this.variant}>
        <Volume video={video} variant={this.variant} placement="dock" />
        <PlaybackSpeed placement="dock" />
      </PlayerControls>
    )

    this.roots.push(root)
    this.addedElements.push(volumeButton)
  }
}

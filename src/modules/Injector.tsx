import { createRoot, type Root } from "react-dom/client"

import Controller from "~components/Controller"
import { IG_STORIES_INJECTOR_INDICATOR } from "~utils/constants"
import { isInstagramVideo } from "~utils/video"

type InjectionRecord = {
  video: HTMLVideoElement
  sourceParent: HTMLElement
  controller: HTMLElement
  root: Root
  restoreAnchor?: () => void
}
type HiddenElementSnapshot = {
  visibility: string
  visibilityPriority: string
  pointerEvents: string
  pointerEventsPriority: string
}
export type DownloadableMedia = {
  id: string
  index?: number
  variant: Variant
}
export enum Variant {
  Default = "default",
  Reels = "reels",
  Stories = "stories"
}
export interface InjectorOptions {
  improvePerformance?: boolean
  minRemoveCount?: number
  removeCount?: number
  variant?: Variant
}

export interface InjectedProps {
  video: HTMLVideoElement
  downloadableMedia?: DownloadableMedia
}

export default class Injector {
  private improvePerformance = true
  private minRemoveCount = 4
  private removeCount = 3

  variant: Variant = Variant.Default

  private injectedList: InjectionRecord[] = []
  private hiddenElements = new Map<
    HTMLElement | SVGElement,
    HiddenElementSnapshot
  >()

  constructor(options: InjectorOptions | undefined) {
    this.minRemoveCount = options?.minRemoveCount ?? this.minRemoveCount
    this.removeCount = options?.removeCount ?? this.removeCount
    this.improvePerformance =
      options?.improvePerformance ?? this.improvePerformance
    this.variant = options?.variant ?? this.variant
  }

  public beforeInject(): void {}
  public injected(props: InjectedProps): void {}
  public beforeDelete(): void {}
  public deleted(): void {}
  public wayToInject(): void {}
  public onDelete(id: string) {}

  get lastInjected() {
    return this.injectedList[this.injectedList.length - 1]
  }

  private dispose(record: InjectionRecord): void {
    record.video.removeAttribute("bigv-injected")
    record.restoreAnchor?.()
    this.onDelete(record.controller.id)
    record.root.unmount()
    record.controller.remove()
  }

  private clear() {
    if (
      this.injectedList.length > this.minRemoveCount &&
      this.improvePerformance
    ) {
      const records = this.injectedList.splice(0, this.removeCount)
      records.forEach((record) => this.dispose(record))
    }
  }

  public hideElements(selector: string, hideParent: boolean): void {
    for (const element of document.querySelectorAll(selector)) {
      if (element.closest("[bigv-inject]")) continue

      const target = hideParent ? element.parentElement : element
      if (!(target instanceof HTMLElement) && !(target instanceof SVGElement))
        continue
      if (this.hiddenElements.has(target)) continue

      this.hiddenElements.set(target, {
        visibility: target.style.getPropertyValue("visibility"),
        visibilityPriority: target.style.getPropertyPriority("visibility"),
        pointerEvents: target.style.getPropertyValue("pointer-events"),
        pointerEventsPriority:
          target.style.getPropertyPriority("pointer-events")
      })

      target.style.setProperty("visibility", "hidden", "important")
      target.style.setProperty("pointer-events", "none", "important")
    }
  }

  private restoreHiddenElements(): void {
    for (const [element, snapshot] of this.hiddenElements) {
      if (snapshot.visibility) {
        element.style.setProperty(
          "visibility",
          snapshot.visibility,
          snapshot.visibilityPriority
        )
      } else {
        element.style.removeProperty("visibility")
      }

      if (snapshot.pointerEvents) {
        element.style.setProperty(
          "pointer-events",
          snapshot.pointerEvents,
          snapshot.pointerEventsPriority
        )
      } else {
        element.style.removeProperty("pointer-events")
      }
    }

    this.hiddenElements.clear()
  }

  public delete() {
    this.beforeDelete()
    const records = this.injectedList.splice(0)
    records.forEach((record) => this.dispose(record))
    this.restoreHiddenElements()
    this.deleted()
  }

  private removeRedirects(
    anchor: HTMLAnchorElement | null,
    video: HTMLVideoElement
  ): (() => void) | undefined {
    if (!anchor || anchor.dataset.betterInstagramFixed) return undefined

    const originalHref = anchor.getAttribute("href")
    const originalCursor = anchor.style.cursor
    const originalDraggable = anchor.getAttribute("draggable")

    const event = (e: MouseEvent) => {
      if (e.target instanceof Element && !e.target.closest(".bigv-control")) {
        e.preventDefault()
        e.stopPropagation()
        if (video.paused) video.play()
        else video.pause()
      }
    }
    anchor.addEventListener("click", event, true)

    anchor.removeAttribute("href")
    anchor.style.cursor = "default"
    anchor.draggable = false
    anchor.dataset.betterInstagramFixed = "true"

    return () => {
      anchor.removeEventListener("click", event, true)

      if (originalHref === null) anchor.removeAttribute("href")
      else anchor.setAttribute("href", originalHref)

      anchor.style.cursor = originalCursor

      if (originalDraggable === null) anchor.removeAttribute("draggable")
      else anchor.setAttribute("draggable", originalDraggable)

      delete anchor.dataset.betterInstagramFixed
    }
  }

  public inject(video: HTMLVideoElement, parent: HTMLElement): void {
    if (
      !video ||
      !video?.parentElement ||
      !isInstagramVideo(video) ||
      video?.hasAttribute("bigv-injected")
    )
      return

    const controller = document.createElement("div")
    controller.id = crypto.randomUUID()
    controller.setAttribute("bigv-inject", "")
    controller.setAttribute("data-bigv-controller", "")

    let anchorElement: HTMLAnchorElement | null = null
    let mountParent: ParentNode | null = null
    let insertBefore: Node | null = null

    switch (this.variant) {
      case Variant.Stories: {
        const el = document.querySelector(IG_STORIES_INJECTOR_INDICATOR)
        if (!el?.parentNode) return
        mountParent = el.parentNode
        insertBefore = el
        break
      }
      case Variant.Reels: {
        mountParent = video.closest("div:has(>[data-instancekey])")
        break
      }
      case Variant.Default: {
        mountParent = video.closest(
          "div:has(>[data-instancekey])"
        )?.parentElement
        anchorElement = video.closest("a")
        break
      }
    }

    if (!mountParent) return

    if (mountParent instanceof Element) {
      const existingController = Array.from(mountParent.children).find(
        (element) => element.hasAttribute("data-bigv-controller")
      )

      if (existingController) {
        const existingIndex = this.injectedList.findIndex(
          (record) => record.controller === existingController
        )
        const existingRecord =
          existingIndex !== -1 ? this.injectedList[existingIndex] : undefined

        if (existingRecord?.video === video) return

        if (existingRecord) {
          this.injectedList.splice(existingIndex, 1)
          this.dispose(existingRecord)
        } else {
          existingController.remove()
        }
      }
    }

    this.beforeInject()
    this.clear()
    mountParent.insertBefore(controller, insertBefore)

    video.setAttribute("bigv-injected", "")
    const restoreAnchor = this.removeRedirects(anchorElement, video)

    const id = location.pathname.split("/")[2]
    const params = new URLSearchParams(location.search)
    const index = params.get("img_index")
    const downloadableMedia: DownloadableMedia = {
      id: id ?? "",
      index: index ? parseInt(index) : undefined,
      variant: this.variant
    }

    const root = createRoot(controller)
    root.render(
      <Controller
        id={controller.id}
        video={video}
        variant={this.variant}
        downloadableMedia={
          downloadableMedia.id !== "" ? downloadableMedia : undefined
        }
      />
    )

    this.injectedList.push({
      video,
      sourceParent: parent,
      controller,
      root,
      restoreAnchor
    })
    this.injected({
      video,
      downloadableMedia:
        downloadableMedia.id !== "" ? downloadableMedia : undefined
    })
  }

  public isInjected(video: HTMLVideoElement): boolean {
    return video.hasAttribute("bigv-injected")
  }
}

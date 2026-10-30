import { createRoot, type Root } from "react-dom/client"

import Controller from "@/components/Controller"
import { isNativeReelClick, type ClickMode } from "@/utils/playback/click-mode"
import { setVideoPlaying } from "@/utils/fullscreen/playback"
import {
  isInstagramVideo,
  isVideoInViewport
} from "@/features/instagram/media/video"
import {
  getVideoContainer,
  positionVideoContainer
} from "@/utils/media/container"

type InjectionRecord = {
  video: HTMLVideoElement
  sourceParent: HTMLElement
  controller: HTMLElement
  root: Root
  anchor: HTMLAnchorElement | null
  restoreAnchor?: () => void
  restorePosition: () => void
}
export type DownloadableMedia = { id: string; index?: number; variant: Variant }
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
  private clickMode: ClickMode = "pause"
  private injectedList: InjectionRecord[] = []
  variant: Variant

  constructor(private options: InjectorOptions = {}) {
    this.variant = options.variant ?? Variant.Default
  }
  public beforeInject(): void {}
  public injected(_props: InjectedProps): void {}
  public beforeDelete(): void {}
  public deleted(): void {}
  public wayToInject(): void {}
  public onDelete(_id: string): void {}

  public setClickMode(mode: ClickMode): void {
    this.clickMode = mode
    for (const record of this.injectedList) {
      this.bindAnchor(record)
      this.render(record)
    }
  }
  get lastInjected() {
    return this.injectedList[this.injectedList.length - 1]
  }
  get count() {
    return this.injectedList.length
  }

  private bindAnchor(record: InjectionRecord) {
    record.restoreAnchor?.()
    record.anchor = record.video.closest("a")
    record.restoreAnchor =
      this.clickMode !== "native" && this.variant === Variant.Default
        ? this.interceptVideoClick(
            record.sourceParent,
            record.anchor,
            record.video
          )
        : undefined
  }
  private dispose(record: InjectionRecord): void {
    record.video.removeAttribute("bigv-injected")
    record.restoreAnchor?.()
    this.onDelete(record.controller.id)
    try {
      record.root.unmount()
    } catch (error) {
      // React's old tree may reference nodes Instagram already removed.
      if (!(error instanceof DOMException && error.name === "NotFoundError"))
        console.warn("[Better IG] Could not unmount replaced controls", error)
    } finally {
      record.controller.remove()
      record.restorePosition()
    }
  }
  private clear() {
    if (
      this.options.improvePerformance === false ||
      this.count <= (this.options.minRemoveCount ?? 4)
    )
      return
    for (const record of this.injectedList
      .filter(({ video }) => !isVideoInViewport(video))
      .slice(0, this.options.removeCount ?? 3)) {
      this.injectedList.splice(this.injectedList.indexOf(record), 1)
      this.dispose(record)
    }
  }
  protected pruneDisconnected(): void {
    for (const record of [...this.injectedList]) {
      const mounted = record.controller.hasAttribute("data-bigv-ready")
      const intact =
        !mounted ||
        (record.controller.querySelector(".bigv-player-dock") &&
          record.controller.querySelector(".better-ig-controller"))
      if (
        record.video.isConnected &&
        record.controller.isConnected &&
        record.controller.parentElement === getVideoContainer(record.video) &&
        intact
      ) {
        if (record.anchor !== record.video.closest("a")) this.bindAnchor(record)
        continue
      }
      this.injectedList.splice(this.injectedList.indexOf(record), 1)
      this.dispose(record)
    }
  }
  public delete() {
    this.beforeDelete()
    this.clearInjected()
    this.deleted()
  }
  protected clearInjected() {
    this.injectedList.splice(0).forEach((record) => this.dispose(record))
  }
  private interceptVideoClick(
    surface: HTMLElement,
    anchor: HTMLAnchorElement | null,
    video: HTMLVideoElement
  ) {
    const click = (event: MouseEvent) => {
      if (
        isNativeReelClick(video) ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey ||
        !(event.target instanceof Element) ||
        !surface.contains(event.target)
      )
        return
      const control = event.target.closest(
        '.bigv-control, button, input, select, textarea, [role="button"], [role="slider"], [contenteditable="true"]'
      )
      // Some Instagram layouts make the entire player a role=button. Only
      // independent controls should bypass click-to-pause in those layouts.
      if (control && !control.contains(video)) return
      event.preventDefault()
      event.stopPropagation()
      void setVideoPlaying(video, video.paused)
    }
    // Keep href intact for native buttons, modifier-click and recycled links.
    document.addEventListener("click", click, true)
    const preventButtonNavigation = (event: MouseEvent) => {
      if (
        !isNativeReelClick(video) &&
        event.target instanceof Element &&
        event.target.closest('button, [role="button"]')
      )
        event.preventDefault()
    }
    anchor?.addEventListener("click", preventButtonNavigation)
    return () => {
      document.removeEventListener("click", click, true)
      anchor?.removeEventListener("click", preventButtonNavigation)
    }
  }
  public inject(video: HTMLVideoElement, _parent: HTMLElement): void {
    if (!isInstagramVideo(video) || this.isInjected(video)) return
    const container = getVideoContainer(video)
    if (!container) return
    this.beforeInject()
    this.clear()
    const controller = document.createElement("div")
    controller.id = crypto.randomUUID()
    controller.setAttribute("bigv-inject", "")
    controller.setAttribute("data-bigv-controller", "")
    controller.className = "bigv-controller-host"
    controller.addEventListener("click", (event) => {
      // Cancelling a checkbox/label's default action reverts its checked state.
      if (
        !(event.target instanceof Element) ||
        !event.target.closest("input, label")
      )
        event.preventDefault()
      event.stopPropagation()
    })
    const restorePosition = positionVideoContainer(container)
    container.append(controller)
    const root = createRoot(controller)
    const record: InjectionRecord = {
      video,
      sourceParent: container,
      controller,
      root,
      anchor: null,
      restorePosition
    }
    this.injectedList.push(record)
    this.bindAnchor(record)
    video.setAttribute("bigv-injected", "")
    this.render(record)
    this.injected({ video })
  }
  public isInjected(video: HTMLVideoElement): boolean {
    return this.injectedList.some((record) => record.video === video)
  }

  private render(record: InjectionRecord) {
    record.root.render(
      <Controller
        id={record.controller.id}
        video={record.video}
        variant={this.variant}
        clickMode={this.clickMode}
      />
    )
  }
}

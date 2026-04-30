import { createRoot, type Root } from "react-dom/client"

import Controller from "~components/Controller"
import { IG_STORIES_INJECTOR_INDICATOR } from "~utils/constants"

export type Injected = [HTMLVideoElement, HTMLElement, HTMLElement, Root, HTMLAnchorElement][]
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

  private injectedList: Injected = []
  private anchorEvents = new WeakMap<HTMLAnchorElement, 
    (e: MouseEvent) => void
  >()

  constructor(options: InjectorOptions | undefined) {
    this.minRemoveCount = options?.minRemoveCount || this.minRemoveCount
    this.removeCount = options?.removeCount || this.removeCount
    this.improvePerformance =
      options?.improvePerformance || this.improvePerformance
    this.variant = options?.variant || this.variant
  }

  /**
   * This method is called before the elements are injected.
   * @example
   * ```ts
   * const injector = new Injector();
   * injector.beforeInject = () => {
   *  console.log("Injecting...");
   * }
   * injector.inject();
   * ```
   * @returns {void}
   */
  public beforeInject(): void { }

  /**
   * This method is called after the elements are injected.
   * @param props {InjectedProps}
   * @example
   * ```ts
   * const injector = new Injector();
   * injector.injected = () => {
   *  console.log("Injected!");
   * }
   * injector.inject();
   * ```
   */
  public injected(props: InjectedProps): void { }

  /**
   * This method is called before the elements are deleted.
   * @example
   * ```ts
   * const injector = new Injector();
   * injector.beforeDelete = () => {
   *  console.log("Deleting...");
   * }
   * injector.delete();
   * ```
   */
  public beforeDelete(): void { }

  /**
   * This method is called after the elements are deleted.
   * @example
   * ```ts
   * const injector = new Injector();
   * injector.deleted = () => {
   *  console.log("Deleted!");
   * }
   * injector.delete();
   * ```
   */
  public deleted(): void { }

  /**
   * This method is custom way to inject.
   * @example
   * ```ts
   * const injector = new Injector();
   * injector.wayToInject = () => {
   *  const video = document.querySelector("video");
   *  if (!video) return;
   *  this.inject(video as HTMLVideoElement, video.parentElement!);
   * }
   * injector.wayToInject();
   * ```
   */
  public wayToInject(): void { }

  /**
   * This method is called when an injected element is deleted.
   * @param id {string} - The ID of the controller that was deleted.
   * @example
   * ```ts
   * const injector = new Injector();
   * injector.onDelete = (id) => {
   *  console.log(`Controller with ID ${id} was deleted.`);
   * }
   * ```
   */
  public onDelete(id: string) { }

  get lastInjected() {
    return this.injectedList[this.injectedList.length - 1]
  }

  private clear() {
    if (
      this.injectedList.length > this.minRemoveCount &&
      this.improvePerformance
    ) {
      for (let i = 0; i < this.removeCount; i++) {
        const [video, _, controller, root, anchor] = this.injectedList.shift()!
        if (!controller || !video) continue
        video.removeAttribute("bigv-injected")
        this.onDelete(controller.id)
        root.unmount()
        controller.remove()
        if (anchor) {
          anchor.removeEventListener('click', this.anchorEvents.get(anchor)!)
        }
      }
    }
  }

  public removeElements(selector: string, removeParent: boolean): void {
    for (const el of document.querySelectorAll(selector)) {
      removeParent ? el.parentElement?.remove() : el.remove()
    }
  }

  /**
   * This method deletes the injected elements.
   * @returns {void}
   */
  public delete() {
    this.beforeDelete()
    for (let i = 0; i < this.injectedList.length; i++) {
      const [video, parent, controller, root] = this.injectedList[i]

      video.removeAttribute("bigv-injected")
      controller.remove()
      root.unmount()
      parent.remove()
    }
    this.injectedList.splice(0, this.injectedList.length)
    this.deleted()
  }


  private removeRedirects(anchor: HTMLAnchorElement | null, video: HTMLVideoElement) {
    if (!anchor || anchor.dataset.betterInstagramFixed) return;

    const event = (e: MouseEvent) => {
      if (e.target instanceof HTMLElement && !e.target.closest('.bigv-control')) {
        e.preventDefault();
        e.stopPropagation();
        if (video.paused) video.play();
        else video.pause();
      }
    }
    anchor.addEventListener('click', event, true);


    anchor.removeAttribute('href');
    anchor.style.cursor = 'default';
    anchor.draggable = false;
    anchor.dataset.betterInstagramFixed = "true";

    this.anchorEvents.set(anchor, event)
  }

  /**
   * This method inject the Controller component to the video element.
   * @param video {HTMLVideoElement}
   * @param parent {HTMLElement}
   * @returns {void}
   */
  public inject(video: HTMLVideoElement, parent: HTMLElement): void {

    if (
      !video ||
      !video?.parentElement ||
      !video?.src ||
      !video.src.startsWith('blob:') ||
      video?.hasAttribute("bigv-injected")
    )
      return

    this.beforeInject()
    this.clear()

    video.setAttribute("bigv-injected", "")

    const controller = document.createElement("div")
    controller.id = crypto.randomUUID()
    controller.setAttribute("bigv-inject", "")

    let anchorElement

    switch (this.variant) {
      case Variant.Stories:
        const el = document.querySelector(IG_STORIES_INJECTOR_INDICATOR)
        if (!el) return
        el.parentNode.insertBefore(controller, el)
        break
      case Variant.Reels:
        video.closest('div:has(>[data-instancekey])')?.appendChild(controller)
        break
      case Variant.Default:
        anchorElement = video.closest('a')
        video.closest('div:has(>[data-instancekey])')?.parentElement?.appendChild(controller)
        this.removeRedirects(anchorElement, video)
        break
    }


    video.currentTime = 0
    video.volume = 0

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

    this.injectedList.push([video, parent, controller, root, anchorElement])
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

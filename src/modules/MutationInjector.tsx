import Injector, { type InjectorOptions } from "./Injector"

/**
 * MutationInjector — replaces the polling-based IntervalInjector.
 *
 * Instead of scanning the DOM every 100ms with querySelectorAll, we use a
 * MutationObserver that is notified by the browser ONLY when new nodes
 * are inserted or removed. This completely eliminates contention with
 * the Concurrent Rendering of React used by Instagram.
 *
 * Lifecycle:
 *   1. wayToInject()  → starts the observer + initial scan
 *   2. Node added     → scheduleInjection() with a 250ms delay
 *   3. Node removed   → cleanupVideo() cancels timers and unmounts the React root
 *   4. deleted()      → disconnects the observer and clears all pending timers
 */
export default class MutationInjector extends Injector {
  private observer: MutationObserver | null = null

  // Video map → pending injection timer
  private pendingTimers = new Map<
    HTMLVideoElement,
    ReturnType<typeof setTimeout>
  >()
  
  private isActive = false

  constructor(options?: InjectorOptions) {
    super(options)
  }

  /**
   * Schedules the injection of the Controller for a video.
   * - If the video already has a blob src: schedules a 250ms delay so that the
   *   native player finishes initializing.
   * - If no src yet: waits for the first `play` or `playing` event.
   */
  private scheduleInjection(video: HTMLVideoElement): void {
    if (this.isInjected(video)) return
    if (this.pendingTimers.has(video)) return
    if (video.hasAttribute("bigv-mutation-watching")) return

    const tryInject = () => {
      if (!this.isActive) return
      this.pendingTimers.delete(video)

      // Check if the element is still in the DOM before operating on it
      if (!document.contains(video)) return
      if (!video.src?.startsWith("blob:")) return

      this.inject(video, video.parentElement!)
    }

    if (video.src?.startsWith("blob:")) {
      // Delay: ensures the native player has finished its initialization
      const timer = setTimeout(tryInject, 250)
      this.pendingTimers.set(video, timer)
    } else {
      // No src yet: wait for the video to be ready
      video.setAttribute("bigv-mutation-watching", "")

      const onReady = () => {
        if (!video.src?.startsWith("blob:")) return
        video.removeEventListener("play", onReady)
        video.removeEventListener("playing", onReady)
        video.removeEventListener("timeupdate", onReady)
        video.removeAttribute("bigv-mutation-watching")
        
        if (!this.isActive) return
        const timer = setTimeout(tryInject, 250)
        this.pendingTimers.set(video, timer)
      }

      video.addEventListener("play", onReady)
      video.addEventListener("playing", onReady)
      video.addEventListener("timeupdate", onReady)
    }
  }

  /**
   * Cancels pending injections and unmounts the React root of a removed video.
   */
  private cleanupVideo(video: HTMLVideoElement): void {
    const timer = this.pendingTimers.get(video)
    if (timer !== undefined) {
      clearTimeout(timer)
      this.pendingTimers.delete(video)
    }
    this.removeByVideo(video)
  }

  /**
   * Extracts all <video> elements from an added/removed node,
   * without scanning the entire DOM.
   */
  private getVideosFromNode(node: Node): HTMLVideoElement[] {
    if (node.nodeType !== Node.ELEMENT_NODE) return []
    const el = node as Element
    if (el.tagName === "VIDEO") return [el as HTMLVideoElement]
    return Array.from(el.querySelectorAll<HTMLVideoElement>("video"))
  }

  public wayToInject(): void {
    // ABSOLUTE GUARD: Never inject on Reels
    if (location.pathname.startsWith("/reels")) {
      this.deleted()
      return
    }
    this.deleted() // ensures that any previous observer is disconnected
    this.isActive = true

    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        // New nodes added to the DOM
        for (const node of mutation.addedNodes) {
          for (const video of this.getVideosFromNode(node)) {
            this.scheduleInjection(video)
          }
        }

        // Nodes removed from the DOM (React Reels virtualization)
        for (const node of mutation.removedNodes) {
          for (const video of this.getVideosFromNode(node)) {
            this.cleanupVideo(video)
          }
        }
      }
    })

    // subtree: true — observes the whole body subtree, not just direct children
    this.observer.observe(document.body, { childList: true, subtree: true })

    // Initial scan for videos that were already in the DOM before the observer started
    document
      .querySelectorAll<HTMLVideoElement>("video")
      .forEach((video) => this.scheduleInjection(video))
  }

  public deleted(): void {
    this.isActive = false
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }
    // Cancels all pending injection timers
    for (const timer of this.pendingTimers.values()) {
      clearTimeout(timer)
    }
    this.pendingTimers.clear()
  }
}

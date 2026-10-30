import { observeFullscreenNavigation } from "./navigation"

// Pin the selected Feed video while Instagram reacts to the fullscreen reflow.
// Background autoplay must not steal the source, and exit never resumes it.
export function observeFullscreenAudio(doc: Document = document) {
  const stopNavigationGuard = observeFullscreenNavigation(doc)
  const saved = new Map<HTMLVideoElement, boolean>()
  let pinned: HTMLVideoElement | null = null
  let previousTarget: Element | null = null
  let resuming = false
  const release = () => {
    pinned?.removeAttribute("data-bigv-fullscreen-source")
    pinned?.removeAttribute("data-bigv-fullscreen-playing")
    pinned = null
    for (const [video, muted] of saved) {
      video.removeAttribute?.("data-bigv-fullscreen-blocked")
      video.muted = muted
    }
    saved.clear()
  }
  const sync = () => {
    const target = doc.fullscreenElement
    if (!target) {
      if (previousTarget) release()
      previousTarget = null
      return
    }
    previousTarget = target
    pinned =
      doc.querySelector?.<HTMLVideoElement>(
        '[data-bigv-fullscreen-source="true"]'
      ) ?? null
    if (pinned && !target.contains(pinned)) {
      release()
      pinned = null
    }
    for (const [video, muted] of saved) {
      if (
        (pinned ? video === pinned : target.contains(video)) ||
        !video.isConnected
      ) {
        saved.delete(video)
        video.removeAttribute?.("data-bigv-fullscreen-blocked")
        video.muted = muted
      }
    }
    for (const video of doc.querySelectorAll("video")) {
      if (pinned ? video === pinned : target.contains(video)) continue
      if (!saved.has(video)) saved.set(video, video.muted)
      video.setAttribute?.("data-bigv-fullscreen-blocked", "true")
      if (!video.muted) video.muted = true
      if (!video.paused) video.pause?.()
    }
    if (
      pinned?.paused &&
      !pinned.ended &&
      pinned.getAttribute("data-bigv-fullscreen-playing") === "true" &&
      !resuming
    ) {
      resuming = true
      void pinned
        .play()
        .catch(() => {})
        .finally(() => {
          resuming = false
        })
    }
  }
  const markNativeClick = (event: MouseEvent) => {
    if (!pinned || !(event.target instanceof Element)) return
    const control = event.target.closest(
      'button, input, [role="button"], [role="slider"], .bigv-control'
    )
    if (control && !control.contains(pinned)) return
    if (event.target === pinned || pinned.parentElement?.contains(event.target))
      pinned.setAttribute("data-bigv-fullscreen-playing", String(pinned.paused))
  }
  doc.addEventListener("fullscreenchange", sync)
  doc.addEventListener("play", sync, true)
  doc.addEventListener("pause", sync, true)
  doc.addEventListener("volumechange", sync, true)
  doc.addEventListener("click", markNativeClick, true)
  return () => {
    stopNavigationGuard()
    doc.removeEventListener("fullscreenchange", sync)
    doc.removeEventListener("play", sync, true)
    doc.removeEventListener("pause", sync, true)
    doc.removeEventListener("volumechange", sync, true)
    doc.removeEventListener("click", markNativeClick, true)
    release()
  }
}

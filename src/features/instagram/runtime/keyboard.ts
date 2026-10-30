import { getPageMode } from "@/features/instagram/runtime/page-mode"
import { observePlayerKeyboard } from "@/utils/playback/keyboard"
import {
  getActiveStoryMedia,
  isStoryImage
} from "@/features/instagram/media/stories"
import {
  getActiveInstagramVideo,
  isVideoInViewport
} from "@/features/instagram/media/video"
import { getVideoContainer } from "@/utils/media/container"

export function observeInstagramKeyboard(doc: Document = document) {
  let selected: HTMLVideoElement | null = null
  let pointer: { x: number; y: number } | null = null
  const videos = () =>
    [...doc.querySelectorAll<HTMLVideoElement>("video[bigv-injected]")].filter(
      (video) => {
        const style = getComputedStyle(video)
        return (
          video.isConnected &&
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          isVideoInViewport(video)
        )
      }
    )
  const videoAt = (target: Element | null, available: HTMLVideoElement[]) => {
    const direct = target?.closest("video")
    if (direct && available.includes(direct)) return direct
    return getActiveInstagramVideo(
      available.filter(
        (video) => target && getVideoContainer(video)?.contains(target)
      )
    )
  }
  const select = (event: Event) => {
    const target = event.target as Element | null
    selected = videoAt(target, videos())
  }
  const move = (event: PointerEvent) => {
    pointer = { x: event.clientX, y: event.clientY }
  }
  const leave = () => {
    pointer = null
  }
  const stop = observePlayerKeyboard(
    doc,
    () => {
      const available = videos()
      const mode = getPageMode(location.pathname)
      let video: HTMLVideoElement | null = null
      if (doc.fullscreenElement) {
        const pinned = doc.querySelector<HTMLVideoElement>(
          '[data-bigv-fullscreen-source="true"]'
        )
        video =
          pinned && available.includes(pinned)
            ? pinned
            : getActiveInstagramVideo(
                available.filter((video) =>
                  doc.fullscreenElement?.contains(video)
                )
              )
      } else if (mode === "stories") {
        const media = getActiveStoryMedia(doc)
        video =
          media && !isStoryImage(media) && available.includes(media)
            ? media
            : null
      } else if (mode === "reels") video = getActiveInstagramVideo(available)
      else {
        const target = pointer && doc.elementFromPoint(pointer.x, pointer.y)
        video =
          videoAt(target, available) ??
          (selected && available.includes(selected) ? selected : null)
      }
      if (!video) return null
      // A comments/settings dialog keeps its keyboard interaction, including
      // when focus temporarily lands on the body or the dialog backdrop.
      const blocked = [
        ...doc.querySelectorAll<HTMLElement>(
          '[role="dialog"], [aria-modal="true"], [role="menu"]'
        )
      ].some(
        (dialog) =>
          dialog.getClientRects().length > 0 && !dialog.contains(video)
      )
      return blocked ? null : video
    },
    {
      volumeArrows: () => getPageMode(location.pathname) === "global",
      spaceToggle: () => getPageMode(location.pathname) !== "reels"
    }
  )
  doc.addEventListener("pointerdown", select, true)
  doc.addEventListener("focusin", select, true)
  doc.addEventListener("pointermove", move, true)
  doc.documentElement.addEventListener("pointerleave", leave)
  return () => {
    stop()
    doc.removeEventListener("pointerdown", select, true)
    doc.removeEventListener("focusin", select, true)
    doc.removeEventListener("pointermove", move, true)
    doc.documentElement.removeEventListener("pointerleave", leave)
  }
}

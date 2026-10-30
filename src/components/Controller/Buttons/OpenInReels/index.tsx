import { useEffect, useState } from "react"

import { triggerNativeReels } from "@/utils/playback/click-mode"
import { t } from "@/utils/i18n"
import { getNativeReelAnchor } from "@/features/instagram/navigation/reel-link"

export default function OpenInReels({ video }: { video: HTMLVideoElement }) {
  const getAnchor = () =>
    video.ownerDocument.fullscreenElement?.contains(video)
      ? null
      : getNativeReelAnchor(video)
  const [anchor, setAnchor] = useState(getAnchor)
  useEffect(() => {
    const sync = () =>
      setAnchor(
        video.ownerDocument.fullscreenElement?.contains(video)
          ? null
          : getNativeReelAnchor(video)
      )
    sync()
    // Instagram can add/remove a target or recycle this video's post in place.
    const observer = new MutationObserver(sync)
    const root = video.closest("article") ?? video.parentElement?.parentElement
    if (root)
      observer.observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["href"]
      })
    video.addEventListener("loadstart", sync)
    video.ownerDocument.addEventListener("fullscreenchange", sync)
    return () => {
      observer.disconnect()
      video.removeEventListener("loadstart", sync)
      video.ownerDocument.removeEventListener("fullscreenchange", sync)
    }
  }, [video])
  if (!anchor) return null
  return (
    <button
      type="button"
      className="bigv-open-reel-button bigv-control"
      aria-label={t("openReelLabel")}
      title={t("openReelLabel")}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        const current = getNativeReelAnchor(video)
        if (current) triggerNativeReels(video, current)
      }}>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="3" />
        <path d="m10 9 5 3-5 3ZM3 8h18M7 4l3 4m4-4 3 4" />
      </svg>
    </button>
  )
}

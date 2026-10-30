import { useEffect, useState } from "react"
import { setVideoPlaying } from "@/utils/fullscreen/playback"
import { t } from "@/utils/i18n"

export function PlaybackIcon({ paused }: { paused: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d={paused ? "M8 5v14l11-7z" : "M7 5h4v14H7zm6 0h4v14h-4z"} />
    </svg>
  )
}

export default function PlayPause({ video }: { video: HTMLVideoElement }) {
  const [paused, setPaused] = useState(video.paused)
  useEffect(() => {
    const sync = () => setPaused(video.paused)
    const events = ["play", "pause", "ended", "emptied"]
    events.forEach((event) => video.addEventListener(event, sync))
    sync()
    return () =>
      events.forEach((event) => video.removeEventListener(event, sync))
  }, [video])
  return (
    <button
      type="button"
      className="bigv-story-play bigv-control"
      aria-label={t(paused ? "playLabel" : "pauseLabel")}
      title={t(paused ? "playLabel" : "pauseLabel")}
      onClick={() => void setVideoPlaying(video, video.paused)}>
      <PlaybackIcon paused={paused} />
    </button>
  )
}

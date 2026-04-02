import "./style.css"

import cn from "classnames"
import { useCallback, useEffect, useRef, useState } from "react"
import { useLocalStorage } from "usehooks-ts"

import { useStorage } from "@plasmohq/storage/hook"

import type { DownloadableMedia, Variant } from "~modules/Injector"
import { IG_REELS_SNAP } from "~utils/constants"

// import DownloadButton from "./Buttons/Download"
import VolumeButton from "./Buttons/Volume"
import PlaybackSpeed from "./Buttons/PlaybackSpeed"
import ProgressBarHorizontal from "./ProgressBarHorizontal"
import ProgressBarVertical from "./ProgressBarVertical"
import SmartContainer from "./SmartContainer"

type Props = {
  id: string
  downloadableMedia?: DownloadableMedia
  video: HTMLVideoElement
  variant?: Variant
}

export function Volume({ variant }: { variant?: Variant }) {
  const [volume, setVolume] = useLocalStorage(
    "better-instagram-videos-volume",
    0.5
  )
  const [muted, setMuted] = useLocalStorage(
    "better-instagram-videos-muted",
    false
  )

  const [volumeDragging, setVolumeDragging] = useState(false)
  const [maxVolumeBalance] = useStorage("bigv-max-volume-balance", 100)

  return (
    <SmartContainer dragging={volumeDragging} variant={variant}>
      <VolumeButton muted={muted} onChange={(_) => setMuted(_)} />
      <ProgressBarVertical
        progress={volume * maxVolumeBalance}
        onProgress={(_) => {
          const ps = _ / maxVolumeBalance
          setVolume(ps)
        }}
        onDragging={(_) => {
          setVolumeDragging(_)
          if (!_) setVolume(volume)
        }}
      />
      <PlaybackSpeed />
    </SmartContainer>
  )
}

export default function Controller({
  id,
  video,
  downloadableMedia,
  variant
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(video)
  const [progress, setProgress] = useState(0)
  const [dragging, setDragging] = useState(false)

  const [volume] = useLocalStorage("better-instagram-videos-volume", 0.5)
  const [muted, setMuted] = useLocalStorage(
    "better-instagram-videos-muted",
    false
  )
  const [playbackSpeed] = useStorage("bigv-playback-speed", 1)
  const [pauseOnComments] = useStorage("bigv-pause-on-comments", true)

  // Ref espelho removido: como usamos o patch.ts global, as referências stale
  // não afetam mais a interface, uma vez que a velocidade é gerida pelo `postMessage`.

  const updateAudio = useCallback(() => {
    const el = videoRef.current
    if (!el || !document.contains(el)) return

    const normalizedVolume = Math.min(volume, 1)
    el.volume = normalizedVolume
    if ("userActivation" in navigator && !navigator.userActivation.hasBeenActive)
      setMuted(true)
    el.muted = muted
  }, [videoRef, volume, muted])

  const timeUpdate = useCallback(() => {
    const el = videoRef.current
    if (!el || !document.contains(el)) return
    setProgress((el.currentTime / el.duration) * 100)
  }, [videoRef])

  const ended = useCallback(() => {
    const el = videoRef.current
    if (!el || !document.contains(el)) return
    el.currentTime = 0
    el.play()

    const autoSkip = localStorage.getItem("bigv-autoskip")
    if (
      autoSkip === "true" &&
      (pauseOnComments &&
        localStorage.getItem("bigv-comments-opened") !== "1") &&
      document.location.pathname.startsWith("/reels")
    ) {
      const snap = document.querySelector(IG_REELS_SNAP)
      if (snap) snap.scrollBy(0, 1000)
    }
  }, [videoRef, pauseOnComments])

  useEffect(() => {
    const el = videoRef.current
    if (!el) return

    const onPlay = () => {
      updateAudio()
    }
    
    // STEALTH MODE: Prevents Instagram from detecting buffered "lag" errors
    // caused by playing the video at 2x metadata speed
    const stopPropagation = (e: Event) => e.stopImmediatePropagation()

    el.addEventListener("play", onPlay)
    el.addEventListener("timeupdate", timeUpdate)
    el.addEventListener("ended", ended)
    el.addEventListener("volumechange", updateAudio)
    el.addEventListener("seeked", updateAudio)
    el.addEventListener("waiting", stopPropagation, true)
    el.addEventListener("stalled", stopPropagation, true)

    return () => {
      el.removeEventListener("play", onPlay)
      el.removeEventListener("timeupdate", timeUpdate)
      el.removeEventListener("ended", ended)
      el.removeEventListener("volumechange", updateAudio)
      el.removeEventListener("seeked", updateAudio)
      el.removeEventListener("waiting", stopPropagation, true)
      el.removeEventListener("stalled", stopPropagation, true)
    }
  }, [videoRef, timeUpdate, ended, updateAudio])

  useEffect(() => {
    updateAudio()
  }, [videoRef, volume, muted, updateAudio])

  // Notifies the MAIN world script (patch.ts) to natively sink the new speed value globally
  useEffect(() => {
    window.postMessage({ type: "BIGV_SPEED_CHANGE", speed: playbackSpeed ?? 1 }, "*")
  }, [playbackSpeed])

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (dragging) el.pause()
    else el.play().catch(() => {})
  }, [videoRef, dragging])

  return (
    <>
      {variant !== "stories" && <Volume />}
      {/* {variant === "default" && downloadableMedia && (
        <DownloadButton data={downloadableMedia} label={false} inside />
      )} */}
      <div className={cn("better-ig-controller", variant)}>
        {video && (
          <ProgressBarHorizontal
            variant={variant}
            progress={progress}
            videoDuration={videoRef.current.duration}
            onProgress={(progress) => {
              videoRef.current.currentTime =
                (progress / 100) * videoRef.current.duration
            }}
            onDragging={setDragging}
          />
        )}
      </div>
    </>
  )
}

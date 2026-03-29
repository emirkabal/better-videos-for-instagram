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

  // Mirror ref: always contains the current playbackSpeed value without creating
  // stale closures in native DOM event listeners.
  const playbackSpeedRef = useRef(playbackSpeed)
  useEffect(() => {
    playbackSpeedRef.current = playbackSpeed
  }, [playbackSpeed])

  // Strategy 1: IntersectionObserver — only applies speed when the video
  // is visible on screen. Prevents conflicts with Instagram's list virtualization.
  const isVisibleRef = useRef(false)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting
      },
      { threshold: 0.5 } // at least 50% visible
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [videoRef])

  const updateAudio = useCallback(() => {
    const el = videoRef.current
    // Strategy 2: checks if the element is still in the DOM before manipulating
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

    // Guard flag: prevents feedback loop
    // ratechange → applySpeed → sets playbackRate → ratechange → ...
    let isApplying = false

    const applySpeed = () => {
      // Strategy 1: only operates on the visible video
      if (!isVisibleRef.current) return
      // Strategy 2: checks DOM presence
      if (!document.contains(el)) return
      if (isApplying) return

      const desired = playbackSpeedRef.current
      if (typeof desired !== "number" || Math.abs(el.playbackRate - desired) <= 0.01) return

      try {
        isApplying = true
        el.playbackRate = desired
      } catch (_) {
        // Native player might silently reject the change
      } finally {
        isApplying = false
      }
    }

    const onPlay = () => {
      updateAudio()
      // Strategy 3: 150ms delay ensures that the native player has finished
      // its initialization before we try to change the speed.
      setTimeout(applySpeed, 150)
    }

    el.addEventListener("play", onPlay)
    el.addEventListener("playing", applySpeed)
    el.addEventListener("ratechange", applySpeed)
    el.addEventListener("timeupdate", timeUpdate)
    el.addEventListener("ended", ended)
    el.addEventListener("volumechange", updateAudio)
    el.addEventListener("seeked", updateAudio)

    // Strategy 3: delay also on initial application
    const initialTimer = setTimeout(applySpeed, 150)

    return () => {
      clearTimeout(initialTimer)
      el.removeEventListener("play", onPlay)
      el.removeEventListener("playing", applySpeed)
      el.removeEventListener("ratechange", applySpeed)
      el.removeEventListener("timeupdate", timeUpdate)
      el.removeEventListener("ended", ended)
      el.removeEventListener("volumechange", updateAudio)
      el.removeEventListener("seeked", updateAudio)
    }
  }, [videoRef, timeUpdate, ended, updateAudio])

  useEffect(() => {
    updateAudio()
  }, [videoRef, volume, muted, updateAudio])

  // When the user changes the speed in the menu, apply with a delay so it doesn't
  // interfere with ongoing buffering operations
  useEffect(() => {
    const el = videoRef.current
    if (!el || !document.contains(el)) return
    const timer = setTimeout(() => {
      if (document.contains(el)) {
        try {
          el.playbackRate = playbackSpeed ?? 1
        } catch (_) {}
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [videoRef, playbackSpeed])

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

import "./style.css"

import cn from "classnames"
import { useCallback, useEffect, useId, useRef, useState } from "react"
import { useLocalStorage } from "usehooks-ts"

import { useStorage } from "@plasmohq/storage/hook"

import type { DownloadableMedia, Variant } from "~modules/Injector"
import { IG_REELS_SNAP } from "~utils/constants"

// import DownloadButton from "./Buttons/Download"
import VolumeButton from "./Buttons/Volume"
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
  const wasPlayingBeforeDragRef = useRef(false)
  const [progress, setProgress] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [duration, setDuration] = useState(
    Number.isFinite(video.duration) ? video.duration : 0
  )

  const [volume] = useLocalStorage("better-instagram-videos-volume", 0.5)
  const [muted, setMuted] = useLocalStorage(
    "better-instagram-videos-muted",
    false
  )
  const [playbackSpeed] = useLocalStorage("bigv-playback-speed", 1)
  const [pauseOnComments] = useStorage("bigv-pause-on-comments", true)

  const getVideoVisibilityScore = useCallback((video: HTMLVideoElement) => {
    const rect = video.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return 0

    const visibleWidth =
      Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0)
    const visibleHeight =
      Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0)

    if (visibleWidth <= 0 || visibleHeight <= 0) return 0

    const visibleRatio =
      (visibleWidth * visibleHeight) / (rect.width * rect.height)
    const videoCenter = rect.top + rect.height / 2
    const viewportCenter = window.innerHeight / 2
    const centerPenalty =
      Math.abs(videoCenter - viewportCenter) / Math.max(window.innerHeight, 1)

    return visibleRatio - centerPenalty
  }, [])

  const isActiveAudibleVideo = useCallback(() => {
    if (variant === "stories") return true

    const videos = Array.from(
      document.querySelectorAll<HTMLVideoElement>("video")
    ).filter((video) => video.src.startsWith("blob:"))

    if (videos.length <= 1) return true

    const activeVideo = videos.reduce<HTMLVideoElement | null>(
      (activeVideo, video) => {
        if (!activeVideo) return video

        return getVideoVisibilityScore(video) >
          getVideoVisibilityScore(activeVideo)
          ? video
          : activeVideo
      },
      null
    )

    return activeVideo === videoRef.current
  }, [getVideoVisibilityScore, variant])

  // ig reels start
  // play, playing, seeking, waiting, volumechange, progress/timeupdate, seeked, canplay, playing, canplaythrough

  const updateAudio = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    if (!isActiveAudibleVideo()) {
      video.volume = 0
      video.muted = true
      return
    }

    const normalizedVolume = Math.min(volume, 1)
    video.volume = normalizedVolume

    if (
      "userActivation" in navigator &&
      !navigator.userActivation.hasBeenActive
    ) {
      console.warn(
        "User has not interacted with the page yet. Muting video to allow autoplay."
      )
      video.muted = true
      setMuted(true)
      return
    }

    video.muted = muted
  }, [videoRef, volume, muted, isActiveAudibleVideo])

  const timeUpdate = useCallback(() => {
    if (
      !Number.isFinite(videoRef.current.duration) ||
      videoRef.current.duration <= 0
    ) {
      setProgress(0)
      return
    }

    setProgress(
      (videoRef.current.currentTime / videoRef.current.duration) * 100
    )
  }, [videoRef])

  const metadataLoaded = useCallback(() => {
    const duration = videoRef.current.duration
    setDuration(Number.isFinite(duration) ? duration : 0)
    timeUpdate()
  }, [videoRef, timeUpdate])

  const play = useCallback(() => {
    updateAudio()
    videoRef.current.playbackRate = playbackSpeed
  }, [updateAudio, playbackSpeed])

  const ended = useCallback(() => {
    const autoSkip = localStorage.getItem("bigv-autoskip")
    if (
      autoSkip === "true" &&
      pauseOnComments &&
      localStorage.getItem("bigv-comments-opened") !== "1" &&
      document.location.pathname.startsWith("/reels")
    ) {
      const snap = document.querySelector(IG_REELS_SNAP)
      if (snap) snap.scrollBy(0, 1000)
    }
  }, [videoRef])

  useEffect(() => {
    videoRef.current.addEventListener("timeupdate", timeUpdate)
    videoRef.current.addEventListener("loadedmetadata", metadataLoaded)
    videoRef.current.addEventListener("durationchange", metadataLoaded)
    videoRef.current.addEventListener("play", play)
    videoRef.current.addEventListener("ended", ended)
    videoRef.current.addEventListener("volumechange", updateAudio)
    videoRef.current.addEventListener("seeked", updateAudio)
    return () => {
      videoRef.current.removeEventListener("timeupdate", timeUpdate)
      videoRef.current.removeEventListener("loadedmetadata", metadataLoaded)
      videoRef.current.removeEventListener("durationchange", metadataLoaded)
      videoRef.current.removeEventListener("play", play)
      videoRef.current.removeEventListener("ended", ended)
      videoRef.current.removeEventListener("volumechange", updateAudio)
      videoRef.current.removeEventListener("seeked", updateAudio)
    }
  }, [videoRef, timeUpdate, metadataLoaded, play, ended, updateAudio])

  useEffect(() => {
    updateAudio()
  }, [videoRef, volume, muted])

  useEffect(() => {
    videoRef.current.playbackRate = playbackSpeed
  }, [videoRef, playbackSpeed])

  useEffect(() => {
    if (dragging) {
      wasPlayingBeforeDragRef.current = !videoRef.current.paused
      videoRef.current.pause()
      return
    }

    if (wasPlayingBeforeDragRef.current) {
      wasPlayingBeforeDragRef.current = false
      videoRef.current.play().catch(() => {})
    }
  }, [dragging])

  return (
    <>
      {variant !== "stories" && <Volume variant={variant} />}
      {/* {variant === "default" && downloadableMedia && (
        <DownloadButton data={downloadableMedia} label={false} inside />
      )} */}
      <div className={cn("better-ig-controller", variant)}>
        <ProgressBarHorizontal
          variant={variant}
          progress={progress}
          videoDuration={duration}
          onProgress={(progress) => {
            if (!Number.isFinite(duration) || duration <= 0) return

            videoRef.current.currentTime = (progress / 100) * duration
          }}
          onDragging={setDragging}
        />
      </div>
    </>
  )
}

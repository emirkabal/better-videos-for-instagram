import "./style.css"

import cn from "classnames"
import { useCallback, useEffect, useRef, useState } from "react"
import { useLocalStorage } from "usehooks-ts"

import { useStorage } from "@plasmohq/storage/hook"

import { Variant, type DownloadableMedia } from "~modules/Injector"
import { IG_REELS_SNAP } from "~utils/constants"
import { getActiveInstagramVideo, isInstagramVideo } from "~utils/video"

// import DownloadButton from "./Buttons/Download"
import FullscreenButton from "./Buttons/Fullscreen"
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
  const safeBalance = Number.isFinite(maxVolumeBalance)
    ? Math.max(maxVolumeBalance, 100)
    : 100
  const maximumVolume = 100 / safeBalance

  useEffect(() => {
    if (volume > maximumVolume) setVolume(maximumVolume)
  }, [maximumVolume, setVolume, volume])

  return (
    <SmartContainer dragging={volumeDragging} variant={variant}>
      <VolumeButton muted={muted} onChange={setMuted} />
      <ProgressBarVertical
        progress={Math.min(volume * safeBalance, 100)}
        onProgress={(progress) => {
          setVolume(progress / safeBalance)
        }}
        onDragging={setVolumeDragging}
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
  const [muted] = useLocalStorage("better-instagram-videos-muted", false)
  const [playbackSpeed] = useLocalStorage("bigv-playback-speed", 1)
  const [pauseOnComments] = useStorage("bigv-pause-on-comments", true)

  const isActiveAudibleVideo = useCallback(() => {
    if (variant === Variant.Stories || variant === Variant.Default) return true

    const videos = Array.from(
      document.querySelectorAll<HTMLVideoElement>("video")
    ).filter(isInstagramVideo)

    if (videos.length <= 1) return true

    return getActiveInstagramVideo() === videoRef.current
  }, [variant])

  const updateAudio = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    if (!isActiveAudibleVideo()) {
      video.volume = 0
      video.muted = true
      return
    }

    const normalizedVolume = Math.min(Math.max(volume, 0), 1)
    video.volume = normalizedVolume

    if (
      "userActivation" in navigator &&
      !navigator.userActivation.hasBeenActive
    ) {
      video.muted = true
      return
    }

    video.muted = muted
  }, [volume, muted, isActiveAudibleVideo])

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
  }, [])

  const metadataLoaded = useCallback(() => {
    const duration = videoRef.current.duration
    setDuration(Number.isFinite(duration) ? duration : 0)
    timeUpdate()
  }, [timeUpdate])

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
      if (snap) {
        if (
          document.fullscreenElement?.classList.contains(
            "bigv-reels-fullscreen-target"
          )
        ) {
          snap.scrollBy({ top: snap.clientHeight, behavior: "smooth" })
        } else {
          snap.scrollBy(0, 1000)
        }
      }
    }
  }, [pauseOnComments])

  useEffect(() => {
    const videoElement = videoRef.current

    videoElement.addEventListener("timeupdate", timeUpdate)
    videoElement.addEventListener("loadedmetadata", metadataLoaded)
    videoElement.addEventListener("durationchange", metadataLoaded)
    videoElement.addEventListener("play", play)
    videoElement.addEventListener("ended", ended)
    videoElement.addEventListener("volumechange", updateAudio)
    videoElement.addEventListener("seeked", updateAudio)

    return () => {
      videoElement.removeEventListener("timeupdate", timeUpdate)
      videoElement.removeEventListener("loadedmetadata", metadataLoaded)
      videoElement.removeEventListener("durationchange", metadataLoaded)
      videoElement.removeEventListener("play", play)
      videoElement.removeEventListener("ended", ended)
      videoElement.removeEventListener("volumechange", updateAudio)
      videoElement.removeEventListener("seeked", updateAudio)
    }
  }, [timeUpdate, metadataLoaded, play, ended, updateAudio])

  useEffect(() => {
    updateAudio()
  }, [updateAudio])

  useEffect(() => {
    if ("userActivation" in navigator && navigator.userActivation.hasBeenActive)
      return

    const removeActivationListeners = () => {
      document.removeEventListener("pointerdown", handleFirstActivation, true)
      document.removeEventListener("keydown", handleFirstActivation, true)
    }

    const handleFirstActivation = () => {
      updateAudio()
      removeActivationListeners()
    }

    document.addEventListener("pointerdown", handleFirstActivation, {
      capture: true
    })
    document.addEventListener("keydown", handleFirstActivation, {
      capture: true
    })

    return removeActivationListeners
  }, [updateAudio])

  useEffect(() => {
    videoRef.current.playbackRate = playbackSpeed
  }, [playbackSpeed])

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
      {variant !== Variant.Stories && (
        <>
          <Volume variant={variant} />
          {variant !== Variant.Reels && (
            <FullscreenButton controllerId={id} variant={variant} />
          )}
        </>
      )}
      {/* {variant === "default" && downloadableMedia && (
        <DownloadButton data={downloadableMedia} label={false} inside />
      )} */}
      <div className={cn("better-ig-controller", variant)}>
        {video && (
          <ProgressBarHorizontal
            video={video}
            variant={variant}
            progress={progress}
            videoDuration={duration}
            showVideoPreview={variant === Variant.Reels}
            onProgress={(progress) => {
              if (!Number.isFinite(duration) || duration <= 0) return

              videoRef.current.currentTime = (progress / 100) * duration
            }}
            onDragging={setDragging}
          />
        )}
      </div>
    </>
  )
}

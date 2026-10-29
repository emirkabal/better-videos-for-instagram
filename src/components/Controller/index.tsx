import "./style.css"

import cn from "classnames"
import { useCallback, useEffect, useRef, useState } from "react"
import { useLocalStorage } from "usehooks-ts"

import { useStorage } from "@plasmohq/storage/hook"

import { Variant, type DownloadableMedia } from "~modules/Injector"
import { IG_REELS_SNAP } from "~utils/constants"
import { pictureInPicture } from "~utils/picture-in-picture"
import { getActiveInstagramVideo } from "~utils/video"

// import DownloadButton from "./Buttons/Download"
import FullscreenButton from "./Buttons/Fullscreen"
import PictureInPictureButton from "./Buttons/PictureInPicture"
import PlaybackSpeed from "./Buttons/PlaybackSpeed"
import PlayerControls from "./PlayerControls"
import ProgressBarHorizontal from "./ProgressBarHorizontal"
import Volume from "./Volume"

type Props = {
  id: string
  downloadableMedia?: DownloadableMedia
  video: HTMLVideoElement
  variant?: Variant
}

export { default as Volume } from "./Volume"

export default function Controller({
  id,
  video,
  downloadableMedia,
  variant = Variant.Default
}: Props) {
  const wasPlayingBeforeDragRef = useRef(false)
  const [progress, setProgress] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [duration, setDuration] = useState(
    Number.isFinite(video.duration) ? video.duration : 0
  )

  const [volume, setVolume] = useLocalStorage(
    "better-instagram-videos-volume",
    0.5
  )
  const [muted, setMuted] = useLocalStorage(
    "better-instagram-videos-muted",
    false
  )
  const [playbackSpeed] = useLocalStorage("bigv-playback-speed", 1)
  const safePlaybackSpeed = [0.25, 0.5, 1, 1.25, 1.5, 2].includes(playbackSpeed)
    ? playbackSpeed
    : 1
  const [pauseOnComments] = useStorage("bigv-pause-on-comments", true)

  const isActiveAudibleVideo = useCallback(() => {
    if (variant === Variant.Stories || variant === Variant.Default) return true

    return getActiveInstagramVideo() === video
  }, [variant, video])

  const updateAudio = useCallback(() => {
    if (!isActiveAudibleVideo()) {
      video.volume = 0
      video.muted = true
      return
    }

    const normalizedVolume = Number.isFinite(volume)
      ? Math.min(Math.max(volume, 0), 1)
      : 0.5
    video.volume = normalizedVolume

    if (
      "userActivation" in navigator &&
      !navigator.userActivation.hasBeenActive
    ) {
      video.muted = true
      return
    }

    video.muted = muted
  }, [video, volume, muted, isActiveAudibleVideo])

  const volumeChanged = useCallback(() => {
    if (variant !== Variant.Stories) {
      updateAudio()
      return
    }
    if (
      "userActivation" in navigator &&
      !navigator.userActivation.hasBeenActive
    )
      return
    // Keep Instagram's own Story controls usable alongside the fixed side dock.
    if (video.muted !== muted) setMuted(video.muted)
    if (video.volume !== volume) setVolume(video.volume)
  }, [video, variant, muted, volume, setMuted, setVolume, updateAudio])

  const timeUpdate = useCallback(() => {
    setDuration(
      Number.isFinite(video.duration) ? Math.max(video.duration, 0) : 0
    )
    if (!Number.isFinite(video.duration) || video.duration <= 0) {
      setProgress(0)
      return
    }

    setProgress((video.currentTime / video.duration) * 100)
  }, [video])

  const metadataLoaded = useCallback(() => {
    timeUpdate()
  }, [timeUpdate])

  const play = useCallback(() => {
    updateAudio()
    video.playbackRate = safePlaybackSpeed
  }, [video, updateAudio, safePlaybackSpeed])

  const ratechange = useCallback(() => {
    if (video.playbackRate !== safePlaybackSpeed) {
      video.playbackRate = safePlaybackSpeed
    }
  }, [video, safePlaybackSpeed])

  const ended = useCallback(() => {
    if (
      variant !== Variant.Reels ||
      !/^\/reels?(\/|$)/.test(location.pathname) ||
      getActiveInstagramVideo() !== video ||
      localStorage.getItem("bigv-autoskip") !== "true" ||
      (pauseOnComments && localStorage.getItem("bigv-comments-opened") === "1")
    )
      return

    if (pictureInPicture.advanceReel(video)) return
    const snap = document.querySelector<HTMLElement>(IG_REELS_SNAP)
    if (!snap) return

    const isFullscreen = document.fullscreenElement?.classList.contains(
      "bigv-reels-fullscreen-target"
    )

    snap.scrollBy(
      isFullscreen
        ? { top: snap.clientHeight, behavior: "smooth" }
        : { top: 1000 }
    )
  }, [pauseOnComments, variant, video])

  useEffect(() => {
    const videoElement = video
    metadataLoaded()

    videoElement.addEventListener("timeupdate", timeUpdate)
    // videoElement.addEventListener("loadedmetadata", metadataLoaded)
    // videoElement.addEventListener("durationchange", metadataLoaded)
    videoElement.addEventListener("play", play)
    videoElement.addEventListener("ended", ended)
    videoElement.addEventListener("volumechange", volumeChanged)
    // videoElement.addEventListener("seeked", updateAudio)
    videoElement.addEventListener("ratechange", ratechange)

    return () => {
      videoElement.removeEventListener("timeupdate", timeUpdate)
      // videoElement.removeEventListener("loadedmetadata", metadataLoaded)
      // videoElement.removeEventListener("durationchange", metadataLoaded)
      videoElement.removeEventListener("play", play)
      videoElement.removeEventListener("ended", ended)
      videoElement.removeEventListener("volumechange", volumeChanged)
      // videoElement.removeEventListener("seeked", updateAudio)
      videoElement.removeEventListener("ratechange", ratechange)
    }
  }, [
    video,
    timeUpdate,
    metadataLoaded,
    play,
    ended,
    volumeChanged,
    ratechange
  ])

  useEffect(() => {
    updateAudio()
  }, [updateAudio])

  useEffect(() => {
    if ("userActivation" in navigator && navigator.userActivation.hasBeenActive)
      return

    const removeActivationListeners = () => {
      document.removeEventListener("pointerdown", handleFirstActivation, true)
      document.removeEventListener("click", handleFirstActivation, true)
      document.removeEventListener("keydown", handleFirstActivation, true)
    }

    const handleFirstActivation = (event: Event) => {
      if (
        "userActivation" in navigator &&
        !navigator.userActivation.hasBeenActive
      )
        return
      // Let the mute button handle its own action. Automatically unmuting on
      // pointerdown would change its action to "mute" before the click arrives.
      if (
        !(
          event.target instanceof Element &&
          event.target.closest(".better-ig-volume-button")
        )
      ) {
        updateAudio()
      }
      removeActivationListeners()
    }

    document.addEventListener("pointerdown", handleFirstActivation, {
      capture: true
    })
    document.addEventListener("click", handleFirstActivation, { capture: true })
    document.addEventListener("keydown", handleFirstActivation, {
      capture: true
    })

    return removeActivationListeners
  }, [updateAudio])

  useEffect(() => {
    video.playbackRate = safePlaybackSpeed
  }, [video, safePlaybackSpeed])

  useEffect(() => {
    if (dragging) {
      wasPlayingBeforeDragRef.current = !video.paused
      video.pause()
      return
    }

    if (wasPlayingBeforeDragRef.current) {
      wasPlayingBeforeDragRef.current = false
      video.play().catch(() => {})
    }
  }, [dragging, video])

  return (
    <>
      {variant !== Variant.Stories && (
        <PlayerControls video={video} variant={variant}>
          <Volume video={video} variant={variant} placement="dock" />
          {variant === Variant.Default && (
            <>
              <PlaybackSpeed placement="dock" />
              <PictureInPictureButton video={video} />
              <FullscreenButton
                controllerId={id}
                variant={variant}
                placement="dock"
              />
            </>
          )}
        </PlayerControls>
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
            showVideoPreview={variant !== Variant.Stories}
            onProgress={(progress) => {
              const currentDuration = video.duration
              if (!Number.isFinite(currentDuration) || currentDuration <= 0)
                return

              video.currentTime =
                (Math.min(Math.max(progress, 0), 100) / 100) * currentDuration
              timeUpdate()
            }}
            onDragging={setDragging}
          />
        )}
      </div>
    </>
  )
}

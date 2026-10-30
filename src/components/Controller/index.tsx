import "./style.css"

import { cn } from "cn"
import { useCallback, useEffect, useRef, useState } from "react"
import { useLocalStorage } from "usehooks-ts"

import { useSetting } from "@/hooks/use-setting"
import { settings } from "@/utils/storage/settings"

import { Variant, type DownloadableMedia } from "@/features/player/Injector"
import { observeAutoSkip } from "@/utils/playback/auto-skip"
import type { ClickMode } from "@/utils/playback/click-mode"
import { setVideoPlaying } from "@/utils/fullscreen/playback"
import { pictureInPicture } from "@/utils/pip/controller"
import { navigateReel } from "@/features/instagram/navigation/reels"
import {
  hideNativeVideoAudio,
  observeNativeAudioIntent
} from "@/features/instagram/media/native-audio-controls"
import { setVideoAudioLimit, type VideoAudioIntent } from "@/utils/media/audio"
import {
  getActiveInstagramVideo,
  isVideoInViewport
} from "@/features/instagram/media/video"

import Autoskip from "./Buttons/Autoskip"
// import DownloadButton from "./Buttons/Download"
import FullscreenButton from "./Buttons/Fullscreen"
import OpenInReels from "./Buttons/OpenInReels"
import PictureInPictureButton from "./Buttons/PictureInPicture"
import PlaybackSpeed from "./Buttons/PlaybackSpeed"
import PlayerControls from "./PlayerControls"
import ProgressBarHorizontal from "./ProgressBarHorizontal"
import Volume from "./Volume"
import StoryControls from "./StoryControls"
import PlayerFeedback from "./PlayerFeedback"

type Props = {
  id: string
  downloadableMedia?: DownloadableMedia
  video: HTMLVideoElement
  variant?: Variant
  clickMode?: ClickMode
}

export { default as Volume } from "./Volume"

export default function Controller({
  id,
  video,
  downloadableMedia,
  variant = Variant.Default,
  clickMode = "pause"
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
  const [pauseOnComments] = useSetting(settings.pauseOnComments)
  const [maxVolumeBalance] = useSetting(settings.maxVolumeBalance)
  const volumeLimit =
    100 /
    (Number.isFinite(maxVolumeBalance) ? Math.max(maxVolumeBalance, 100) : 100)
  const [autoSkip] = useLocalStorage("bigv-autoskip", false)
  const expectedAudio = useRef<{ volume: number; muted: boolean } | null>(null)
  const nativeAudioIntent = useRef(false)
  useEffect(() => setVideoAudioLimit(video, volumeLimit), [video, volumeLimit])

  useEffect(() => {
    document.getElementById(id)?.setAttribute("data-bigv-ready", "")
  }, [id])

  const isActiveAudibleVideo = useCallback(() => {
    const fullscreen = document.fullscreenElement
    if (fullscreen && !fullscreen.contains(video)) return false
    if (variant === Variant.Stories || variant === Variant.Default) return true

    return getActiveInstagramVideo() === video
  }, [variant, video])

  const updateAudio = useCallback(() => {
    if (!isActiveAudibleVideo()) {
      expectedAudio.current = { volume: video.volume, muted: true }
      if (!video.muted) video.muted = true
      return
    }

    const normalizedVolume = Number.isFinite(volume)
      ? Math.min(Math.max(volume, 0), volumeLimit)
      : Math.min(0.5, volumeLimit)
    const nextMuted =
      "userActivation" in navigator && !navigator.userActivation.hasBeenActive
        ? true
        : muted
    expectedAudio.current = { volume: normalizedVolume, muted: nextMuted }
    if (video.volume !== normalizedVolume) video.volume = normalizedVolume
    if (video.muted !== nextMuted) video.muted = nextMuted
  }, [video, volume, muted, volumeLimit, isActiveAudibleVideo])

  useEffect(() => {
    document.addEventListener("fullscreenchange", updateAudio)
    video.addEventListener("bigv-activechange", updateAudio)
    return () => {
      document.removeEventListener("fullscreenchange", updateAudio)
      video.removeEventListener("bigv-activechange", updateAudio)
    }
  }, [updateAudio])

  const volumeChanged = useCallback(() => {
    if (nativeAudioIntent.current) return
    if (!isActiveAudibleVideo()) {
      updateAudio()
      return
    }
    if (
      expectedAudio.current?.volume === video.volume &&
      expectedAudio.current?.muted === video.muted
    )
      return
    if (
      "userActivation" in navigator &&
      !navigator.userActivation.hasBeenActive
    )
      return
    // Instagram mutes newly inserted/autoplay videos. Reapply the user's
    // saved choice without copying that temporary mute into shared storage.
    updateAudio()
  }, [
    video,
    muted,
    volume,
    setMuted,
    setVolume,
    updateAudio,
    isActiveAudibleVideo
  ])

  useEffect(() => {
    nativeAudioIntent.current = false
    const stop = observeNativeAudioIntent(
      video,
      () => {
        nativeAudioIntent.current = false
        if (!isActiveAudibleVideo()) return
        expectedAudio.current = { volume: video.volume, muted: video.muted }
        setMuted(video.muted)
        setVolume(video.volume)
      },
      () => {
        nativeAudioIntent.current = true
      }
    )
    return () => {
      stop()
      nativeAudioIntent.current = false
    }
  }, [video, isActiveAudibleVideo, setMuted, setVolume])

  useEffect(() => {
    const intent = (event: Event) => {
      const audio = (event as CustomEvent<VideoAudioIntent>).detail
      expectedAudio.current = audio
      if (audio.savePreference) {
        setVolume(audio.volume)
        setMuted(audio.muted)
      }
    }
    video.addEventListener("bigv-audio-intent", intent)
    return () => video.removeEventListener("bigv-audio-intent", intent)
  }, [video, setVolume, setMuted])

  useEffect(() => {
    if (variant === Variant.Reels || variant === Variant.Default)
      return hideNativeVideoAudio(video)
  }, [variant, video])

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

  useEffect(() => {
    if (variant !== Variant.Reels || !autoSkip) return
    let cancelNavigation: (() => void) | undefined
    const cleanup = observeAutoSkip(
      video,
      () =>
        !dragging &&
        /^\/reels?(\/|$)/.test(location.pathname) &&
        getActiveInstagramVideo() === video &&
        !(
          pauseOnComments &&
          Array.from(
            document.querySelectorAll<HTMLElement>('[role="dialog"]')
          ).some(
            (dialog) =>
              !dialog.contains(video) && dialog.getClientRects().length > 0
          )
        ),
      () => {
        cancelNavigation?.()
        if (pictureInPicture.advanceReel(video)) return
        cancelNavigation = navigateReel(video, 1, window, () => {
          if (getActiveInstagramVideo() !== video) cancelNavigation?.()
        })
      }
    )
    return () => {
      cleanup()
      cancelNavigation?.()
    }
  }, [autoSkip, pauseOnComments, variant, video, dragging])

  useEffect(() => {
    const videoElement = video
    metadataLoaded()

    videoElement.addEventListener("timeupdate", timeUpdate)
    videoElement.addEventListener("loadedmetadata", metadataLoaded)
    videoElement.addEventListener("durationchange", metadataLoaded)
    videoElement.addEventListener("play", play)
    videoElement.addEventListener("volumechange", volumeChanged)
    // videoElement.addEventListener("seeked", updateAudio)
    videoElement.addEventListener("ratechange", ratechange)

    return () => {
      videoElement.removeEventListener("timeupdate", timeUpdate)
      videoElement.removeEventListener("loadedmetadata", metadataLoaded)
      videoElement.removeEventListener("durationchange", metadataLoaded)
      videoElement.removeEventListener("play", play)
      videoElement.removeEventListener("volumechange", volumeChanged)
      // videoElement.removeEventListener("seeked", updateAudio)
      videoElement.removeEventListener("ratechange", ratechange)
    }
  }, [video, timeUpdate, metadataLoaded, play, volumeChanged, ratechange])

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
      if (!(
        event.target instanceof Element &&
        event.target.closest(".better-ig-volume-button")
      )) {
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
      void setVideoPlaying(video, false)
      return
    }

    if (wasPlayingBeforeDragRef.current) {
      wasPlayingBeforeDragRef.current = false
      if (isVideoInViewport(video)) void setVideoPlaying(video, true)
    }
  }, [dragging, video])

  const seek = (percent: number) => {
    if (!Number.isFinite(video.duration) || video.duration <= 0) return
    video.currentTime =
      (Math.min(Math.max(percent, 0), 100) / 100) * video.duration
    timeUpdate()
  }
  if (variant === Variant.Stories)
    return (
      <>
        <PlayerFeedback video={video} />
        <StoryControls
          video={video}
          controllerId={id}
          progress={progress}
          duration={duration}
          onProgress={seek}
          onDragging={setDragging}
        />
      </>
    )

  return (
    <>
      <PlayerFeedback video={video} />
      <PlayerControls video={video} variant={variant}>
        <Volume video={video} variant={variant} placement="dock" />
        <PlaybackSpeed placement="dock" />
        {variant === Variant.Default && clickMode === "pause-reels" && (
          <OpenInReels video={video} />
        )}
        {variant === Variant.Reels && <Autoskip placement="dock" />}
        <PictureInPictureButton
          video={video}
          followReels={variant === Variant.Reels}
        />
        <FullscreenButton
          video={video}
          controllerId={id}
          variant={variant}
          placement="dock"
        />
      </PlayerControls>
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
            onProgress={seek}
            onDragging={setDragging}
          />
        )}
      </div>
    </>
  )
}

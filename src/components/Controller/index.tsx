import "./style.css"

import cn from "classnames"
import { useCallback, useEffect, useId, useRef, useState } from "react"
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

  // Ref que espelha playbackSpeed para uso sem closure stale nos event listeners
  const playbackSpeedRef = useRef(playbackSpeed)
  useEffect(() => {
    playbackSpeedRef.current = playbackSpeed
  }, [playbackSpeed])

  // ig reels start
  // play, playing, seeking, waiting, volumechange, progress/timeupdate, seeked, canplay, playing, canplaythrough

  const updateAudio = useCallback(() => {
    const normalizedVolume = Math.min(volume, 1)
    videoRef.current.volume = normalizedVolume
    if (
      "userActivation" in navigator &&
      !navigator.userActivation.hasBeenActive
    )
      setMuted(true)
    videoRef.current.muted = muted
  }, [videoRef, volume, muted])

  const timeUpdate = useCallback(() => {
    setProgress(
      (videoRef.current.currentTime / videoRef.current.duration) * 100
    )
  }, [videoRef])

  const play = useCallback(() => {
    updateAudio()
    videoRef.current.playbackRate = playbackSpeed
  }, [updateAudio, playbackSpeed])

  const ended = useCallback(() => {
    videoRef.current.currentTime = 0
    videoRef.current.play()

    const autoSkip = localStorage.getItem("bigv-autoskip")
    if (
      autoSkip === "true" &&
      (pauseOnComments && localStorage.getItem("bigv-comments-opened") !== "1") &&
      document.location.pathname.startsWith("/reels")
    ) {
      const snap = document.querySelector(IG_REELS_SNAP)
      if (snap) snap.scrollBy(0, 1000)
    }
  }, [videoRef])

  // Único efeito para garantir que a velocidade seja respeitada contra interferência do Instagram
  useEffect(() => {
    const el = videoRef.current
    if (!el) return

    const applySpeed = () => {
      const desired = playbackSpeedRef.current
      if (typeof desired === "number" && Math.abs(el.playbackRate - desired) > 0.01) {
        // Tenta aplicar a velocidade. Alguns players de terceiros podem lançar erros ao mudar playbackRate.
        try {
          el.playbackRate = desired
        } catch (e) {
          console.error("Erro ao aplicar velocidade: ", e)
        }
      }
    }

    // Heartbeat: garante que a velocidade seja resetada mesmo que não tenhamos capturado um evento
    const interval = setInterval(applySpeed, 350)

    // Listeners em múltiplos eventos de controle do player
    el.addEventListener("play", applySpeed)
    el.addEventListener("playing", applySpeed)
    el.addEventListener("ratechange", applySpeed)
    el.addEventListener("timeupdate", timeUpdate)
    el.addEventListener("ended", ended)
    el.addEventListener("volumechange", updateAudio)
    el.addEventListener("seeked", updateAudio)

    applySpeed()

    return () => {
      clearInterval(interval)
      el.removeEventListener("play", applySpeed)
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

  useEffect(() => {
    if (dragging) videoRef.current.pause()
    else videoRef.current.play().catch(() => {})
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

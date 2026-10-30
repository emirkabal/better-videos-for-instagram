import volumeButtonCss from "../Buttons/Volume/style.css?inline"
import progressCss from "../ProgressBarHorizontal/style.css?inline"
import volumeSliderCss from "../ProgressBarVertical/style.css?inline"
import containerCss from "../SmartContainer/style.css?inline"
import controllerCss from "../style.css?inline"
import volumeCss from "../Volume/style.css?inline"
import pipCss from "./style.css?inline"
import feedbackCss from "../PlayerFeedback/style.css?inline"
import { useCallback, useEffect, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import { useLocalStorage } from "usehooks-ts"
import { useSetting } from "@/hooks/use-setting"
import { settings } from "@/utils/storage/settings"

import { t } from "@/utils/i18n"
import type {
  PipControlsActions,
  PipControlsRenderer
} from "@/utils/pip/controller"

import Autoskip from "../Buttons/Autoskip"
import PlaybackSpeed from "../Buttons/PlaybackSpeed"
import ProgressBarHorizontal from "../ProgressBarHorizontal"
import Volume from "../Volume"
import { useControlsVisibility } from "./use-controls-visibility"
import { PlaybackIcon } from "../Buttons/PlayPause"
import PlayerFeedback from "../PlayerFeedback"
import { observePlayerKeyboard } from "@/utils/playback/keyboard"
import { setUserAudio } from "@/utils/media/audio"

function formatTime(value: number) {
  const seconds = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
}

function PipControls({
  video,
  actions,
  ownerDocument
}: {
  video?: HTMLVideoElement
  actions: PipControlsActions
  ownerDocument: Document
}) {
  const [paused, setPaused] = useState(video?.paused ?? true)
  const [progress, setProgress] = useState(0)
  const [time, setTime] = useState({
    current: video?.currentTime ?? 0,
    duration: video?.duration ?? 0
  })
  const { panelRef, visible } = useControlsVisibility(video ?? null)
  // Feed source controls may be pruned while the floating player stays open.
  // PiP owns its preference writes and volume limit independently of that root.
  const [, setVolume] = useLocalStorage("better-instagram-videos-volume", 0.5)
  const [, setMuted] = useLocalStorage("better-instagram-videos-muted", false)
  const [balance] = useSetting(settings.maxVolumeBalance)
  const volumeLimit =
    100 / (Number.isFinite(balance) ? Math.max(balance, 100) : 100)
  useEffect(() => {
    return observePlayerKeyboard(ownerDocument, () => video ?? null, {
      setPlaying: (_video, playing) => actions.setPlaying(playing),
      volumeLimit,
      setAudio: (source, audio) => {
        setVolume(audio.volume)
        setMuted(audio.muted)
        setUserAudio(source, audio)
      },
      photoNavigation:
        !video && actions.followStories
          ? (direction) =>
              direction === 1 ? actions.next() : actions.previous()
          : undefined
    })
  }, [video, actions, ownerDocument, volumeLimit, setVolume, setMuted])
  const resumeAfterSeek = useRef(false)
  const onDragging = useCallback(
    (dragging: boolean) => {
      if (!video) return
      if (dragging) {
        resumeAfterSeek.current = !video.paused
        actions.setPlaying(false)
      } else if (resumeAfterSeek.current) {
        resumeAfterSeek.current = false
        actions.setPlaying(true)
      }
    },
    [actions, video]
  )

  useEffect(() => {
    if (!video) {
      setPaused(true)
      setTime({ current: 0, duration: 0 })
      setProgress(0)
      return
    }
    const sync = () => {
      setPaused(video.paused)
      setTime({ current: video.currentTime, duration: video.duration })
      setProgress(
        Number.isFinite(video.duration) && video.duration > 0
          ? (video.currentTime / video.duration) * 100
          : 0
      )
    }
    const events = [
      "play",
      "pause",
      "ended",
      "timeupdate",
      "loadedmetadata",
      "durationchange"
    ]
    events.forEach((event) => video.addEventListener(event, sync))
    sync()
    return () =>
      events.forEach((event) => video.removeEventListener(event, sync))
  }, [video])

  return (
    <>
      {video && <PlayerFeedback video={video} ownerDocument={ownerDocument} />}
      <div
        ref={panelRef}
        className={`bigv-pip-player bigv-pip-slider-theme ${visible ? "is-visible" : ""}`}>
        <div
          className="bigv-player-dock pip is-compact is-visible"
          role="toolbar"
          aria-label={t("pipLabel")}>
          <div className="bigv-pip-audio">
            {video && (
              <Volume video={video} placement="dock" orientation="horizontal" />
            )}
          </div>
          <div className="bigv-pip-transport">
            {(actions.followReels || actions.followStories) && (
              <button
                type="button"
                aria-label={t(
                  actions.followStories
                    ? "previousStoryLabel"
                    : "previousReelLabel"
                )}
                title={t(
                  actions.followStories
                    ? "previousStoryLabel"
                    : "previousReelLabel"
                )}
                onClick={actions.previous}>
                <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                  <path d="M18 5v14L8 12zM5 5h2v14H5z" />
                </svg>
              </button>
            )}
            {video && (
              <button
                type="button"
                className="bigv-pip-play"
                aria-label={t(paused ? "playLabel" : "pauseLabel")}
                title={t(paused ? "playLabel" : "pauseLabel")}
                onClick={() => actions.setPlaying(video.paused)}>
                <PlaybackIcon paused={paused} />
              </button>
            )}
            {(actions.followReels || actions.followStories) && (
              <button
                type="button"
                aria-label={t(
                  actions.followStories ? "nextStoryLabel" : "nextReelLabel"
                )}
                title={t(
                  actions.followStories ? "nextStoryLabel" : "nextReelLabel"
                )}
                onClick={actions.next}>
                <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                  <path d="M6 5v14l10-7zm11 0h2v14h-2z" />
                </svg>
              </button>
            )}
          </div>
          <div className="bigv-pip-options">
            {video && <PlaybackSpeed placement="dock" />}
            {actions.followReels && <Autoskip placement="dock" />}
            <button
              type="button"
              aria-label={t("exitPipLabel")}
              title={t("exitPipLabel")}
              onClick={actions.close}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                aria-hidden="true">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M14 14h4v3h-4zM7 8h5M7 8v5m0-5 5 5" />
              </svg>
            </button>
          </div>
        </div>
        {video && (
          <div className="bigv-pip-timeline">
            <span className="bigv-pip-time">{formatTime(time.current)}</span>
            <div className="better-ig-controller">
              <ProgressBarHorizontal
                video={video}
                progress={progress}
                showVideoPreview={false}
                onProgress={(percent) => {
                  if (Number.isFinite(video.duration) && video.duration > 0)
                    video.currentTime = (percent / 100) * video.duration
                }}
                onDragging={onDragging}
              />
            </div>
            <span className="bigv-pip-time">{formatTime(time.duration)}</span>
          </div>
        )}
      </div>
    </>
  )
}

export const renderPipControls: PipControlsRenderer = (host, actions) => {
  const style = host.ownerDocument.createElement("style")
  style.textContent = [
    controllerCss,
    volumeButtonCss,
    volumeSliderCss,
    progressCss,
    containerCss,
    pipCss,
    feedbackCss,
    volumeCss
  ].join("\n")
  host.ownerDocument.head.append(style)
  const root = createRoot(host)
  return {
    update(video) {
      root.render(
        <PipControls
          video={video}
          actions={actions}
          ownerDocument={host.ownerDocument}
        />
      )
    },
    updateImage() {
      root.render(
        <PipControls actions={actions} ownerDocument={host.ownerDocument} />
      )
    },
    destroy() {
      root.unmount()
      style.remove()
    }
  }
}

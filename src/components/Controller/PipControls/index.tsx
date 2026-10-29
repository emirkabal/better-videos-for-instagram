import volumeButtonCss from "data-text:../Buttons/Volume/style.css"
import progressCss from "data-text:../ProgressBarHorizontal/style.css"
import volumeSliderCss from "data-text:../ProgressBarVertical/style.css"
import containerCss from "data-text:../SmartContainer/style.css"
import controllerCss from "data-text:../style.css"
import volumeCss from "data-text:../Volume/style.css"
import pipCss from "data-text:./style.css"
import { useCallback, useEffect, useRef, useState } from "react"
import { createRoot } from "react-dom/client"

import { t } from "~utils/i18n"
import type {
  PipControlsActions,
  PipControlsRenderer
} from "~utils/picture-in-picture"

import Autoskip from "../Buttons/Autoskip"
import PlaybackSpeed from "../Buttons/PlaybackSpeed"
import ProgressBarHorizontal from "../ProgressBarHorizontal"
import Volume from "../Volume"
import { useControlsVisibility } from "./use-controls-visibility"

function formatTime(value: number) {
  const seconds = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
}

function PipControls({
  video,
  actions
}: {
  video: HTMLVideoElement
  actions: PipControlsActions
}) {
  const [paused, setPaused] = useState(video.paused)
  const [progress, setProgress] = useState(0)
  const [time, setTime] = useState({
    current: video.currentTime,
    duration: video.duration
  })
  const { panelRef, visible } = useControlsVisibility(video)
  const resumeAfterSeek = useRef(false)
  const onDragging = useCallback(
    (dragging: boolean) => {
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
    <div
      ref={panelRef}
      className={`bigv-pip-player bigv-pip-slider-theme ${visible ? "is-visible" : ""}`}>
      <div
        className="bigv-player-dock pip is-compact is-visible"
        role="toolbar"
        aria-label={t("pipLabel")}>
        <Volume video={video} placement="dock" orientation="horizontal" />
        <div className="bigv-pip-transport">
          {actions.followReels && (
            <button
              type="button"
              aria-label={t("previousReelLabel")}
              title={t("previousReelLabel")}
              onClick={actions.previous}>
              <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                <path d="M18 5v14L8 12zM5 5h2v14H5z" />
              </svg>
            </button>
          )}
          <button
            type="button"
            className="bigv-pip-play"
            aria-label={t(paused ? "playLabel" : "pauseLabel")}
            title={t(paused ? "playLabel" : "pauseLabel")}
            onClick={() => actions.setPlaying(video.paused)}>
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
              {paused ? (
                <path d="M8 5v14l11-7z" />
              ) : (
                <path d="M7 5h4v14H7zm6 0h4v14h-4z" />
              )}
            </svg>
          </button>
          {actions.followReels && (
            <button
              type="button"
              aria-label={t("nextReelLabel")}
              title={t("nextReelLabel")}
              onClick={actions.next}>
              <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                <path d="M6 5v14l10-7zm11 0h2v14h-2z" />
              </svg>
            </button>
          )}
        </div>
        <div className="bigv-pip-options">
          <PlaybackSpeed placement="dock" />
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
    </div>
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
    volumeCss
  ].join("\n")
  host.ownerDocument.head.append(style)
  const root = createRoot(host)
  return {
    update(video) {
      root.render(
        <PipControls
          key={video.dataset.instancekey ?? video.currentSrc}
          video={video}
          actions={actions}
        />
      )
    },
    destroy() {
      root.unmount()
      style.remove()
    }
  }
}

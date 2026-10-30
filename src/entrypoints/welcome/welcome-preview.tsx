import { useEffect, useRef, useState } from "react"
import demoVideo from "@/assets/welcome/flower.mp4?url"

import ProgressBarHorizontal from "@/components/Controller/ProgressBarHorizontal"
import VolumeControl from "@/components/Controller/Volume/Control"

import type { WelcomeCopy } from "./welcome-copy"

export type DemoMode = "feed" | "pip" | "seek" | "stories"

function Icon({
  name
}: {
  name: "play" | "pause" | "previous" | "next" | "pip" | "fullscreen"
}) {
  const paths = {
    play: <path d="m8 5 11 7-11 7Z" fill="currentColor" stroke="none" />,
    pause: (
      <path d="M6 5h4v14H6zm8 0h4v14h-4z" fill="currentColor" stroke="none" />
    ),
    previous: (
      <>
        <path d="m18 5-10 7 10 7Z" fill="currentColor" stroke="none" />
        <path d="M5 5v14" />
      </>
    ),
    next: (
      <>
        <path d="m6 5 10 7-10 7Z" fill="currentColor" stroke="none" />
        <path d="M19 5v14" />
      </>
    ),
    pip: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <rect
          x="12"
          y="12"
          width="7"
          height="5"
          rx=".5"
          fill="currentColor"
          stroke="none"
        />
      </>
    ),
    fullscreen: <path d="M9 3H3v6m12-6h6v6M3 15v6h6m6 0h6v-6" />
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

const formatTime = (value: number) =>
  `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`

function DemoFrame({ time }: { time: number }) {
  const frameRef = useRef<HTMLVideoElement>(null)
  const targetTime = useRef(time)
  targetTime.current = time
  const syncFrame = () => {
    const frame = frameRef.current
    if (
      frame &&
      frame.readyState >= 1 &&
      !frame.seeking &&
      Math.abs(frame.currentTime - targetTime.current) > 0.12
    ) {
      frame.currentTime = targetTime.current
    }
  }
  useEffect(syncFrame, [time])
  return (
    <div className="better-ig-progress-preview welcome-frame-preview">
      <video
        ref={frameRef}
        src={demoVideo}
        muted
        playsInline
        preload="auto"
        onLoadedMetadata={syncFrame}
        onSeeked={syncFrame}
      />
    </div>
  )
}

export default function WelcomePreview({
  copy,
  mode
}: {
  copy: WelcomeCopy
  mode: DemoMode
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerRef = useRef<HTMLDivElement>(null)
  const [video, setVideo] = useState<HTMLVideoElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)
  const [volume, setVolume] = useState(50)
  const [volumeDragging, setVolumeDragging] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [autoSkip, setAutoSkip] = useState(true)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState(false)

  useEffect(() => {
    const source = videoRef.current
    setVideo(source)
    const observer = new IntersectionObserver(([entry]) => {
      if (entry && !entry.isIntersecting) source?.pause()
    })
    if (playerRef.current) observer.observe(playerRef.current)
    const pauseWhenHidden = () => {
      if (document.hidden) source?.pause()
    }
    document.addEventListener("visibilitychange", pauseWhenHidden)
    return () => {
      observer.disconnect()
      document.removeEventListener("visibilitychange", pauseWhenHidden)
      source?.pause()
    }
  }, [])

  useEffect(() => {
    if (!video) return
    video.muted = muted
    video.volume = volume / 100
    video.playbackRate = speed
  }, [video, muted, volume, speed])

  useEffect(() => {
    setVolumeDragging(false)
  }, [mode])

  const togglePlayback = () => {
    if (!video || error) return
    if (video.paused) void video.play().catch(() => setPlaying(false))
    else video.pause()
  }
  const seek = (percent: number) => {
    if (video && duration > 0)
      video.currentTime = Math.min(
        duration,
        Math.max(0, (duration * percent) / 100)
      )
  }
  const changeClip = (direction: number) => {
    if (!video || !duration) return
    const part = Math.floor(video.currentTime / (duration / 3))
    video.currentTime = (((part + direction + 3) % 3) * duration) / 3
  }
  const timeline = (
    <div className="welcome-timeline">
      <span>{formatTime(time)}</span>
      <div className="welcome-timeline-track better-ig-controller">
        <ProgressBarHorizontal
          video={video}
          progress={duration > 0 ? (time / duration) * 100 : 0}
          showVideoPreview={false}
          renderPreview={
            mode === "seek" && duration > 0
              ? (percent) => (
                  <DemoFrame
                    time={Math.max(
                      0,
                      Math.min(duration - 0.05, (duration * percent) / 100)
                    )}
                  />
                )
              : undefined
          }
          onProgress={seek}
        />
      </div>
      <span>{formatTime(duration)}</span>
    </div>
  )
  return (
    <div
      className={`welcome-demo welcome-demo-${mode}${mode === "seek" ? " welcome-demo-feed" : ""}`}
      ref={playerRef}>
      <div
        className="welcome-player"
        data-playing={playing}
        data-volume-dragging={volumeDragging}
        role="group"
        aria-label={copy.demo}>
        <video
          className="welcome-video"
          ref={videoRef}
          src={demoVideo}
          muted
          autoPlay
          playsInline
          preload="auto"
          loop={autoSkip}
          onLoadedMetadata={(event) => {
            const source = event.currentTarget
            setDuration(Number.isFinite(source.duration) ? source.duration : 0)
            source.currentTime = Math.min(1, source.duration / 2)
          }}
          onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onError={() => setError(true)}
        />
        {error && (
          <p className="welcome-media-error" role="status">
            {copy.demoUnavailable}
          </p>
        )}
        <button
          type="button"
          className="welcome-video-hitarea"
          aria-label={playing ? copy.pause : copy.play}
          onClick={togglePlayback}>
          {!playing && !error && (
            <span className="welcome-center-play">
              <Icon name="play" />
            </span>
          )}
        </button>
        <div className="welcome-video-heading" aria-hidden="true">
          <span className="welcome-avatar" />
          <span>
            tiny.world<small>Original audio</small>
          </span>
        </div>
        <div className="welcome-story-progress" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>

        <div
          className={`welcome-controls${mode === "pip" ? " bigv-pip-slider-theme" : ""}`}>
          <div className="welcome-toolbar">
            <VolumeControl
              progress={volume}
              muted={muted || volume === 0}
              onMuted={setMuted}
              onProgress={(value) => {
                setVolume(value)
                setMuted(false)
              }}
              dragging={volumeDragging}
              onDragging={setVolumeDragging}
              placement="dock"
              orientation={mode === "pip" ? "horizontal" : "vertical"}
            />
            <div className="welcome-transport">
              <button
                type="button"
                aria-label={copy.previous}
                title={copy.previous}
                onClick={() => changeClip(-1)}>
                <Icon name="previous" />
              </button>
              <button
                type="button"
                aria-label={playing ? copy.pause : copy.play}
                onClick={togglePlayback}>
                <Icon name={playing ? "pause" : "play"} />
              </button>
              <button
                type="button"
                aria-label={copy.next}
                title={copy.next}
                onClick={() => changeClip(1)}>
                <Icon name="next" />
              </button>
            </div>
            <div className="welcome-player-options">
              <button
                type="button"
                className="welcome-speed"
                aria-label={`${copy.speed}: ${speed}×`}
                title={copy.speed}
                onClick={() => {
                  const speeds = [0.25, 0.5, 1, 1.25, 1.5, 2]
                  setSpeed(
                    speeds[(speeds.indexOf(speed) + 1) % speeds.length] ?? 1
                  )
                }}>
                {speed}×
              </button>
              <button
                type="button"
                className="welcome-autoskip"
                role="switch"
                aria-checked={autoSkip}
                aria-label={copy.autoSkip}
                title={copy.autoSkip}
                onClick={() => setAutoSkip(!autoSkip)}>
                <span />
              </button>
              <a
                className="welcome-pip-link"
                href="#pip"
                aria-label={copy.pip}
                title={copy.pip}>
                <Icon name="pip" />
              </a>
              <button
                type="button"
                className="welcome-fullscreen"
                aria-label={copy.fullscreen}
                title={copy.fullscreen}
                onClick={() => {
                  if (document.fullscreenElement)
                    void document.exitFullscreen().catch(() => {})
                  else
                    void playerRef.current
                      ?.querySelector<HTMLElement>(".welcome-player")
                      ?.requestFullscreen?.()
                      .catch(() => {})
                }}>
                <Icon name="fullscreen" />
              </button>
            </div>
          </div>
          {mode === "pip" && timeline}
        </div>
        {(mode === "feed" || mode === "seek") && timeline}
      </div>
      <p className="welcome-preview-hint" aria-hidden={mode !== "seek"}>
        {mode === "seek" ? copy.previewHint : "\u00a0"}
      </p>
    </div>
  )
}

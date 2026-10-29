import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent
} from "react"

import "./style.css"

import cn from "classnames"

import { useInstagramSpritesheet } from "~hooks/use-instagram-spritesheet"
import type { Variant } from "~modules/Injector"
import { t } from "~utils/i18n"
import {
  getPlaybackProgress,
  observePlaybackProgress
} from "~utils/playback-progress"

import InstagramSpritePreview from "./InstagramSpritePreview"

type Props = {
  progress?: number
  onProgress?: (progress: number) => void
  onDragging?: (dragging: boolean) => void
  videoDuration?: number
  variant?: Variant
  video?: HTMLVideoElement | null
  showVideoPreview?: boolean
  renderPreview?: (percent: number) => ReactNode
}

const clampProgress = (value: number) =>
  Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), 100)

export default function ProgressBarHorizontal({
  progress = 0,
  onProgress,
  onDragging,
  videoDuration = 0,
  variant,
  video,
  showVideoPreview = true,
  renderPreview
}: Props) {
  const [dragProgress, setDragProgress] = useState(0)
  const [isDragging, setDragging] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState(0)
  const [showTooltip, setShowTooltip] = useState(false)
  const [mousePosition, setMousePosition] = useState(0)
  const [previewRequested, setPreviewRequested] = useState(false)
  const [detectedDuration, setDetectedDuration] = useState(0)

  const dragareaRef = useRef<HTMLDivElement>(null)
  const fillRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<HTMLDivElement>(null)
  const progressBar = isDragging ? dragProgress : clampProgress(progress)

  const duration = video
    ? detectedDuration
    : videoDuration > 0 && Number.isFinite(videoDuration)
      ? videoDuration
      : 0

  const spritesheet = useInstagramSpritesheet(
    video,
    showVideoPreview && previewRequested
  )

  const formatTime = (seconds: number) => {
    const safeSeconds = Number.isFinite(seconds) ? Math.max(seconds, 0) : 0

    const minutes = Math.floor(safeSeconds / 60)
    const remainingSeconds = Math.floor(safeSeconds % 60)

    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const paintProgress = useCallback((value: number) => {
    const percent = clampProgress(value)
    if (fillRef.current)
      fillRef.current.style.transform = `scaleX(${percent / 100})`
    if (handleRef.current)
      handleRef.current.style.left = `clamp(4px, ${percent}%, calc(100% - 4px))`
  }, [])

  useEffect(() => {
    paintProgress(
      isDragging ? dragProgress : video ? getPlaybackProgress(video) : progress
    )
  }, [dragProgress, isDragging, paintProgress, progress, video])

  useEffect(() => {
    if (!video || isDragging) return
    return observePlaybackProgress(
      video,
      paintProgress,
      fillRef.current?.ownerDocument.defaultView ?? undefined
    )
  }, [isDragging, paintProgress, video])

  useEffect(() => {
    if (!video) {
      setDetectedDuration(0)
      return
    }

    const syncDuration = () => {
      setDetectedDuration(Number.isFinite(video.duration) ? video.duration : 0)
    }

    syncDuration()

    video.addEventListener("loadedmetadata", syncDuration)
    video.addEventListener("durationchange", syncDuration)
    video.addEventListener("emptied", syncDuration)

    return () => {
      video.removeEventListener("loadedmetadata", syncDuration)
      video.removeEventListener("durationchange", syncDuration)
      video.removeEventListener("emptied", syncDuration)
    }
  }, [video])

  useEffect(() => {
    setPreviewRequested(false)
    if (!video) return

    const resetPreviewRequest = () => setPreviewRequested(false)

    video.addEventListener("emptied", resetPreviewRequest)
    video.addEventListener("loadstart", resetPreviewRequest)

    return () => {
      video.removeEventListener("emptied", resetPreviewRequest)
      video.removeEventListener("loadstart", resetPreviewRequest)
    }
  }, [video])

  const updatePointer = useCallback(
    (clientX: number, updateProgress: boolean) => {
      const rect = dragareaRef.current?.getBoundingClientRect()

      if (!rect || rect.width <= 0) return

      const x = Math.min(Math.max(clientX - rect.left, 0), rect.width)

      const percent = Math.min(Math.max(x / rect.width, 0), 1)

      if (updateProgress) {
        const newProgress = Math.round(percent * 10000) / 100

        setDragProgress(newProgress)
        paintProgress(newProgress)
        onProgress?.(newProgress)
      }

      const isLandscapePreview = Boolean(
        video?.videoWidth &&
          video.videoHeight &&
          video.videoWidth > video.videoHeight
      )
      const tooltipWidth =
        spritesheet || renderPreview ? (isLandscapePreview ? 154 : 93) : 82
      const halfTooltipWidth = Math.min(tooltipWidth / 2, rect.width / 2)

      const clampedPosition = Math.min(
        Math.max(x, halfTooltipWidth),
        rect.width - halfTooltipWidth
      )

      setTooltipPosition(clampedPosition)
      setMousePosition(percent)
    },
    [onProgress, paintProgress, spritesheet, video, renderPreview]
  )

  useEffect(() => {
    onDragging?.(isDragging)
  }, [isDragging, onDragging])

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    setShowTooltip(true)
    if (showVideoPreview) setPreviewRequested(true)
    updatePointer(
      event.clientX,
      event.currentTarget.hasPointerCapture(event.pointerId)
    )
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !event.isPrimary || duration <= 0) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.dataset.bigvPointerFocus = "true"
    event.currentTarget.focus({ preventScroll: true })
    event.currentTarget.setPointerCapture(event.pointerId)

    setDragging(true)
    setShowTooltip(true)
    if (showVideoPreview) setPreviewRequested(true)
    updatePointer(event.clientX, true)
  }

  const stopDragging = () => {
    setDragging(false)
    setShowTooltip(false)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    delete event.currentTarget.dataset.bigvPointerFocus
    if (duration <= 0) return
    const step = (5 / duration) * 100
    const currentProgress = video ? getPlaybackProgress(video) : progressBar
    let nextProgress: number
    switch (event.key) {
      case "ArrowRight":
      case "ArrowUp":
        nextProgress = currentProgress + step
        break
      case "ArrowLeft":
      case "ArrowDown":
        nextProgress = currentProgress - step
        break
      case "Home":
        nextProgress = 0
        break
      case "End":
        nextProgress = 100
        break
      default:
        return
    }
    event.preventDefault()
    event.stopPropagation()
    onProgress?.(clampProgress(nextProgress))
  }

  const tooltipVisible = showTooltip || isDragging

  return (
    <div
      className="progress-bar-horizontal bigv-control"
      onClick={(event) => {
        event.stopPropagation()
      }}>
      <div
        className={cn("baseline", {
          dragging: isDragging
        })}>
        <div
          ref={dragareaRef}
          className="dragarea"
          role="slider"
          tabIndex={0}
          aria-label={t("videoProgressLabel")}
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={(progressBar / 100) * duration}
          aria-valuetext={`${formatTime((progressBar / 100) * duration)} / ${formatTime(duration)}`}
          aria-disabled={duration <= 0}
          onKeyDown={handleKeyDown}
          onBlur={(event) => {
            delete event.currentTarget.dataset.bigvPointerFocus
          }}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => {
            if (!isDragging) {
              setShowTooltip(false)
            }
          }}
          onPointerDown={handlePointerDown}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              updatePointer(event.clientX, true)
              event.currentTarget.releasePointerCapture(event.pointerId)
              stopDragging()
            }
          }}
          onPointerCancel={stopDragging}
          onLostPointerCapture={stopDragging}
        />

        <div ref={fillRef} className="fill" />

        <div ref={handleRef} className="progress-handle" aria-hidden="true" />

        <div
          className={cn(
            "better-ig-progress-tooltip",
            {
              visible: tooltipVisible,
              "with-video-preview": Boolean(spritesheet || renderPreview)
            },
            variant
          )}
          style={{ left: tooltipPosition }}
          aria-hidden={!tooltipVisible}>
          {renderPreview && tooltipVisible
            ? renderPreview(mousePosition * 100)
            : spritesheet && (
                <InstagramSpritePreview
                  video={video ?? null}
                  spritesheet={spritesheet}
                  percent={mousePosition}
                  duration={duration}
                />
              )}

          <div className="better-ig-progress-time">
            {formatTime(mousePosition * duration)} / {formatTime(duration)}
          </div>
        </div>
      </div>
    </div>
  )
}

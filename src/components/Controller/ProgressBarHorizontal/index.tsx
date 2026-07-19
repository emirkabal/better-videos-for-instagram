import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent
} from "react"

import "./style.css"

import cn from "classnames"

import { useInstagramSpritesheet } from "~hooks/use-instagram-spritesheet"
import type { Variant } from "~modules/Injector"

import InstagramSpritePreview from "./InstagramSpritePreview"

type Props = {
  progress?: number
  onProgress?: (progress: number) => void
  onDragging?: (dragging: boolean) => void
  videoDuration?: number
  variant?: Variant
  video?: HTMLVideoElement | null
  showVideoPreview?: boolean
}

export default function ProgressBarHorizontal({
  progress = 0,
  onProgress,
  onDragging,
  videoDuration = 0,
  variant,
  video,
  showVideoPreview = true
}: Props) {
  const [progressBar, setProgressBar] = useState(progress)
  const [isDragging, setDragging] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState(0)
  const [showTooltip, setShowTooltip] = useState(false)
  const [mousePosition, setMousePosition] = useState(0)
  const [previewRequested, setPreviewRequested] = useState(false)
  const [detectedDuration, setDetectedDuration] = useState(0)

  const dragareaRef = useRef<HTMLDivElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const progressBarRef = useRef(progress)

  const duration =
    videoDuration > 0 && Number.isFinite(videoDuration)
      ? videoDuration
      : detectedDuration > 0 && Number.isFinite(detectedDuration)
        ? detectedDuration
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

  const setDisplayedProgress = useCallback((value: number) => {
    progressBarRef.current = value
    setProgressBar(value)
  }, [])

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

    return () => {
      video.removeEventListener("loadedmetadata", syncDuration)
      video.removeEventListener("durationchange", syncDuration)
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

        setDisplayedProgress(newProgress)
        onProgress?.(newProgress)
      }

      const isLandscapePreview = Boolean(
        video?.videoWidth &&
          video.videoHeight &&
          video.videoWidth > video.videoHeight
      )
      const tooltipWidth = spritesheet ? (isLandscapePreview ? 154 : 93) : 82
      const halfTooltipWidth = Math.min(tooltipWidth / 2, rect.width / 2)

      const clampedPosition = Math.min(
        Math.max(x, halfTooltipWidth),
        rect.width - halfTooltipWidth
      )

      setTooltipPosition(clampedPosition)
      setMousePosition(percent)
    },
    [onProgress, setDisplayedProgress, spritesheet, video]
  )

  useEffect(() => {
    if (Number.isNaN(progress) || isDragging) return

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    const animateProgress = () => {
      const currentProgress = progressBarRef.current
      const difference = progress - currentProgress

      if (Math.abs(difference) < 0.1) {
        setDisplayedProgress(progress)
        animationFrameRef.current = null
        return
      }

      setDisplayedProgress(currentProgress + difference * 0.1)

      animationFrameRef.current = requestAnimationFrame(animateProgress)
    }

    animationFrameRef.current = requestAnimationFrame(animateProgress)

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [progress, isDragging, setDisplayedProgress])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (event: MouseEvent) => {
      updatePointer(event.clientX, true)
    }

    window.addEventListener("mousemove", handleMouseMove)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [isDragging, updatePointer])

  useEffect(() => {
    const stopDragging = () => {
      setDragging(false)
      setShowTooltip(false)
    }

    window.addEventListener("mouseup", stopDragging)
    window.addEventListener("mouseleave", stopDragging)

    return () => {
      window.removeEventListener("mouseup", stopDragging)
      window.removeEventListener("mouseleave", stopDragging)
    }
  }, [])

  useEffect(() => {
    onDragging?.(isDragging)
  }, [isDragging, onDragging])

  const handleMouseMove = (event: ReactMouseEvent<HTMLDivElement>) => {
    setShowTooltip(true)
    if (showVideoPreview) setPreviewRequested(true)
    updatePointer(event.clientX, false)
  }

  const handleMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()

    setDragging(true)
    setShowTooltip(true)
    if (showVideoPreview) setPreviewRequested(true)
    updatePointer(event.clientX, true)
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
          onMouseMove={handleMouseMove}
          onMouseLeave={() => {
            if (!isDragging) {
              setShowTooltip(false)
            }
          }}
          onMouseDown={handleMouseDown}
        />

        <div
          className={cn("fill", {
            "no-transition": isDragging
          })}
          style={{
            transform: `scaleX(${
              (progressBar > 99.5 ? 100 : progressBar < 0.5 ? 0 : progressBar) /
              100
            })`
          }}
        />

        <div
          className={cn(
            "better-ig-progress-tooltip",
            {
              visible: tooltipVisible,
              "with-video-preview": Boolean(spritesheet)
            },
            variant
          )}
          style={{ left: tooltipPosition }}
          aria-hidden={!tooltipVisible}>
          {spritesheet && (
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

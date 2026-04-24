import { useEffect, useRef, useState } from "react"

import "./style.css"

import cn from "classnames"

import type { Variant } from "~modules/Injector"

type Props = {
  progress?: number
  chunksVal?: number
  onProgress?: (progress: number) => void
  onDragging?: (dragging: boolean) => void
  videoDuration?: number
  variant?: Variant
}

export default function ProgressBarHorizontal({
  progress = 0,
  chunksVal = 0,
  onProgress,
  onDragging,
  videoDuration = 0,
  variant
}: Props) {
  const [chunks, setChunks] = useState(chunksVal)
  const [progressBar, setProgressBar] = useState(progress)
  const [isDragging, setDragging] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState(0)
  const [showTooltip, setShowTooltip] = useState(false)
  const dragareaRef = useRef<HTMLDivElement>(null)
  const [mousePosition, setMousePosition] = useState(0)
  const animationFrameRef = useRef<number | null>(null)

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = (seconds % 60).toFixed(1)
    return minutes === 0
      ? `${remainingSeconds}s`
      : `${minutes}:${Math.floor(Number(remainingSeconds)).toString().padStart(2, "0")}`
  }

  let lastX = 0
  const mouseMoveEvent = (e: MouseEvent, click = false) => {
    if (!click && !isDragging) return

    const rect = dragareaRef.current?.getBoundingClientRect()
    if (!rect) return

    const width = rect.width
    const x = Math.min(Math.max(e.clientX - rect.left, 0), width)
    const percent = Number((x / width).toFixed(4))

    if (percent >= 0 && percent <= 1) {
      const newProgress = Math.round(percent * 10000) / 100
      setProgressBar(newProgress)
      if (onProgress) onProgress(newProgress)

      const tooltipWidth = 60
      const maxPosition = width - tooltipWidth / 2
      const minPosition = tooltipWidth / 2
      setTooltipPosition(Math.min(Math.max(x, minPosition), maxPosition))
      setMousePosition(percent)
    }

    lastX = e.clientX
  }

  const updateProgressBar = () => {
    if (isDragging) setProgressBar(progress)
    if (isNaN(progress) || isDragging) return

    const animateProgress = () => {
      setProgressBar((currentProgress) => {
        const diff = progress - currentProgress
        if (Math.abs(diff) < 0.1) return progress
        return currentProgress + diff * 0.1
      })

      animationFrameRef.current = requestAnimationFrame(animateProgress)
    }

    if (animationFrameRef.current)
      cancelAnimationFrame(animationFrameRef.current)
    animationFrameRef.current = requestAnimationFrame(animateProgress)
  }

  useEffect(() => {
    updateProgressBar()
    return () => {
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current)
    }
  }, [progress])

  useEffect(() => {
    window.addEventListener("mousemove", mouseMoveEvent)
    return () => window.removeEventListener("mousemove", mouseMoveEvent)
  }, [isDragging])

  const resizeEvent = () => {
    const rect = dragareaRef.current?.getBoundingClientRect()
    if (!rect) return

    setProgressBar(progressBar)
  }

  useEffect(() => {
    window.addEventListener("resize", resizeEvent)
    return () => window.removeEventListener("resize", resizeEvent)
  }, [progressBar])

  useEffect(() => {
    window.addEventListener("mouseup", () => setDragging(false))
    window.addEventListener("mouseleave", () => setDragging(false))
    return () => {
      window.removeEventListener("mouseup", () => setDragging(false))
      window.removeEventListener("mouseleave", () => setDragging(false))
    }
  }, [])

  useEffect(() => {
    if (onDragging) onDragging(isDragging)
  }, [isDragging])

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = dragareaRef.current?.getBoundingClientRect()
    if (!rect) return

    const width = rect.width
    const x = Math.min(Math.max(e.clientX - rect.left, 0), width)
    const tooltipWidth = 60
    const maxPosition = width - tooltipWidth / 2
    const minPosition = tooltipWidth / 2

    setTooltipPosition(Math.min(Math.max(x, minPosition), maxPosition))
    setMousePosition(x / width)
    setShowTooltip(true)
  }

  return (
    <div className="progress-bar-horizontal bigv-control" onClick={(event) => {
      event.stopPropagation()
    }}>
      <div className={`baseline ${isDragging ? "dragging" : ""}`}>
        <div
          ref={dragareaRef}
          className="dragarea"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setShowTooltip(false)}
          onMouseDown={(e) => [
            setDragging(true),
            mouseMoveEvent(e as any as MouseEvent, true)
          ]}
        />
        <div
          className={cn("fill", {
            "no-transition": isDragging
          })}
          style={{
            transform: `scaleX(${(progressBar > 99.5 ? 100 : progressBar < 0.5 ? 0 : progressBar) / 100})`
          }}
        />
        <div className="chunks" style={{ width: `${chunks}%` }} />
        {(showTooltip || isDragging) && (
          <div
            className={cn(
              "better-ig-progress-tooltip",
              { visible: showTooltip || isDragging },
              variant
            )}
            style={{ left: tooltipPosition }}>
            {formatTime(mousePosition * videoDuration)}
          </div>
        )}
      </div>
    </div>
  )
}

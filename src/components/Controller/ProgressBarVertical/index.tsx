import { useCallback, useEffect, useRef, useState } from "react"

import "./style.css"

import cn from "classnames"

type Props = {
  progress?: number
  onProgress?: (progress: number) => void
  onDragging?: (dragging: boolean) => void
}

const clampProgress = (value: number) =>
  Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), 100)

export default function ProgressBarVertical({
  progress = 0,
  onProgress,
  onDragging
}: Props) {
  const [displayedProgress, setDisplayedProgress] = useState(() =>
    clampProgress(progress)
  )
  const [isDragging, setDragging] = useState(false)
  const baselineRef = useRef<HTMLDivElement>(null)

  const commitProgress = useCallback(
    (value: number) => {
      const nextProgress = Math.round(clampProgress(value) * 100) / 100
      setDisplayedProgress(nextProgress)
      onProgress?.(nextProgress)
    },
    [onProgress]
  )

  const updateFromPointer = useCallback(
    (clientY: number) => {
      const rect = baselineRef.current?.getBoundingClientRect()
      if (!rect || rect.height <= 0) return

      const ratio = 1 - (clientY - rect.top) / rect.height
      commitProgress(ratio * 100)
    },
    [commitProgress]
  )

  useEffect(() => {
    if (!isDragging) setDisplayedProgress(clampProgress(progress))
  }, [isDragging, progress])

  useEffect(() => {
    onDragging?.(isDragging)
  }, [isDragging, onDragging])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    let nextProgress: number | undefined

    switch (event.key) {
      case "ArrowUp":
      case "ArrowRight":
        nextProgress = displayedProgress + 5
        break
      case "ArrowDown":
      case "ArrowLeft":
        nextProgress = displayedProgress - 5
        break
      case "Home":
        nextProgress = 0
        break
      case "End":
        nextProgress = 100
        break
    }

    if (nextProgress === undefined) return

    event.preventDefault()
    event.stopPropagation()
    commitProgress(nextProgress)
  }

  return (
    <div
      className="better-ig-progress-bar-vertical bigv-control"
      onClick={(event) => event.stopPropagation()}>
      <div
        ref={baselineRef}
        className={cn("baseline", { dragging: isDragging })}
        role="slider"
        tabIndex={0}
        aria-label="Volume"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(displayedProgress)}
        onKeyDown={handleKeyDown}
        onPointerDown={(event) => {
          event.preventDefault()
          event.stopPropagation()
          event.currentTarget.focus({ preventScroll: true })
          event.currentTarget.setPointerCapture(event.pointerId)
          setDragging(true)
          updateFromPointer(event.clientY)
        }}
        onPointerMove={(event) => {
          if (isDragging) updateFromPointer(event.clientY)
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId)
          }
          setDragging(false)
        }}
        onPointerCancel={() => setDragging(false)}
        onLostPointerCapture={() => setDragging(false)}>
        <div className="fill" style={{ height: `${displayedProgress}%` }} />
        <div className="pointer" style={{ bottom: `${displayedProgress}%` }} />
        <div className="dragarea" />
      </div>
    </div>
  )
}

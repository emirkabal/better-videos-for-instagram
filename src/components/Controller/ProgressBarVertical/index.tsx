import { useCallback, useEffect, useRef, useState } from "react"

import "./style.css"

import cn from "classnames"

import { t } from "~utils/i18n"

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
  const pointerRef = useRef<number | null>(null)
  const dragBoundsRef = useRef<DOMRect | null>(null)

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
      const rect =
        dragBoundsRef.current ?? baselineRef.current?.getBoundingClientRect()
      if (!rect || rect.height <= 0) return

      const ratio = 1 - (clientY - rect.top) / rect.height
      commitProgress(ratio * 100)
    },
    [commitProgress]
  )

  useEffect(() => {
    if (!isDragging) setDisplayedProgress(clampProgress(progress))
  }, [isDragging, progress])

  const finishDrag = useCallback(() => {
    const pointerId = pointerRef.current
    if (pointerId === null) return
    pointerRef.current = null
    dragBoundsRef.current = null
    setDragging(false)
    onDragging?.(false)
    if (baselineRef.current?.hasPointerCapture(pointerId)) {
      baselineRef.current.releasePointerCapture(pointerId)
    }
  }, [onDragging])

  useEffect(() => {
    if (!isDragging) return
    const ownerWindow = baselineRef.current?.ownerDocument.defaultView ?? window
    ownerWindow.addEventListener("blur", finishDrag)
    return () => ownerWindow.removeEventListener("blur", finishDrag)
  }, [finishDrag, isDragging])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    delete event.currentTarget.dataset.bigvPointerFocus
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
        aria-label={t("volumeLabel")}
        aria-orientation="vertical"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(displayedProgress)}
        onKeyDown={handleKeyDown}
        onBlur={(event) => {
          delete event.currentTarget.dataset.bigvPointerFocus
        }}
        onPointerDown={(event) => {
          if (event.button !== 0 || !event.isPrimary) return
          event.preventDefault()
          event.stopPropagation()
          if (pointerRef.current !== null) return
          pointerRef.current = event.pointerId
          dragBoundsRef.current = event.currentTarget.getBoundingClientRect()
          // A custom slider can remain :focus-visible after pointer focus.
          // Keep its keyboard focus without pinning the mouse-opened capsule.
          event.currentTarget.dataset.bigvPointerFocus = "true"
          event.currentTarget.focus({ preventScroll: true })
          event.currentTarget.setPointerCapture(event.pointerId)
          setDragging(true)
          onDragging?.(true)
          updateFromPointer(event.clientY)
        }}
        onPointerMove={(event) => {
          if (pointerRef.current === event.pointerId)
            updateFromPointer(event.clientY)
        }}
        onPointerUp={(event) => {
          if (pointerRef.current !== event.pointerId) return
          updateFromPointer(event.clientY)
          finishDrag()
        }}
        onPointerCancel={finishDrag}
        onLostPointerCapture={finishDrag}>
        <div className="fill" style={{ height: `${displayedProgress}%` }} />
        <div className="pointer" style={{ bottom: `${displayedProgress}%` }} />
        <div className="dragarea" />
      </div>
    </div>
  )
}

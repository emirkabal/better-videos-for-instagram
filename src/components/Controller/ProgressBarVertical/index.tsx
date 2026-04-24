import { useEffect, useRef, useState } from "react"

import "./style.css"

type Props = {
  progress?: number
  chunksVal?: number
  onProgress?: (progress: number) => void
  onDragging?: (dragging: boolean) => void
}

export default function ProgressBarVertical({
  progress = 0,
  onProgress,
  onDragging
}: Props) {
  const [progressBar, setProgressBar] = useState(progress)
  const [pointerPosition, setPointerPosition] = useState(0)
  const [isDragging, setDragging] = useState(false)

  const dragareaRef = useRef<HTMLDivElement>(null)

  let lastY = 0
  const mouseMoveEvent = (e: MouseEvent, click = false) => {
    if ((e.clientY === lastY || !isDragging) && !click) return
    lastY = 0
    const rect = dragareaRef.current?.getBoundingClientRect()
    if (!rect) return
    const height = rect.height - 6
    const y = Math.min(Math.max(-(e.clientY - rect.top) + height, 0), height)
    const percent = Number((y / height).toFixed(4))
    if (percent >= 0 && percent <= 1) {
      setPointerPosition(y)
      setProgressBar(Math.round(percent * 10000) / 100)
      if (onProgress) onProgress(Math.round(percent * 10000) / 100)
    }
  }

  const updateProgressBar = () => {
    if (isNaN(progress) || isDragging) return
    setProgressBar(progress)
    const rect = dragareaRef.current?.getBoundingClientRect()
    if (!rect) return
    const height = rect.height - 6
    const percent = progress / 100
    const y = height * percent
    setPointerPosition(y)
  }

  useEffect(() => {
    updateProgressBar()
  }, [progress])

  useEffect(() => {
    window.addEventListener("mousemove", mouseMoveEvent)

    return () => {
      window.removeEventListener("mousemove", mouseMoveEvent)
    }
  }, [isDragging])

  const resizeEvent = () => {
    const rect = dragareaRef.current?.getBoundingClientRect()
    if (!rect) return

    const height = rect.height
    const percent = progressBar / 100
    const y = height * percent
    setPointerPosition(y)
    setProgressBar(progressBar)
  }

  useEffect(() => {
    window.addEventListener("resize", resizeEvent)
    return () => {
      window.removeEventListener("resize", resizeEvent)
    }
  }, [progressBar])

  useEffect(() => {
    window.addEventListener("mouseup", () => {
      setDragging(false)
    })
    window.addEventListener("mouseleave", () => {
      setDragging(false)
    })
  }, [])

  useEffect(() => {
    if (onDragging) onDragging(isDragging)
  }, [isDragging])

  return (
    <div
      className="better-ig-progress-bar-vertical bigv-control"
      style={isDragging ? { opacity: 1 } : undefined}>
      <div className="baseline">
        <div
          ref={dragareaRef}
          className="dragarea"
          onMouseDown={(e) => [
            setDragging(true),
            mouseMoveEvent(e as any as MouseEvent, true)
          ]}></div>
        <div
          className="fill"
          style={{
            height: `${
              progressBar > 99.5 ? 100 : progressBar < 0.5 ? 0 : progressBar
            }%`
          }}></div>
        <div
          className="pointer"
          style={{
            transform: `translate3d(0,${pointerPosition}px,0)`,
            opacity: isDragging ? 1 : 0
          }}></div>
      </div>
    </div>
  )
}

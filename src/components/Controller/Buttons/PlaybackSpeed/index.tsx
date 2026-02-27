import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties
} from "react"
import { useLocalStorage } from "usehooks-ts"

import SpeedometerIcon from "./SpeedometerIcon"

const SPEED_OPTIONS = [0.25, 0.5, 1, 1.25, 1.5, 2] as const

const SPEED_ANGLE: Record<typeof SPEED_OPTIONS[number], number> = {
  0.25: -90,
  0.5: -45,
  1: 0,
  1.25: 22.5,
  1.5: 45,
  2: 90
}

export default function PlaybackSpeed() {
  const id = useId()
  const [playbackSpeed, setPlaybackSpeed] = useLocalStorage(
    "bigv-playback-speed",
    1
  )
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (SPEED_OPTIONS.includes(playbackSpeed as (typeof SPEED_OPTIONS)[number]))
      return
    setPlaybackSpeed(1)
  }, [playbackSpeed, setPlaybackSpeed])

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }

    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)

    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [])

  const speed = useMemo(() => {
    if (
      SPEED_OPTIONS.includes(playbackSpeed as (typeof SPEED_OPTIONS)[number])
    ) {
      return playbackSpeed
    }

    return 1
  }, [playbackSpeed])

  const speedStyle = {
    transform: `rotate(${SPEED_ANGLE[speed]}deg)`,
    transformOrigin: "12px 23px",
    transition: "transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1)"
  } as CSSProperties

  return (
    <div className="bigv-playback-speed" ref={rootRef}>
      <button
        id={id}
        type="button"
        className="bigv-speed-button"
        aria-label="Playback speed"
        title={`Playback speed: ${speed}x`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}>
        <SpeedometerIcon handStyle={speedStyle} />
      </button>

      <label htmlFor={id} className="bigv-switch-text bigv-speed-text">
        {speed}x
      </label>

      {open && (
        <div
          className="bigv-speed-popup"
          role="listbox"
          aria-label="Playback speed">
          {SPEED_OPTIONS.map((value) => (
            <button
              key={value}
              role="option"
              type="button"
              className="bigv-speed-option"
              aria-selected={speed === value}
              data-active={speed === value}
              onClick={() => {
                setPlaybackSpeed(value)
                setOpen(false)
              }}>
              {value}x
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

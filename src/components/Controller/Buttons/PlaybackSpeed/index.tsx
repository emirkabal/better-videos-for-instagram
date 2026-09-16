import cn from "classnames"
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties
} from "react"

import { useStorage } from "@plasmohq/storage/hook"

import type { Variant } from "~modules/Injector"

import SpeedometerIcon from "./SpeedometerIcon"

const SPEED_OPTIONS = [0.25, 0.5, 1, 1.25, 1.5, 2] as const

const SPEED_ANGLE: Record<(typeof SPEED_OPTIONS)[number], number> = {
  0.25: -90,
  0.5: -45,
  1: 0,
  1.25: 22.5,
  1.5: 45,
  2: 90
}

type Props = {
  placement?: "controls" | "overlay"
  variant?: Variant
}

export default function PlaybackSpeed({
  placement = "controls",
  variant
}: Props = {}) {
  const id = useId()
  const [playbackSpeed, setPlaybackSpeed] = useStorage<number>(
    "bigv-playback-speed",
    () => {
      const legacy =
        typeof localStorage !== "undefined"
          ? localStorage.getItem("bigv-playback-speed")
          : null
      const parsed = legacy ? parseFloat(legacy) : 1
      return Number.isFinite(parsed) ? parsed : 1
    }
  )
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (playbackSpeed !== undefined) {
      try {
        localStorage.setItem("bigv-playback-speed", String(playbackSpeed))
      } catch {}
    }
  }, [playbackSpeed])

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
    <div
      className={cn("bigv-playback-speed", "bigv-control", variant, {
        overlay: placement === "overlay",
        "in-controls": placement === "controls"
      })}
      ref={rootRef}
      onPointerDown={(event) => {
        event.stopPropagation()
      }}
      onMouseDown={(event) => {
        event.stopPropagation()
      }}
      onClick={(event) => {
        event.stopPropagation()
      }}>
      <button
        id={id}
        type="button"
        className={cn("bigv-speed-button", "bigv-control", variant, {
          "in-overlay": placement === "overlay",
          "in-controls": placement === "controls"
        })}
        aria-label="Playback speed"
        title={`Playback speed: ${speed}x`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onPointerDown={(event) => {
          event.stopPropagation()
        }}
        onMouseDown={(event) => {
          event.stopPropagation()
        }}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setOpen(!open)
        }}>
        <SpeedometerIcon handStyle={speedStyle} />
        {placement === "overlay" && speed !== 1 && (
          <span className="bigv-speed-badge">{speed}x</span>
        )}
      </button>

      {placement === "controls" && (
        <label htmlFor={id} className="bigv-switch-text bigv-speed-text">
          {speed}x
        </label>
      )}

      {open && (
        <div
          className={cn("bigv-speed-popup", "bigv-control", {
            "in-overlay": placement === "overlay",
            "in-controls": placement === "controls"
          })}
          role="listbox"
          aria-label="Playback speed"
          onPointerDown={(event) => {
            event.stopPropagation()
          }}
          onMouseDown={(event) => {
            event.stopPropagation()
          }}
          onClick={(event) => {
            event.stopPropagation()
          }}>
          {SPEED_OPTIONS.map((value) => (
            <button
              key={value}
              role="option"
              type="button"
              className={cn("bigv-speed-option", "bigv-control")}
              aria-selected={speed === value}
              data-active={speed === value}
              onPointerDown={(event) => {
                event.stopPropagation()
              }}
              onMouseDown={(event) => {
                event.stopPropagation()
              }}
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
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

import { useEffect, useId, useRef, useState, type CSSProperties } from "react"
import { useLocalStorage } from "usehooks-ts"

import { t } from "@/utils/i18n"
import { formatPlaybackSpeed } from "@/utils/playback/speed"

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

export default function PlaybackSpeed({
  placement = "controls",
  showLabel = true
}: {
  placement?: "controls" | "overlay" | "dock"
  showLabel?: boolean
}) {
  const id = useId()
  const [playbackSpeed, setPlaybackSpeed] = useLocalStorage(
    "bigv-playback-speed",
    1
  )
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const popupRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (SPEED_OPTIONS.includes(playbackSpeed as (typeof SPEED_OPTIONS)[number]))
      return
    setPlaybackSpeed(1)
  }, [playbackSpeed, setPlaybackSpeed])

  useEffect(() => {
    if (!open) return
    const ownerDocument = rootRef.current?.ownerDocument ?? document

    popupRef.current
      ?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')
      ?.focus({ preventScroll: true })

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    ownerDocument.addEventListener("pointerdown", onPointerDown)

    return () => {
      ownerDocument.removeEventListener("pointerdown", onPointerDown)
    }
  }, [open])

  const speed = SPEED_OPTIONS.includes(
    playbackSpeed as (typeof SPEED_OPTIONS)[number]
  )
    ? (playbackSpeed as (typeof SPEED_OPTIONS)[number])
    : 1

  const speedStyle = {
    transform: `rotate(${SPEED_ANGLE[speed]}deg)`,
    transformOrigin: "12px 23px",
    transition: "transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1)"
  } as CSSProperties

  return (
    <div
      className={`bigv-playback-speed bigv-control ${placement === "controls" ? "" : "bigv-speed-overlay"}`}
      ref={rootRef}
      onClick={(event) => event.stopPropagation()}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
      onKeyDown={(event) => {
        if (open && event.key === "Escape") {
          event.preventDefault()
          event.stopPropagation()
          setOpen(false)
          triggerRef.current?.focus({ preventScroll: true })
        }
      }}>
      <button
        id={id}
        ref={triggerRef}
        type="button"
        className="bigv-speed-button"
        aria-label={t("playbackSpeedLabel")}
        title={`${t("playbackSpeedLabel")}: ${formatPlaybackSpeed(speed)}`}
        aria-controls={open ? `${id}-options` : undefined}
        aria-expanded={open}
        onClick={() => setOpen((previous) => !previous)}>
        {placement !== "controls" ? (
          <span>{formatPlaybackSpeed(speed)}</span>
        ) : (
          <SpeedometerIcon handStyle={speedStyle} />
        )}
      </button>

      {placement === "controls" && showLabel && (
        <label htmlFor={id} className="bigv-switch-text bigv-speed-text">
          {formatPlaybackSpeed(speed)}
        </label>
      )}

      {open && (
        <div
          id={`${id}-options`}
          ref={popupRef}
          className="bigv-speed-popup"
          role="group"
          aria-label={t("playbackSpeedLabel")}>
          {SPEED_OPTIONS.map((value) => (
            <button
              key={value}
              type="button"
              className="bigv-speed-option"
              aria-pressed={speed === value}
              data-active={speed === value}
              onClick={() => {
                setPlaybackSpeed(value)
                setOpen(false)
                triggerRef.current?.focus({ preventScroll: true })
              }}>
              {formatPlaybackSpeed(value)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

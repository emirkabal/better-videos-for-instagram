import type { CSSProperties } from "react"

import type { Variant } from "@/features/player/Injector"
import { t } from "@/utils/i18n"

import VolumeButton from "../Buttons/Volume"
import ProgressBarVertical from "../ProgressBarVertical"
import SmartContainer from "../SmartContainer"

import "./style.css"

export default function VolumeControl({
  progress,
  muted,
  onMuted,
  onProgress,
  dragging = false,
  onDragging,
  variant,
  placement = "overlay",
  orientation = "vertical"
}: {
  progress: number
  muted: boolean
  onMuted: (muted: boolean) => void
  onProgress: (progress: number) => void
  dragging?: boolean
  onDragging?: (dragging: boolean) => void
  variant?: Variant
  placement?: "overlay" | "dock"
  orientation?: "vertical" | "horizontal"
}) {
  if (orientation === "horizontal") {
    return (
      <div
        className="bigv-pip-volume"
        onClick={(event) => event.stopPropagation()}>
        <VolumeButton muted={muted} onChange={onMuted} />
        <input
          className="bigv-pip-volume-slider"
          type="range"
          min={0}
          max={100}
          step={1}
          value={progress}
          aria-label={t("volumeLabel")}
          style={{ "--bigv-volume-level": `${progress}%` } as CSSProperties}
          onPointerDown={(event) => {
            event.currentTarget.dataset.bigvPointerFocus = "true"
          }}
          onKeyDown={(event) => {
            delete event.currentTarget.dataset.bigvPointerFocus
          }}
          onBlur={(event) => {
            delete event.currentTarget.dataset.bigvPointerFocus
          }}
          onChange={(event) => onProgress(Number(event.target.value))}
        />
      </div>
    )
  }

  return (
    <SmartContainer dragging={dragging} variant={variant} placement={placement}>
      <VolumeButton muted={muted} onChange={onMuted} />
      <ProgressBarVertical
        progress={progress}
        onProgress={onProgress}
        onDragging={onDragging}
      />
    </SmartContainer>
  )
}

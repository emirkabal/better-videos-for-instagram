import { useCallback, useEffect, useState } from "react"

import "./style.css"

import { cn } from "cn"

import { Variant } from "@/features/player/Injector"
import { t } from "@/utils/i18n"
import { prepareFullscreenVideo } from "@/utils/fullscreen/playback"

type Props = {
  controllerId: string
  video?: HTMLVideoElement
  placement?: "controls" | "overlay" | "dock"
  variant?: Variant
  showLabel?: boolean
}

export default function FullscreenButton({
  controllerId,
  video,
  placement = "overlay",
  variant,
  showLabel = true
}: Props) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  const getFullscreenTarget = useCallback(() => {
    if (variant === Variant.Reels) {
      return document.documentElement
    }

    return document.getElementById(controllerId)?.parentElement ?? null
  }, [controllerId, variant])

  useEffect(() => {
    const target = getFullscreenTarget()
    if (!target) return

    const syncFullscreenState = () => {
      setIsFullscreen(document.fullscreenElement === target)

      if (document.fullscreenElement !== target) {
        target.classList.remove(
          "bigv-fullscreen-target",
          "bigv-reels-fullscreen-target"
        )
      }
    }

    syncFullscreenState()
    document.addEventListener("fullscreenchange", syncFullscreenState)

    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState)
    }
  }, [getFullscreenTarget])

  const toggleFullscreen = async () => {
    const target = getFullscreenTarget()
    if (!target) return

    let cancelPreparation: (() => void) | undefined
    try {
      if (document.fullscreenElement === target) {
        await document.exitFullscreen()
      } else if (!document.fullscreenElement) {
        if (video && variant !== Variant.Reels)
          cancelPreparation = prepareFullscreenVideo(video)
        target.classList.add("bigv-fullscreen-target")
        target.classList.toggle(
          "bigv-reels-fullscreen-target",
          variant === Variant.Reels
        )
        await target.requestFullscreen()
      }
    } catch {
      cancelPreparation?.()
      target.classList.remove(
        "bigv-fullscreen-target",
        "bigv-reels-fullscreen-target"
      )
    }
  }

  if (!document.fullscreenEnabled) return null

  const button = (
    <button
      type="button"
      className={cn("better-ig-fullscreen-button", "bigv-control", variant, {
        "in-controls": placement === "controls",
        "in-dock": placement === "dock"
      })}
      aria-label={t(
        isFullscreen ? "exitFullscreenLabel" : "enterFullscreenLabel"
      )}
      aria-pressed={isFullscreen}
      title={t(isFullscreen ? "exitFullscreenLabel" : "enterFullscreenLabel")}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void toggleFullscreen()
      }}>
      {isFullscreen ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" />
        </svg>
      )}
    </button>
  )

  if (placement === "controls") {
    return (
      <div className="bigv-fullscreen-control">
        {button}
        {showLabel && (
          <span className="bigv-switch-text bigv-fullscreen-text">
            {t(isFullscreen ? "exitLabel" : "fullscreenLabel")}
          </span>
        )}
      </div>
    )
  }

  return button
}

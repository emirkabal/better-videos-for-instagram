import { useCallback, useEffect, useState } from "react"

import "./style.css"

import cn from "classnames"

import { Variant } from "~modules/Injector"

type Props = {
  controllerId: string
  placement?: "controls" | "overlay"
  variant?: Variant
}

export default function FullscreenButton({
  controllerId,
  placement = "overlay",
  variant
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

    try {
      if (document.fullscreenElement === target) {
        await document.exitFullscreen()
      } else if (!document.fullscreenElement) {
        target.classList.add("bigv-fullscreen-target")
        target.classList.toggle(
          "bigv-reels-fullscreen-target",
          variant === Variant.Reels
        )
        await target.requestFullscreen()
      }
    } catch {
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
        "in-controls": placement === "controls"
      })}
      aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      aria-pressed={isFullscreen}
      title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
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
        <span className="bigv-switch-text bigv-fullscreen-text">
          {isFullscreen ? "Exit" : "Fullscreen"}
        </span>
      </div>
    )
  }

  return button
}

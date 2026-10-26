import { useEffect, useState } from "react"
import { useLocalStorage } from "usehooks-ts"

import { useStorage } from "@plasmohq/storage/hook"

import { useVideoMuted } from "~hooks/use-video-muted"
import type { Variant } from "~modules/Injector"

import VolumeControl from "./Control"

export default function Volume({
  video,
  variant,
  placement = "overlay",
  orientation = "vertical"
}: {
  video: HTMLVideoElement
  variant?: Variant
  placement?: "overlay" | "dock"
  orientation?: "vertical" | "horizontal"
}) {
  const [volume, setVolume] = useLocalStorage(
    "better-instagram-videos-volume",
    0.5
  )
  const [, setMuted] = useLocalStorage("better-instagram-videos-muted", false)
  const muted = useVideoMuted(video)
  const [volumeDragging, setVolumeDragging] = useState(false)
  const [maxVolumeBalance] = useStorage("bigv-max-volume-balance", 100)
  const safeBalance = Number.isFinite(maxVolumeBalance)
    ? Math.max(maxVolumeBalance, 100)
    : 100
  const maximumVolume = 100 / safeBalance
  const normalizedVolume = Number.isFinite(volume)
    ? Math.min(Math.max(volume, 0), maximumVolume)
    : Math.min(0.5, maximumVolume)

  useEffect(() => {
    if (volume !== normalizedVolume) setVolume(normalizedVolume)
  }, [normalizedVolume, setVolume, volume])

  return (
    <VolumeControl
      progress={normalizedVolume * safeBalance}
      muted={muted}
      dragging={volumeDragging}
      onDragging={setVolumeDragging}
      variant={variant}
      placement={placement}
      orientation={orientation}
      onMuted={(nextMuted) => {
        setMuted(nextMuted)
        video.muted = nextMuted
      }}
      onProgress={(progress) => {
        const nextVolume = Math.min(Math.max(progress / safeBalance, 0), 1)
        setVolume(nextVolume)
        video.volume = nextVolume
        if (orientation === "horizontal") {
          setMuted(false)
          video.muted = false
        }
      }}
    />
  )
}

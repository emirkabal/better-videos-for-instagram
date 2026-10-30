import { useEffect, useState } from "react"
import { useLocalStorage } from "usehooks-ts"

import { useSetting } from "@/hooks/use-setting"
import { settings } from "@/utils/storage/settings"

import { useVideoMuted } from "@/hooks/use-video-muted"
import type { Variant } from "@/features/player/Injector"
import { setUserAudio } from "@/utils/media/audio"

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
  const [maxVolumeBalance] = useSetting(settings.maxVolumeBalance)
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
        setUserAudio(video, { volume: video.volume, muted: nextMuted })
      }}
      onProgress={(progress) => {
        const nextVolume = Math.min(Math.max(progress / safeBalance, 0), 1)
        setVolume(nextVolume)
        const nextMuted = nextVolume === 0
        setMuted(nextMuted)
        setUserAudio(video, { volume: nextVolume, muted: nextMuted })
      }}
    />
  )
}

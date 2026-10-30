import { cn } from "cn"

import { Variant } from "@/features/player/Injector"
import { usePlayerControls } from "@/hooks/use-player-controls"
import { t } from "@/utils/i18n"
import FullscreenButton from "../Buttons/Fullscreen"
import PictureInPictureButton from "../Buttons/PictureInPicture"
import PlayPause from "../Buttons/PlayPause"
import PlaybackSpeed from "../Buttons/PlaybackSpeed"
import ProgressBarHorizontal from "../ProgressBarHorizontal"
import Volume from "../Volume"
import StoryNavigation from "../Buttons/StoryNavigation"
import "./style.css"

const formatTime = (value: number) => {
  const seconds = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
}

export default function StoryControls({
  video,
  controllerId,
  progress,
  duration,
  onProgress,
  onDragging
}: {
  video: HTMLVideoElement
  controllerId: string
  progress: number
  duration: number
  onProgress: (progress: number) => void
  onDragging: (dragging: boolean) => void
}) {
  const { controlsRef, visible, compact } = usePlayerControls(video)
  return (
    <div
      ref={controlsRef}
      className={cn("bigv-story-player bigv-pip-slider-theme bigv-control", {
        "is-visible": visible,
        "is-compact": compact
      })}
      onClick={(event) => event.stopPropagation()}>
      <div
        className="bigv-player-dock stories bigv-story-toolbar is-visible"
        role="group"
        aria-label={t("videoControlsLabel")}>
        <Volume
          video={video}
          variant={Variant.Stories}
          placement="dock"
          orientation="horizontal"
        />
        <div className="bigv-story-transport">
          <StoryNavigation direction={-1} />
          <PlayPause video={video} />
          <StoryNavigation direction={1} />
        </div>
        <div className="bigv-story-options">
          <PlaybackSpeed placement="dock" />
          <PictureInPictureButton video={video} followStories />
          <FullscreenButton
            video={video}
            controllerId={controllerId}
            variant={Variant.Stories}
            placement="dock"
          />
        </div>
      </div>
      <div className="bigv-story-timeline">
        <span>{formatTime(video.currentTime)}</span>
        <div className="better-ig-controller stories">
          <ProgressBarHorizontal
            video={video}
            variant={Variant.Stories}
            progress={progress}
            videoDuration={duration}
            showVideoPreview={false}
            onProgress={onProgress}
            onDragging={onDragging}
          />
        </div>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  )
}

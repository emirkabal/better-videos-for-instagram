import { cn } from "cn"
import { useEffect } from "react"
import { usePlayerControls } from "@/hooks/use-player-controls"
import { t } from "@/utils/i18n"
import PictureInPictureButton from "../Buttons/PictureInPicture"
import StoryNavigation from "../Buttons/StoryNavigation"
import "./style.css"

export default function ImageControls({
  image,
  id
}: {
  image: HTMLImageElement
  id: string
}) {
  const { controlsRef, visible } = usePlayerControls(image)
  useEffect(() => {
    document.getElementById(id)?.setAttribute("data-bigv-ready", "")
  }, [id])
  return (
    <div
      ref={controlsRef}
      className={cn("bigv-story-player bigv-control is-photo", {
        "is-visible": visible
      })}
      onClick={(event) => event.stopPropagation()}>
      <div
        className="bigv-player-dock stories bigv-story-toolbar is-visible"
        role="group"
        aria-label={t("videoControlsLabel")}>
        <StoryNavigation direction={-1} />
        <PictureInPictureButton image={image} followStories />
        <StoryNavigation direction={1} />
      </div>
      <div className="better-ig-controller" />
    </div>
  )
}

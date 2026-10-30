import { useEffect } from "react"

import type { InstagramSpritesheet } from "@/features/instagram/bridges/spritesheet-client"

type Props = {
  duration: number
  percent: number
  spritesheet: InstagramSpritesheet
  video: HTMLVideoElement | null
}

export function getSpritePosition(
  time: number,
  spritesheet: InstagramSpritesheet,
  renderWidth: number,
  renderHeight: number
) {
  const {
    maxThumbnailsPerSprite,
    spriteUrls,
    thumbnailDuration,
    thumbnailsPerRow
  } = spritesheet

  if (
    !Number.isInteger(maxThumbnailsPerSprite) ||
    maxThumbnailsPerSprite <= 0 ||
    !Number.isInteger(thumbnailsPerRow) ||
    thumbnailsPerRow <= 0 ||
    !Number.isFinite(thumbnailDuration) ||
    thumbnailDuration <= 0 ||
    !Number.isFinite(time) ||
    spriteUrls.length === 0
  ) {
    return null
  }

  const thumbnailIndex = Math.min(
    spriteUrls.length * maxThumbnailsPerSprite - 1,
    Math.max(0, Math.floor(time / thumbnailDuration))
  )
  const spriteIndex = Math.floor(thumbnailIndex / maxThumbnailsPerSprite)
  const cellIndex = thumbnailIndex % maxThumbnailsPerSprite
  const row = Math.floor(cellIndex / thumbnailsPerRow)
  const column = cellIndex % thumbnailsPerRow
  const rows = Math.ceil(maxThumbnailsPerSprite / thumbnailsPerRow)

  return {
    backgroundPosition: `-${column * renderWidth}px -${row * renderHeight}px`,
    backgroundSize: `${thumbnailsPerRow * renderWidth}px ${rows * renderHeight}px`,
    spriteIndex
  }
}

export default function InstagramSpritePreview({
  duration,
  percent,
  spritesheet,
  video
}: Props) {
  const isLandscape = Boolean(
    video?.videoWidth &&
    video.videoHeight &&
    video.videoWidth > video.videoHeight
  )
  const renderWidth = isLandscape ? 140 : 79
  const renderHeight = isLandscape ? 79 : 140
  const sampleTime = Math.min(
    Math.min(Math.max(percent, 0), 1) * duration,
    Math.max(duration - 0.001, 0)
  )
  const position = getSpritePosition(
    sampleTime,
    spritesheet,
    renderWidth,
    renderHeight
  )

  useEffect(() => {
    const images = spritesheet.spriteUrls.map((url) => {
      const image = new Image()
      image.src = url
      return image
    })

    return () => {
      for (const image of images) image.src = ""
    }
  }, [spritesheet])

  const spriteUrl = position
    ? spritesheet.spriteUrls[position.spriteIndex]
    : undefined

  return (
    <div
      className="better-ig-progress-preview instagram-spritesheet"
      style={{
        width: renderWidth,
        height: renderHeight,
        backgroundImage: spriteUrl
          ? `url(${JSON.stringify(spriteUrl)})`
          : undefined,
        backgroundPosition: position?.backgroundPosition,
        backgroundSize: position?.backgroundSize
      }}
    />
  )
}

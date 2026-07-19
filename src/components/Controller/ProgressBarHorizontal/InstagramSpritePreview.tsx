import { useEffect } from "react"

import type { InstagramSpritesheet } from "~utils/instagram-spritesheet-bridge"

type Props = {
  duration: number
  percent: number
  spritesheet: InstagramSpritesheet
  video: HTMLVideoElement | null
}

function getSpritePosition(
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
    maxThumbnailsPerSprite <= 0 ||
    thumbnailsPerRow <= 0 ||
    thumbnailDuration <= 0 ||
    spriteUrls.length === 0
  ) {
    return null
  }

  const spriteDuration = maxThumbnailsPerSprite * thumbnailDuration
  const spriteIndex = Math.min(
    spriteUrls.length - 1,
    Math.max(0, Math.floor(time / spriteDuration))
  )
  const cellIndex = Math.floor((time % spriteDuration) / thumbnailDuration)
  const boundedCellIndex =
    spriteIndex === spriteUrls.length - 1
      ? Math.min(cellIndex, maxThumbnailsPerSprite - 1)
      : cellIndex
  const row = Math.floor(boundedCellIndex / thumbnailsPerRow)
  const column = boundedCellIndex % thumbnailsPerRow
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
  const sampleTime = Math.min(Math.max(percent, 0), 1) * duration
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

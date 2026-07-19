import { getVideoSource } from "./instagram-spritesheet-bridge"

export function isInstagramVideo(video: HTMLVideoElement) {
  return getVideoSource(video).startsWith("blob:")
}

export function isVideoInViewport(video: HTMLVideoElement) {
  if (video.closest('[aria-hidden="true"]')) return false

  const rect = video.getBoundingClientRect()

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.right > 0 &&
    rect.bottom > 0 &&
    rect.left < window.innerWidth &&
    rect.top < window.innerHeight
  )
}

export function getVideoVisibilityScore(video: HTMLVideoElement) {
  const rect = video.getBoundingClientRect()

  if (rect.width <= 0 || rect.height <= 0) return 0

  const visibleWidth =
    Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0)
  const visibleHeight =
    Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0)

  if (visibleWidth <= 0 || visibleHeight <= 0) return 0

  const visibleRatio =
    (visibleWidth * visibleHeight) / (rect.width * rect.height)
  const videoCenter = rect.top + rect.height / 2
  const viewportCenter = window.innerHeight / 2
  const centerPenalty =
    Math.abs(videoCenter - viewportCenter) / Math.max(window.innerHeight, 1)

  return Math.max(visibleRatio - centerPenalty, 0)
}

export function getActiveInstagramVideo() {
  const videos = Array.from(
    document.querySelectorAll<HTMLVideoElement>("video")
  ).filter(isInstagramVideo)

  const playingVideos = videos.filter(
    (video) => !video.paused && !video.ended && video.readyState > 0
  )
  const candidates = playingVideos.length > 0 ? playingVideos : videos

  let activeVideo: HTMLVideoElement | null = null
  let activeScore = Number.NEGATIVE_INFINITY

  for (const video of candidates) {
    if (video.closest('[aria-hidden="true"]')) continue

    const score = getVideoVisibilityScore(video)

    if (score > activeScore) {
      activeVideo = video
      activeScore = score
    }
  }

  return activeVideo
}

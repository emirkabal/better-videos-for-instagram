export function setVideoPlaying(video: HTMLVideoElement, playing: boolean) {
  if (video.hasAttribute("data-bigv-fullscreen-source"))
    video.setAttribute("data-bigv-fullscreen-playing", String(playing))
  if (playing) return video.play().catch(() => {})
  video.pause()
}

export function prepareFullscreenVideo(video: HTMLVideoElement) {
  video.setAttribute("data-bigv-fullscreen-source", "true")
  video.setAttribute("data-bigv-fullscreen-playing", String(!video.paused))
  return () => {
    video.removeAttribute("data-bigv-fullscreen-source")
    video.removeAttribute("data-bigv-fullscreen-playing")
  }
}

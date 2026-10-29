export function getPlaybackProgress(video: HTMLVideoElement) {
  if (!Number.isFinite(video.duration) || video.duration <= 0) return 0
  const progress = (video.currentTime / video.duration) * 100
  return Number.isFinite(progress) ? Math.min(Math.max(progress, 0), 100) : 0
}

// Paint from the media clock without rendering the React tree on every frame.
export function observePlaybackProgress(
  video: HTMLVideoElement,
  onProgress: (progress: number) => void,
  frameWindow?: Window
) {
  let frame: number | null = null
  const frameDocument = frameWindow?.document ?? document
  const clock = frameWindow ?? globalThis

  const paint = () => onProgress(getPlaybackProgress(video))
  const stop = () => {
    if (frame !== null) clock.cancelAnimationFrame(frame)
    frame = null
  }
  const canAnimate = () =>
    !video.paused && !video.ended && !frameDocument.hidden
  const tick = () => {
    frame = null
    paint()
    if (canAnimate()) frame = clock.requestAnimationFrame(tick)
  }
  const start = () => {
    stop()
    paint()
    if (canAnimate()) frame = clock.requestAnimationFrame(tick)
  }
  const halt = () => {
    stop()
    paint()
  }

  const resumeEvents = ["play", "playing", "seeked"] as const
  const stopEvents = [
    "pause",
    "ended",
    "waiting",
    "seeking",
    "emptied",
    "loadstart"
  ] as const
  const updateEvents = ["timeupdate", "durationchange"] as const
  for (const event of resumeEvents) video.addEventListener(event, start)
  for (const event of stopEvents) video.addEventListener(event, halt)
  for (const event of updateEvents) video.addEventListener(event, paint)
  frameDocument.addEventListener("visibilitychange", start)
  start()

  return () => {
    stop()
    for (const event of resumeEvents) video.removeEventListener(event, start)
    for (const event of stopEvents) video.removeEventListener(event, halt)
    for (const event of updateEvents) video.removeEventListener(event, paint)
    frameDocument.removeEventListener("visibilitychange", start)
  }
}

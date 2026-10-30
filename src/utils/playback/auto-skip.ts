// Detect natural completion even when the site's player loops. A seek, source
// change, or pause must never be mistaken for finishing a Reel.
export function observeAutoSkip(
  video: HTMLVideoElement,
  allowed: () => boolean,
  advance: () => void,
  clock: Pick<Window, "requestAnimationFrame" | "cancelAnimationFrame"> = window
) {
  let frame: number | null = null
  let lastTime = video.currentTime
  let seeking = false
  let completed = false
  let armed = false
  const complete = () => {
    if (completed || seeking || !armed || !allowed()) return
    completed = true
    advance()
  }
  const sample = () => {
    const time = video.currentTime
    const duration = video.duration
    if (time < lastTime) {
      completed = false
      armed = false
    }
    if (!video.paused && !seeking && time > lastTime && time - lastTime < 1)
      armed = true
    // Only looping videos need early detection; normal videos use ended.
    if (
      video.loop &&
      !video.paused &&
      !seeking &&
      armed &&
      Number.isFinite(duration) &&
      duration > 0 &&
      time >= duration - Math.min(0.08, duration / 10)
    )
      complete()
    lastTime = time
  }
  const stop = () => {
    if (frame !== null) clock.cancelAnimationFrame(frame)
    frame = null
  }
  const tick = () => {
    frame = null
    sample()
    if (!video.paused && !video.ended) frame = clock.requestAnimationFrame(tick)
  }
  const start = () => {
    stop()
    frame = clock.requestAnimationFrame(tick)
  }
  const beginSeek = () => {
    seeking = true
    armed = false
  }
  const endSeek = () => {
    seeking = false
    lastTime = video.currentTime
    completed = false
  }
  const reset = () => {
    stop()
    lastTime = video.currentTime
    completed = false
    armed = false
    seeking = false
  }
  const ended = () => complete()
  video.addEventListener("timeupdate", sample)
  video.addEventListener("playing", start)
  video.addEventListener("pause", stop)
  video.addEventListener("ended", ended)
  video.addEventListener("seeking", beginSeek)
  video.addEventListener("seeked", endSeek)
  video.addEventListener("emptied", reset)
  video.addEventListener("loadstart", reset)
  if (!video.paused) start()
  return () => {
    stop()
    video.removeEventListener("timeupdate", sample)
    video.removeEventListener("playing", start)
    video.removeEventListener("pause", stop)
    video.removeEventListener("ended", ended)
    video.removeEventListener("seeking", beginSeek)
    video.removeEventListener("seeked", endSeek)
    video.removeEventListener("emptied", reset)
    video.removeEventListener("loadstart", reset)
  }
}

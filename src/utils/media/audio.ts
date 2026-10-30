export type VideoAudio = { volume: number; muted: boolean }
export type VideoAudioIntent = VideoAudio & { savePreference?: boolean }
const limits = new WeakMap<HTMLVideoElement, number>()
export const getVideoAudioLimit = (video: HTMLVideoElement) =>
  limits.get(video) ?? 1
export function setVideoAudioLimit(video: HTMLVideoElement, limit: number) {
  limits.set(
    video,
    Number.isFinite(limit) && limit > 0 ? Math.min(limit, 1) : 1
  )
  return () => {
    limits.delete(video)
  }
}

// Notify the source controller before changing media properties. Media events
// are asynchronous; the saved React preference may not have rendered yet.
export function setUserAudio(
  video: HTMLVideoElement,
  next: VideoAudio,
  savePreference = false
) {
  video.dispatchEvent(
    new CustomEvent<VideoAudioIntent>("bigv-audio-intent", {
      detail: savePreference ? { ...next, savePreference } : next
    })
  )
  video.volume = next.volume
  video.muted = next.muted
}

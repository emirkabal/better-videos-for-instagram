import { useCallback, useSyncExternalStore } from "react"

// The saved preference can differ from the media element during muted autoplay.
export function useVideoMuted(video: HTMLVideoElement) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      video.addEventListener("volumechange", onChange)
      video.addEventListener("emptied", onChange)
      return () => {
        video.removeEventListener("volumechange", onChange)
        video.removeEventListener("emptied", onChange)
      }
    },
    [video]
  )
  const getSnapshot = useCallback(() => video.muted, [video])
  return useSyncExternalStore(subscribe, getSnapshot)
}

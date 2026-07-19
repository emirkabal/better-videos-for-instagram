import { useEffect, useState } from "react"

import {
  getVideoSource,
  INSTAGRAM_SPRITESHEET_CHANNEL,
  type InstagramSpritesheet,
  type SpritesheetOutgoingMessage
} from "~utils/instagram-spritesheet-bridge"

const RETRY_DELAYS = [50, 100, 200, 400, 800]

export function useInstagramSpritesheet(
  video: HTMLVideoElement | null | undefined,
  enabled: boolean
) {
  const [result, setResult] = useState<{
    source: string
    spritesheet: InstagramSpritesheet
  } | null>(null)

  useEffect(() => {
    if (!enabled || !video) {
      setResult(null)
      return
    }

    let activeRequestId = ""
    let activeSource = ""
    let retryIndex = 0
    let retryTimer: number | null = null
    let warningShown = false
    let disposed = false

    const clearRetry = () => {
      if (retryTimer === null) return
      window.clearTimeout(retryTimer)
      retryTimer = null
    }

    const sendRequest = () => {
      if (disposed || !activeRequestId || !activeSource) return

      window.postMessage(
        {
          channel: INSTAGRAM_SPRITESHEET_CHANNEL,
          type: "request-spritesheet",
          requestId: activeRequestId,
          blobUrl: activeSource
        },
        window.location.origin
      )

      clearRetry()

      const delay = RETRY_DELAYS[retryIndex]
      if (delay === undefined) return

      retryIndex += 1
      retryTimer = window.setTimeout(sendRequest, delay)
    }

    const syncVideoSource = () => {
      if (disposed) return

      const source = getVideoSource(video)
      if (source === activeSource && activeRequestId) return

      clearRetry()
      setResult(null)
      activeSource = source
      activeRequestId = source ? crypto.randomUUID() : ""
      retryIndex = 0
      warningShown = false

      if (activeRequestId) sendRequest()
    }

    const handleMessage = (event: MessageEvent) => {
      if (
        event.source !== window ||
        event.origin !== window.location.origin ||
        !event.data ||
        typeof event.data !== "object" ||
        event.data.channel !== INSTAGRAM_SPRITESHEET_CHANNEL
      ) {
        return
      }

      const message = event.data as SpritesheetOutgoingMessage

      if (message.type === "bridge-ready") {
        sendRequest()
        return
      }

      if (message.requestId !== activeRequestId) return

      if (message.type === "spritesheet-ready") {
        clearRetry()

        if (getVideoSource(video) !== activeSource) {
          syncVideoSource()
          return
        }

        setResult({ source: activeSource, spritesheet: message.spritesheet })
        return
      }

      if (message.type === "spritesheet-error" && !warningShown) {
        warningShown = true
        console.warn(`[Better IG] Spritesheet unavailable: ${message.reason}`)
      }
    }

    const sourceObserver = new MutationObserver(syncVideoSource)

    sourceObserver.observe(video, {
      attributes: true,
      attributeFilter: ["src"]
    })

    window.addEventListener("message", handleMessage)
    video.addEventListener("emptied", syncVideoSource)
    video.addEventListener("loadedmetadata", syncVideoSource)
    video.addEventListener("loadstart", syncVideoSource)
    syncVideoSource()

    return () => {
      disposed = true
      clearRetry()
      sourceObserver.disconnect()
      window.removeEventListener("message", handleMessage)
      video.removeEventListener("emptied", syncVideoSource)
      video.removeEventListener("loadedmetadata", syncVideoSource)
      video.removeEventListener("loadstart", syncVideoSource)
    }
  }, [enabled, video])

  const currentSource = video ? getVideoSource(video) : ""

  return result?.source === currentSource ? result.spritesheet : null
}

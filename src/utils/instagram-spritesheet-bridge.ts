export const INSTAGRAM_SPRITESHEET_CHANNEL =
  "better-instagram-videos-spritesheet-v1"

export type InstagramSpritesheet = {
  mediaId: string
  maxThumbnailsPerSprite: number
  spriteUrls: string[]
  thumbnailDuration: number
  thumbnailsPerRow: number
}

type BridgeMessage = {
  channel: typeof INSTAGRAM_SPRITESHEET_CHANNEL
}

export type SpritesheetRequestMessage = BridgeMessage & {
  type: "request-spritesheet"
  requestId: string
  blobUrl: string
}

export type SpritesheetReadyMessage = BridgeMessage & {
  type: "spritesheet-ready"
  requestId: string
  spritesheet: InstagramSpritesheet
}

export type SpritesheetErrorMessage = BridgeMessage & {
  type: "spritesheet-error"
  requestId: string
  reason: "media-id-not-found" | "request-failed" | "spritesheet-unavailable"
}

export type SpritesheetBridgeReadyMessage = BridgeMessage & {
  type: "bridge-ready"
}

export type SpritesheetIncomingMessage = SpritesheetRequestMessage

export type SpritesheetOutgoingMessage =
  | SpritesheetReadyMessage
  | SpritesheetErrorMessage
  | SpritesheetBridgeReadyMessage

export function getVideoSource(video: HTMLVideoElement) {
  return video.src || video.currentSrc
}

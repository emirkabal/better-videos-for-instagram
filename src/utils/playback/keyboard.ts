import { setVideoPlaying } from "../fullscreen/playback"
import {
  getVideoAudioLimit,
  setUserAudio,
  type VideoAudio
} from "../media/audio"

type KeyboardAudio = {
  volumeLimit?: number
  setAudio?: (video: HTMLVideoElement, audio: VideoAudio) => void
}

export type PlayerCommand =
  | { kind: "seek"; amount: number }
  | { kind: "volume"; amount: number }
  | { kind: "play" | "mute" }
export type PlayerFeedback = {
  kind: "seek" | "volume" | "playing" | "paused" | "muted" | "unmuted"
  value?: number
  document: Document
}
export const PLAYER_FEEDBACK_EVENT = "bigv-player-feedback"

export function getPlayerCommand(event: KeyboardEvent): PlayerCommand | null {
  if (
    event.defaultPrevented ||
    event.isComposing ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    (event.shiftKey && event.key !== "+")
  )
    return null
  const key = event.key.toLowerCase()
  const layoutKey = (
    { KeyJ: "j", KeyK: "k", KeyL: "l", KeyM: "m" } as Record<string, string>
  )[event.code]
  switch (/^[jklm]$/.test(key) ? key : (layoutKey ?? key)) {
    case " ":
    case "k":
      return { kind: "play" }
    case "m":
      return { kind: "mute" }
    case "arrowleft":
      return { kind: "seek", amount: -5 }
    case "arrowright":
      return { kind: "seek", amount: 5 }
    case "j":
      return { kind: "seek", amount: -10 }
    case "l":
      return { kind: "seek", amount: 10 }
    case "arrowup":
    case "+":
    case "=":
      return { kind: "volume", amount: 5 }
    case "arrowdown":
    case "-":
    case "−":
      return { kind: "volume", amount: -5 }
    default:
      return null
  }
}

export function isKeyboardControl(target: EventTarget | null) {
  const node = target as HTMLElement | null
  if (!node?.closest || node.tagName === "VIDEO") return false
  const control = node.closest(
    'input, textarea, select, button, a[href], [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"], [role="button"], [role="slider"], [role="menu"], [role="tablist"]'
  )
  if (
    !node.isContentEditable &&
    control?.matches('a, [role="button"]') &&
    control.querySelector("video[bigv-injected], video[data-bigv-pip-mirror]")
  )
    return false
  return Boolean(node.isContentEditable || control)
}

const lastAudibleVolume = new WeakMap<HTMLVideoElement, number>()
export function runPlayerCommand(
  video: HTMLVideoElement,
  command: PlayerCommand,
  doc: Document,
  setPlaying: (video: HTMLVideoElement, playing: boolean) => void = (
    video,
    playing
  ) => {
    void setVideoPlaying(video, playing)
  },
  audio: KeyboardAudio = {}
) {
  let feedback: Omit<PlayerFeedback, "document">
  const maximum = audio.volumeLimit ?? getVideoAudioLimit(video)
  const setAudio =
    audio.setAudio ??
    ((video: HTMLVideoElement, next: VideoAudio) =>
      setUserAudio(video, next, true))
  if (video.volume > 0) lastAudibleVolume.set(video, video.volume)
  switch (command.kind) {
    case "seek": {
      if (!Number.isFinite(video.duration) || video.duration <= 0) return
      const before = video.currentTime
      const after = Math.min(
        Math.max(before + command.amount, 0),
        video.duration
      )
      video.currentTime = after
      const delta = after - before
      if (!delta) return
      feedback = { kind: "seek", value: delta }
      break
    }
    case "volume": {
      const volume = Math.min(
        Math.max(video.volume + (command.amount / 100) * maximum, 0),
        maximum
      )
      setAudio(video, { volume, muted: volume === 0 })
      feedback = { kind: "volume", value: Math.round((volume / maximum) * 100) }
      break
    }
    case "mute": {
      const unmute = video.muted || video.volume === 0
      const volume = Math.min(
        video.volume || lastAudibleVolume.get(video) || maximum * 0.5,
        maximum
      )
      setAudio(video, { volume, muted: !unmute })
      feedback = { kind: unmute ? "unmuted" : "muted" }
      break
    }
    case "play": {
      const playing = video.paused
      setPlaying(video, playing)
      feedback = { kind: playing ? "playing" : "paused" }
      break
    }
  }
  video.dispatchEvent(
    new CustomEvent<PlayerFeedback>(PLAYER_FEEDBACK_EVENT, {
      detail: { ...feedback, document: doc }
    })
  )
}

export function observePlayerKeyboard(
  doc: Document,
  getVideo: () => HTMLVideoElement | null,
  options: KeyboardAudio & {
    volumeArrows?: () => boolean
    spaceToggle?: () => boolean
    setPlaying?: (video: HTMLVideoElement, playing: boolean) => void
    photoNavigation?: (direction: 1 | -1) => void
  } = {}
) {
  const keydown = (event: KeyboardEvent) => {
    if (event.key === " " && options.spaceToggle?.() === false) return
    if (
      (event.key === "ArrowUp" || event.key === "ArrowDown") &&
      options.volumeArrows?.() === false
    )
      return
    const command = getPlayerCommand(event)
    if (!command || event.composedPath().some(isKeyboardControl)) return
    const video = getVideo()
    const photoDirection =
      !video &&
      options.photoNavigation &&
      command.kind === "seek" &&
      Math.abs(command.amount) === 5
        ? command.amount > 0
          ? 1
          : -1
        : null
    if (!video && !photoDirection) return
    event.preventDefault()
    event.stopImmediatePropagation()
    if (event.repeat && (command.kind === "play" || command.kind === "mute"))
      return
    if (video)
      runPlayerCommand(video, command, doc, options.setPlaying, options)
    else if (photoDirection) options.photoNavigation?.(photoDirection)
  }
  doc.addEventListener("keydown", keydown, true)
  return () => doc.removeEventListener("keydown", keydown, true)
}

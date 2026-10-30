import { useEffect, useState } from "react"
import { t } from "@/utils/i18n"
import {
  PLAYER_FEEDBACK_EVENT,
  type PlayerFeedback as Feedback
} from "@/utils/playback/keyboard"
import { PlaybackIcon } from "../Buttons/PlayPause"
import "./style.css"

function FeedbackIcon({ feedback }: { feedback: Feedback }) {
  if (feedback.kind === "playing" || feedback.kind === "paused")
    return <PlaybackIcon paused={feedback.kind === "playing"} />
  if (feedback.kind === "seek")
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        fill="currentColor"
        style={{
          transform: (feedback.value ?? 0) < 0 ? "rotate(180deg)" : undefined
        }}>
        <path d="m3 5 10 7L3 19zm10 0 10 7-10 7z" />
      </svg>
    )
  const muted =
    feedback.kind === "muted" ||
    (feedback.kind === "volume" && feedback.value === 0)
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round">
      <path d="M11 4 6 8H3v8h3l5 4z" fill="currentColor" stroke="none" />
      {muted ? (
        <path d="m16 9 6 6m0-6-6 6" />
      ) : (
        <>
          <path d="M15 8a6 6 0 0 1 0 8" />
          <path d="M18 5a10 10 0 0 1 0 14" />
        </>
      )}
    </svg>
  )
}

export default function PlayerFeedback({
  video,
  ownerDocument = video.ownerDocument
}: {
  video: HTMLVideoElement
  ownerDocument?: Document
}) {
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    let previous: Feedback | null = null
    let lastAt = 0
    setVisible(false)
    setFeedback(null)
    const receive = (event: Event) => {
      const next = (event as CustomEvent<Feedback>).detail
      if (next.document !== ownerDocument) return
      const now = Date.now()
      const merged =
        next.kind === "seek" &&
        previous?.kind === "seek" &&
        Math.sign(next.value ?? 0) === Math.sign(previous.value ?? 0) &&
        now - lastAt < 800
          ? { ...next, value: (previous.value ?? 0) + (next.value ?? 0) }
          : next
      previous = merged
      lastAt = now
      clearTimeout(timer)
      setFeedback(merged)
      setVisible(true)
      timer = setTimeout(() => setVisible(false), 800)
    }
    video.addEventListener(PLAYER_FEEDBACK_EVENT, receive)
    return () => {
      clearTimeout(timer)
      video.removeEventListener(PLAYER_FEEDBACK_EVENT, receive)
    }
  }, [video, ownerDocument])
  if (!feedback) return null
  const seek = feedback.kind === "seek"
  const value = feedback.value ?? 0
  const label =
    feedback.kind === "seek"
      ? `${t(value < 0 ? "seekBackwardLabel" : "seekForwardLabel")} · ${Math.round(Math.abs(value) * 10) / 10} ${t("secondsShortLabel")}`
      : feedback.kind === "volume"
        ? `${t("volumeLabel")} · ${value}%`
        : t(`${feedback.kind}Feedback`)
  const text = seek
    ? `${Math.round(Math.abs(value) * 10) / 10} ${t("secondsShortLabel")}`
    : feedback.kind === "volume"
      ? `${value}%`
      : null
  return (
    <div
      className={`bigv-player-feedback ${visible ? "is-visible" : ""} ${seek ? (value < 0 ? "is-backward" : "is-forward") : ""}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-hidden={!visible}
      aria-label={label}>
      <FeedbackIcon feedback={feedback} />
      {text && <span aria-hidden="true">{text}</span>}
      <span className="bigv-feedback-announcement">{label}</span>
    </div>
  )
}

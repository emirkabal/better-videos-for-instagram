export function formatPlaybackSpeed(speed: number) {
  return `${Number.isInteger(speed) ? speed.toFixed(1) : speed}×`
}

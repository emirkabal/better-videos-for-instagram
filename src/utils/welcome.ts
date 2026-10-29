export function shouldShowWelcome(
  reason: string,
  currentVersion: string,
  previousVersion?: string,
  lastShownVersion?: string
) {
  if (reason === "install") return true
  return (
    reason === "update" &&
    previousVersion !== currentVersion &&
    lastShownVersion !== currentVersion
  )
}

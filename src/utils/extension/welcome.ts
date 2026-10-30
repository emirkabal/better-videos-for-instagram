export function shouldShowWelcome(
  reason: string,
  currentVersion: string,
  previousVersion?: string,
  lastShownVersion?: string,
  updatesEnabled = true
) {
  if (reason === "install") return lastShownVersion !== currentVersion
  if (
    reason !== "update" ||
    !updatesEnabled ||
    lastShownVersion === currentVersion
  )
    return false
  const parse = (version?: string) => {
    const match = version?.match(/^(\d+)\.(\d+)\.(\d+)$/)
    return match
      ? ([Number(match[1]), Number(match[2]), Number(match[3])] as const)
      : null
  }
  const current = parse(currentVersion)
  const previous = parse(previousVersion)
  if (!current || !previous) return false
  return (
    current[0] > previous[0] ||
    (current[0] === previous[0] && current[1] > previous[1])
  )
}

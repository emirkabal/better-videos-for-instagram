export function toInstagramReelUrl(href: string | null) {
  if (!href) return null
  try {
    const url = new URL(href, "https://www.instagram.com")
    if (
      url.protocol !== "https:" ||
      !["instagram.com", "www.instagram.com"].includes(url.hostname)
    )
      return null
    const match = url.pathname.match(/^\/reels?\/([\w-]+)\/?$/)
    if (!match?.[1] || ["audio", "liked", "saved"].includes(match[1]))
      return null
    return `https://www.instagram.com/reel/${match[1]}/`
  } catch {
    return null
  }
}

export function getNativeReelUrl(video: HTMLVideoElement) {
  const enclosingLink = video.closest("a")
  const directUrl = toInstagramReelUrl(
    enclosingLink?.getAttribute("href") ??
      enclosingLink?.getAttribute("data-bigv-original-href") ??
      null
  )
  if (directUrl) return directUrl

  // Stay inside this post: never open a different video's link from the feed.
  const article = video.closest("article")
  if (!article) return null
  const urls = new Set(
    Array.from(article.querySelectorAll<HTMLAnchorElement>("a[href]"))
      .map((anchor) => toInstagramReelUrl(anchor.getAttribute("href")))
      .filter((url): url is string => url !== null)
  )
  return urls.size === 1 ? (urls.values().next().value as string) : null
}

export function getNativeReelAnchor(
  video: HTMLVideoElement
): HTMLAnchorElement | null {
  const direct = video.closest("a")
  if (toInstagramReelUrl(direct?.getAttribute("href") ?? null)) return direct
  const url = getNativeReelUrl(video)
  if (!url) return null
  const article = video.closest("article")
  return (
    Array.from(
      article?.querySelectorAll<HTMLAnchorElement>("a[href]") ?? []
    ).find(
      (anchor) => toInstagramReelUrl(anchor.getAttribute("href")) === url
    ) ?? null
  )
}

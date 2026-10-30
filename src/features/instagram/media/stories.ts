import { isInstagramVideo } from "./video"

export type StoryMedia = HTMLVideoElement | HTMLImageElement
export const isStoryImage = (media: StoryMedia): media is HTMLImageElement =>
  media.tagName === "IMG"

// Pick the central, visible Story media, excluding avatars, extension UI and
// adjacent Story previews. Works without React internals or account data.
export function getActiveStoryMedia(
  doc: Document = document
): StoryMedia | null {
  const win = doc.defaultView ?? window
  const candidates: { media: StoryMedia; score: number }[] = []
  for (const media of doc.querySelectorAll<StoryMedia>("video, img")) {
    if (media.closest('[data-bigv-controller], [aria-hidden="true"]')) continue
    const rect = media.getBoundingClientRect()
    if (
      rect.width < 140 ||
      rect.height < 120 ||
      rect.bottom <= 0 ||
      rect.right <= 0 ||
      rect.top >= win.innerHeight ||
      rect.left >= win.innerWidth
    )
      continue
    let visible = true
    for (
      let node: HTMLElement | null = media;
      node;
      node = node.parentElement
    ) {
      const style = win.getComputedStyle(node)
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        style.opacity === "0"
      ) {
        visible = false
        break
      }
    }
    if (!visible) continue
    if (isStoryImage(media)) {
      try {
        const url = new URL(media.currentSrc || media.src)
        if (
          url.protocol !== "blob:" &&
          !(
            url.protocol === "https:" &&
            /(^|\.)(instagram\.com|cdninstagram\.com|fbcdn\.net)$/.test(
              url.hostname
            )
          )
        )
          continue
      } catch {
        continue
      }
    } else if (!isInstagramVideo(media)) continue
    const width = Math.min(rect.right, win.innerWidth) - Math.max(rect.left, 0)
    const height =
      Math.min(rect.bottom, win.innerHeight) - Math.max(rect.top, 0)
    const distance =
      Math.abs(rect.left + rect.width / 2 - win.innerWidth / 2) +
      Math.abs(rect.top + rect.height / 2 - win.innerHeight / 2)
    candidates.push({
      media,
      score:
        (width * height) / (rect.width * rect.height) -
        distance / (win.innerWidth + win.innerHeight)
    })
  }
  const center =
    doc.elementsFromPoint?.(win.innerWidth / 2, win.innerHeight / 2) ?? []
  const topmost = center.find((element) =>
    candidates.some(({ media }) => media === element)
  )
  return (
    (topmost as StoryMedia | undefined) ??
    candidates.sort((a, b) => b.score - a.score)[0]?.media ??
    null
  )
}

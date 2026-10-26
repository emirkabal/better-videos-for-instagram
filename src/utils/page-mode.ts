export type PageMode = "global" | "reels" | "stories"

export function getPageMode(pathname: string): PageMode {
  const section = pathname.split("/").filter(Boolean)[0]
  if (section === "reel" || section === "reels") return "reels"
  if (section === "stories") return "stories"
  return "global"
}

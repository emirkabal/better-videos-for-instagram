import DownloadIcon from "../../icons/download.svg?react"
import LoaderIcon from "../../icons/loader.svg?react"

import "./style.css"

import { useMemo, useState } from "react"

import { Variant, type DownloadableMedia } from "@/features/player/Injector"
import { IG_APP_ID_REGEX } from "@/utils/constants"
import { idToPk } from "@/features/instagram/media/shortcode"

export default function DownloadButton({
  data,
  inside = false,
  label = true
}: {
  data: DownloadableMedia
  inside?: boolean
  label?: boolean
}) {
  const [pending, setPending] = useState(false)

  const download = async () => {
    setPending(true)

    try {
      const appId = document.body.innerHTML.match(IG_APP_ID_REGEX)?.[1]
      const shortcode =
        data.variant === Variant.Reels
          ? location.pathname.split("/")[2]
          : data.id
      if (!appId || !shortcode) return
      const videoId = idToPk(shortcode)

      const result = await fetch(
        `https://www.instagram.com/api/v1/media/${videoId}/info/`,
        {
          headers: {
            "x-ig-app-id": appId
          },
          credentials: "include"
        }
      )
      const body = await result.json()

      const index = data.index ? data.index - 1 : 0

      const videoUrl =
        body.items?.[0]?.video_versions?.[0]?.url ||
        body.items?.[0]?.carousel_media?.[index]?.video_versions?.[0]?.url

      const blob = await fetch(videoUrl).then((r) => r.blob())
      const urlBlob = URL.createObjectURL(blob)

      const a = document.createElement("a")
      a.href = urlBlob
      a.download = data.index
        ? `${videoId}_${data.index}.mp4`
        : `${videoId}.mp4`
      a.click()

      URL.revokeObjectURL(urlBlob)
    } catch (error) {
      console.error("Error downloading video", error)
    } finally {
      setPending(false)
    }
  }

  return (
    <div
      role="button"
      onClick={download}
      className={inside ? "bigv-inside-download" : ""}>
      {pending ? (
        <LoaderIcon className="bigv-loading" aria-label="Loading" />
      ) : (
        <DownloadIcon aria-label="Download" />
      )}

      {label && (
        <label htmlFor="download">
          {chrome.i18n.getMessage("downloadLabel")}
        </label>
      )}
    </div>
  )
}

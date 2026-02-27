import type { DownloadableMedia } from "~modules/Injector"

import Autoskip from "./Controller/Buttons/Autoskip"
import PlaybackSpeed from "./Controller/Buttons/PlaybackSpeed"
// import DownloadButton from "./Controller/Buttons/Download"

import "./Controller/style.css"

export default function Buttons({
  ctx
}: {
  ctx: {
    download?: DownloadableMedia
  }
}) {
  return (
    <>
      <PlaybackSpeed />
      <Autoskip />
      {/* {ctx.download && <DownloadButton data={ctx.download} />} */}
    </>
  )
}

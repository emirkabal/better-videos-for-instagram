import type { DownloadableMedia } from "~modules/Injector"

import Autoskip from "./Controller/Buttons/Autoskip"
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
      <Autoskip />
      {/* {ctx.download && <DownloadButton data={ctx.download} />} */}
    </>
  )
}

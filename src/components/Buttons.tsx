// import DownloadButton from "./Controller/Buttons/Download"

import { Variant } from "~modules/Injector"

import Autoskip from "./Controller/Buttons/Autoskip"
import FullscreenButton from "./Controller/Buttons/Fullscreen"
import PlaybackSpeed from "./Controller/Buttons/PlaybackSpeed"

import "./Controller/style.css"

export default function Buttons({ controllerId }: { controllerId: string }) {
  return (
    <>
      <PlaybackSpeed />
      <Autoskip />
      <FullscreenButton
        controllerId={controllerId}
        placement="controls"
        variant={Variant.Reels}
      />
    </>
  )
}

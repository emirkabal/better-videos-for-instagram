// import DownloadButton from "./Controller/Buttons/Download"

import { Variant } from "@/features/player/Injector"

import Autoskip from "./Controller/Buttons/Autoskip"
import FullscreenButton from "./Controller/Buttons/Fullscreen"
import PictureInPictureButton from "./Controller/Buttons/PictureInPicture"
import PlaybackSpeed from "./Controller/Buttons/PlaybackSpeed"

import "./Controller/style.css"

export default function Buttons({
  controllerId,
  video
}: {
  controllerId: string
  video: HTMLVideoElement
}) {
  return (
    <>
      <Autoskip />
      <PlaybackSpeed />
      <PictureInPictureButton
        video={video}
        followReels
        placement="controls"
        showLabel={false}
      />
      <FullscreenButton
        controllerId={controllerId}
        placement="controls"
        showLabel={false}
        variant={Variant.Reels}
      />
    </>
  )
}

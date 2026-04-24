import "./style.css"

import VolumeMutedIcon from "react:../../icons/volume-off.svg"
import VolumeIcon from "react:../../icons/volume.svg"

type Props = {
  muted: boolean
  onChange: (muted: boolean) => void
}

export default function VolumeButton({ muted, onChange }: Props) {
  return (
    <div
      className="better-ig-volume-button bigv-control"
      onClick={() => {
        onChange(!muted)
      }}>
      {muted ? <VolumeMutedIcon /> : <VolumeIcon />}
    </div>
  )
}

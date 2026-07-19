import "./style.css"

import VolumeMutedIcon from "react:../../icons/volume-off.svg"
import VolumeIcon from "react:../../icons/volume.svg"

type Props = {
  muted: boolean
  onChange: (muted: boolean) => void
}

export default function VolumeButton({ muted, onChange }: Props) {
  return (
    <button
      type="button"
      className="better-ig-volume-button bigv-control"
      aria-label={muted ? "Unmute" : "Mute"}
      aria-pressed={muted}
      title={muted ? "Unmute" : "Mute"}
      onClick={(event) => {
        event.stopPropagation()
        onChange(!muted)
      }}>
      {muted ? <VolumeMutedIcon /> : <VolumeIcon />}
    </button>
  )
}

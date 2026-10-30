import "./style.css"

import VolumeMutedIcon from "../../icons/volume-off.svg?react"
import VolumeIcon from "../../icons/volume.svg?react"

import { t } from "@/utils/i18n"

type Props = {
  muted: boolean
  onChange: (muted: boolean) => void
}

export default function VolumeButton({ muted, onChange }: Props) {
  return (
    <button
      type="button"
      className="better-ig-volume-button bigv-control"
      aria-label={t(muted ? "unmuteLabel" : "muteLabel")}
      aria-pressed={muted}
      title={t(muted ? "unmuteLabel" : "muteLabel")}
      onClick={(event) => {
        event.stopPropagation()
        onChange(!muted)
      }}>
      {muted ? <VolumeMutedIcon /> : <VolumeIcon />}
    </button>
  )
}

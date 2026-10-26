import cn from "classnames"
import type { ReactNode } from "react"

import { usePlayerControls } from "~hooks/use-player-controls"
import { Variant } from "~modules/Injector"
import { t } from "~utils/i18n"

export default function PlayerControls({
  video,
  variant,
  children
}: {
  video: HTMLVideoElement
  variant?: Variant
  children: ReactNode
}) {
  const { controlsRef, visible, compact } = usePlayerControls(video)
  return (
    <div
      ref={controlsRef}
      className={cn("bigv-player-dock bigv-control", variant, {
        "is-visible": visible,
        "is-compact": compact,
        "is-persistent":
          variant === Variant.Reels || variant === Variant.Stories
      })}
      role="group"
      aria-label={t("videoControlsLabel")}
      onClick={(event) => event.stopPropagation()}>
      {children}
    </div>
  )
}

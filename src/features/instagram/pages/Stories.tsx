import { createRoot, type Root } from "react-dom/client"
import ImageControls from "@/components/Controller/StoryControls/ImageControls"
import {
  getActiveStoryMedia,
  isStoryImage,
  type StoryMedia
} from "@/features/instagram/media/stories"
import {
  getVideoContainer,
  positionVideoContainer
} from "@/utils/media/container"
import { pictureInPicture } from "@/utils/pip/controller"

import { Variant } from "../../player/Injector"
import IntervalInjector, {
  type IntervalInjectorOptions
} from "../../player/IntervalInjector"

export default class Stories extends IntervalInjector {
  private activeMedia: StoryMedia | null = null
  private photo: {
    image: HTMLImageElement
    host: HTMLElement
    root: Root
    restore: () => void
  } | null = null
  constructor(options?: IntervalInjectorOptions) {
    super({ ...options, variant: Variant.Stories })
  }
  protected override shouldInjectVideo(video: HTMLVideoElement): boolean {
    return this.activeMedia === video
  }
  override get count() {
    return super.count + (this.photo ? 1 : 0)
  }
  private removePhoto() {
    if (!this.photo) return
    try {
      this.photo.root.unmount()
    } catch {
      /* Instagram may replace the tree. */
    }
    this.photo.host.remove()
    this.photo.restore()
    this.photo = null
  }
  public override beforeDelete() {
    this.removePhoto()
    this.activeMedia = null
  }
  public override injectMethod() {
    const media = getActiveStoryMedia()
    if (
      this.activeMedia &&
      this.activeMedia !== media &&
      !isStoryImage(this.activeMedia)
    ) {
      this.activeMedia.removeAttribute("data-bigv-fullscreen-source")
      this.activeMedia.removeAttribute("data-bigv-fullscreen-playing")
    }
    this.activeMedia = media
    pictureInPicture.followStory(media)
    if (!media || !isStoryImage(media)) {
      this.removePhoto()
      super.injectMethod()
      return
    }
    this.clearInjected()
    const parent = getVideoContainer(media)
    if (!parent) return
    if (
      this.photo &&
      (this.photo.image !== media ||
        !this.photo.host.isConnected ||
        this.photo.host.parentElement !== parent ||
        !this.photo.host.querySelector(".bigv-story-player"))
    )
      this.removePhoto()
    if (!this.photo) {
      const host = document.createElement("div")
      host.id = crypto.randomUUID()
      host.className = "bigv-controller-host"
      host.setAttribute("bigv-inject", "")
      host.setAttribute("data-bigv-controller", "")
      const restore = positionVideoContainer(parent)
      host.addEventListener("click", (event) => {
        event.preventDefault()
        event.stopPropagation()
      })
      parent.append(host)
      this.photo = { image: media, host, root: createRoot(host), restore }
    }
    this.photo.root.render(
      <ImageControls image={media} id={this.photo.host.id} />
    )
  }
}

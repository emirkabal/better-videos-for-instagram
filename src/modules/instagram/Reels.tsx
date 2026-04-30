import { unmountComponentAtNode } from "react-dom"
import { createRoot, type Root } from "react-dom/client"

import { Storage } from "@plasmohq/storage"

import Buttons from "~components/Buttons"
import {
  IG_NEW_VOLUME_INDICATOR,
  IG_REELS_VOLUME_INDICATOR
} from "~utils/constants"

import { Variant, type InjectedProps } from "../Injector"
import IntervalInjector, {
  type IntervalInjectorOptions
} from "../IntervalInjector"

export default class Reels extends IntervalInjector {
  private commentsInterval: NodeJS.Timeout | null = null
  private pauseOnComments = true
  private list: [Root, HTMLElement, HTMLElement][] = []

  constructor(options?: IntervalInjectorOptions) {
    super({
      ...options,
      variant: Variant.Reels
    })

    this.loadState()
  }

  public async loadState() {
    const storage = new Storage()
    this.pauseOnComments = (await storage.get("bigv-pause-on-comments")) ?? true
    storage.watch({
      "bigv-pause-on-comments": (c) => {
        this.pauseOnComments = c.newValue
      }
    })
  }

  public beforeInject(): void {
    this.removeElements(IG_REELS_VOLUME_INDICATOR, true)
    this.removeElements(IG_NEW_VOLUME_INDICATOR, false)
  }

  public beforeDelete(): void {
    if (this.commentsInterval) {
      clearInterval(this.commentsInterval)
      this.commentsInterval = null
    }

    for (const [root, container] of this.list) {
      root.unmount()
      container.remove()
    }
  }

  public onDelete(id: string): void {
    const index = this.list.findIndex(
      ([_, __, controller]) => controller.id === id
    )
    if (index !== -1) {
      const [root, container] = this.list[index]
      root.unmount()
      container.remove()
      this.list.splice(index, 1)
    }
  }

  public injected(props: InjectedProps): void {
    if (!this.lastInjected) return

    let el = this.lastInjected[1]
    while (
      el &&
      !(
        el.lastElementChild &&
        !el.lastElementChild.hasAttribute("style") &&
        el.lastElementChild.classList.contains("html-div")
      )
    ) {
      el = el.parentElement
    }

    const target = el?.lastElementChild
    if (!target) return

    const buttons = document.createElement("div")
    buttons.setAttribute("bigv-inject", "")
    buttons.classList.add("bigv-buttons")
    target.insertAdjacentElement("afterbegin", buttons)

    const root = createRoot(buttons)

    root.render(
      <Buttons ctx={{ download: props.downloadableMedia ?? undefined }} />
    )

    this.list.push([root, buttons, this.lastInjected[2]])

    if (this.commentsInterval) clearInterval(this.commentsInterval)

    this.commentsInterval = setInterval(() => {
      if (!this.pauseOnComments) return

      const commentsDialog = document.querySelector("div[role='dialog']")
      if (commentsDialog) {
        localStorage.setItem("bigv-comments-opened", "1")
      } else {
        localStorage.removeItem("bigv-comments-opened")
      }
    }, 750)
  }
}

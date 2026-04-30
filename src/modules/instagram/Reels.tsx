import { createRoot, type Root } from "react-dom/client"

import { Storage } from "@plasmohq/storage"

import Buttons from "~components/Buttons"
import QuickShareOverlay, {
  getQuickSharePosition,
  QUICK_SHARE_CENTER_RADIUS,
  QUICK_SHARE_ITEM_RADIUS,
  type QuickShareAnchor,
  type QuickShareContact
} from "~components/Controller/Buttons/QuickShare"
import {
  IG_NEW_VOLUME_INDICATOR,
  IG_REELS_VOLUME_INDICATOR
} from "~utils/constants"

import { Variant, type InjectedProps } from "../Injector"
import IntervalInjector, {
  type IntervalInjectorOptions
} from "../IntervalInjector"

interface QuickShareState {
  anchor: QuickShareAnchor
  contacts: QuickShareContact[]
  highlightedId: string | null
  isActive: boolean
  isLoading: boolean
  pointerId: number
  sendingId: string | null
  statusText?: string
}

interface DirectInboxResponse {
  inbox?: {
    threads?: DirectThread[]
  }
}

interface DirectThread {
  thread_id?: string
  thread_title?: string
  users?: DirectUser[]
}

interface DirectUser {
  full_name?: string
  pk?: string | number
  profile_pic_url?: string
  username?: string
}

const HOLD_TO_SHARE_MS = 260
const QUICK_SHARE_CANCEL_ID = "__cancel"
const QUICK_SHARE_DEBUG = true
const QUICK_SHARE_CACHE_MS = 45_000

export default class Reels extends IntervalInjector {
  private commentsInterval: NodeJS.Timeout | null = null
  private pauseOnComments = true
  private list: [Root, HTMLElement, HTMLElement][] = []
  private quickShareContainer: HTMLDivElement | null = null
  private quickShareHoldTimer: NodeJS.Timeout | null = null
  private quickShareListenersAttached = false
  private quickShareRoot: Root | null = null
  private quickShareState: QuickShareState | null = null
  private recentDirectContacts: QuickShareContact[] = []
  private recentDirectContactsFetchedAt = 0
  private recentDirectContactsPromise: Promise<QuickShareContact[]> | null =
    null
  private suppressClickUntil = 0
  private urlWatchInterval: NodeJS.Timeout | null = null

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

    this.detachQuickShareListeners()
    this.closeQuickShare()

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

  public wayToInject(): void {
    super.wayToInject()
    this.attachQuickShareListeners()
  }

  public deleted(): void {
    super.deleted()
    this.detachQuickShareListeners()
    this.closeQuickShare()
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

  private attachQuickShareListeners() {
    if (this.quickShareListenersAttached) return

    document.addEventListener("pointerdown", this.onQuickSharePointerDown, true)
    document.addEventListener("pointermove", this.onQuickSharePointerMove, true)
    document.addEventListener("pointerup", this.onQuickSharePointerEnd, true)
    document.addEventListener(
      "pointercancel",
      this.onQuickSharePointerEnd,
      true
    )
    document.addEventListener("click", this.onQuickShareClick, true)
    this.urlWatchInterval = setInterval(this.syncQuickShareRoute, 500)
    this.quickShareListenersAttached = true
    void this.preloadDirectContacts()
  }

  private detachQuickShareListeners() {
    if (!this.quickShareListenersAttached) return

    document.removeEventListener(
      "pointerdown",
      this.onQuickSharePointerDown,
      true
    )
    document.removeEventListener(
      "pointermove",
      this.onQuickSharePointerMove,
      true
    )
    document.removeEventListener("pointerup", this.onQuickSharePointerEnd, true)
    document.removeEventListener(
      "pointercancel",
      this.onQuickSharePointerEnd,
      true
    )
    document.removeEventListener("click", this.onQuickShareClick, true)
    if (this.urlWatchInterval) {
      clearInterval(this.urlWatchInterval)
      this.urlWatchInterval = null
    }
    this.quickShareListenersAttached = false
  }

  private syncQuickShareRoute = () => {
    if (/\/(reel|reels)\//i.test(location.pathname)) return

    this.detachQuickShareListeners()
    this.closeQuickShare()
  }

  private onQuickSharePointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || !event.isPrimary || this.quickShareState) return

    const button = this.findShareButton(event.target)
    if (!button) return

    const anchor = this.getElementCenter(button)
    this.quickShareState = {
      anchor,
      contacts: this.getFreshCachedContacts(),
      highlightedId: QUICK_SHARE_CANCEL_ID,
      isActive: false,
      isLoading: this.getFreshCachedContacts().length === 0,
      pointerId: event.pointerId,
      sendingId: null,
      statusText: undefined
    }

    this.quickShareHoldTimer = setTimeout(() => {
      void this.activateQuickShare()
    }, HOLD_TO_SHARE_MS)
  }

  private onQuickSharePointerMove = (event: PointerEvent) => {
    const state = this.quickShareState
    if (!state || state.pointerId !== event.pointerId || !state.isActive) return

    event.preventDefault()
    event.stopPropagation()
    this.updateQuickShareHighlight(event.clientX, event.clientY)
  }

  private onQuickSharePointerEnd = (event: PointerEvent) => {
    const state = this.quickShareState
    if (!state || state.pointerId !== event.pointerId) return

    this.clearQuickShareHoldTimer()

    if (!state.isActive) {
      this.quickShareState = null
      return
    }

    event.preventDefault()
    event.stopPropagation()
    this.suppressClickUntil = Date.now() + 700

    const selectedContact = state.contacts.find(
      (contact) => contact.id === state.highlightedId
    )

    if (selectedContact) {
      void this.sendQuickShare(selectedContact)
      return
    }

    this.closeQuickShare(true)
  }

  private onQuickShareClick = (event: MouseEvent) => {
    if (Date.now() > this.suppressClickUntil) return

    event.preventDefault()
    event.stopPropagation()
  }

  private async activateQuickShare() {
    const state = this.quickShareState
    if (!state || state.isActive) return

    const startedAt = performance.now()
    state.isActive = true
    state.isLoading = state.contacts.length === 0
    state.statusText = undefined
    this.suppressClickUntil = Date.now() + 900
    this.renderQuickShare()
    this.debugQuickShare("activate:start", {
      cachedCount: state.contacts.length
    })

    if (state.contacts.length === 0) {
      state.contacts = await this.preloadDirectContacts()
      this.debugQuickShare("activate:loaded-contacts", {
        count: state.contacts.length,
        elapsedMs: Math.round(performance.now() - startedAt),
        names: state.contacts.map((contact) => contact.username || contact.name)
      })
    }

    if (state.contacts.length === 0) {
      state.statusText = "Sohbet bulunamadı"
    }

    if (!this.quickShareState || this.quickShareState !== state) return

    state.isLoading = false
    this.renderQuickShare()
    this.debugQuickShare("activate:ready", {
      count: state.contacts.length,
      elapsedMs: Math.round(performance.now() - startedAt)
    })
  }

  private renderQuickShare() {
    const state = this.quickShareState
    if (!state?.isActive) return

    if (!this.quickShareContainer) {
      this.quickShareContainer = document.createElement("div")
      this.quickShareContainer.setAttribute("bigv-inject", "")
      document.body.appendChild(this.quickShareContainer)
      this.quickShareRoot = createRoot(this.quickShareContainer)
    }

    this.quickShareRoot?.render(
      <QuickShareOverlay
        anchor={state.anchor}
        contacts={state.contacts}
        highlightedId={state.highlightedId}
        isLoading={state.isLoading}
        statusText={state.statusText}
        sendingId={state.sendingId}
      />
    )
  }

  private updateQuickShareHighlight(x: number, y: number) {
    const state = this.quickShareState
    if (!state) return

    let highlightedId: string | null = null
    let shortestDistance = Number.POSITIVE_INFINITY

    const cancelDistance = this.distance(x, y, state.anchor.x, state.anchor.y)
    if (cancelDistance <= QUICK_SHARE_CENTER_RADIUS) {
      highlightedId = QUICK_SHARE_CANCEL_ID
      shortestDistance = cancelDistance
    }

    for (let index = 0; index < state.contacts.length; index++) {
      const contact = state.contacts[index]
      const position = getQuickSharePosition(
        index,
        state.contacts.length,
        state.anchor
      )
      const contactDistance = this.distance(x, y, position.x, position.y)

      if (
        contactDistance <= QUICK_SHARE_ITEM_RADIUS + 12 &&
        contactDistance < shortestDistance
      ) {
        highlightedId = contact.id
        shortestDistance = contactDistance
      }
    }

    if (state.highlightedId !== highlightedId) {
      state.highlightedId = highlightedId
      this.renderQuickShare()
    }
  }

  private async sendQuickShare(contact: QuickShareContact) {
    const state = this.quickShareState
    if (!state || state.sendingId) return

    this.debugQuickShare("send:start", {
      name: contact.name,
      threadId: contact.threadId,
      username: contact.username
    })

    this.closeQuickShare(false)

    void this.sendDirectLink(contact).then((sent) => {
      this.debugQuickShare("send:direct-link", { sent })
    })
  }

  private closeQuickShare(closeDialog = false) {
    this.clearQuickShareHoldTimer()

    void closeDialog

    this.quickShareRoot?.unmount()
    this.quickShareRoot = null
    this.quickShareContainer?.remove()
    this.quickShareContainer = null
    this.quickShareState = null
  }

  private clearQuickShareHoldTimer() {
    if (!this.quickShareHoldTimer) return
    clearTimeout(this.quickShareHoldTimer)
    this.quickShareHoldTimer = null
  }

  private findShareButton(target: EventTarget | null) {
    if (!(target instanceof Element)) return null
    if (target.closest("[bigv-inject], .bigv-quick-share-overlay")) return null

    const control = target.closest(
      "button, div[role='button'], a[role='button'], svg"
    )
    const button = control?.closest<HTMLElement>(
      "button, div[role='button'], a[role='button']"
    )
    if (!button || !/\/(reel|reels)\//i.test(location.pathname)) return null

    const buttonSiblingsText = Array.from(button.parentElement?.children ?? [])
      .map((element) => element.textContent?.trim() ?? "")
      .join(" ")

    const label = [
      button.getAttribute("aria-label"),
      button.querySelector("svg[aria-label]")?.getAttribute("aria-label"),
      button.querySelector("title")?.textContent,
      buttonSiblingsText,
      button.textContent
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase()

    if (/(share|send|paylaş|gönder)/i.test(label)) return button

    if (this.looksLikeReelsShareButton(button)) return button

    return null
  }

  private looksLikeReelsShareButton(button: HTMLElement) {
    const rect = button.getBoundingClientRect()
    if (
      !this.isVisible(button) ||
      !button.querySelector("svg") ||
      rect.left < window.innerWidth * 0.52 ||
      rect.width < 18 ||
      rect.width > 110 ||
      rect.height < 18 ||
      rect.height > 110
    ) {
      return false
    }

    const actionButtons = Array.from(
      document.querySelectorAll<HTMLElement>(
        "button, div[role='button'], a[role='button']"
      )
    )
      .filter((candidate) => {
        const candidateRect = candidate.getBoundingClientRect()
        return (
          this.isVisible(candidate) &&
          Boolean(candidate.querySelector("svg")) &&
          candidateRect.left > window.innerWidth * 0.52 &&
          candidateRect.width >= 18 &&
          candidateRect.width <= 110 &&
          candidateRect.height >= 18 &&
          candidateRect.height <= 110
        )
      })
      .sort(
        (first, second) =>
          first.getBoundingClientRect().top - second.getBoundingClientRect().top
      )

    const index = actionButtons.indexOf(button)
    return index >= 2 && index <= 5
  }

  public ensureQuickShareReady() {
    this.attachQuickShareListeners()
  }

  private getElementCenter(element: HTMLElement): QuickShareAnchor {
    const rect = element.getBoundingClientRect()
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    }
  }

  private getFreshCachedContacts() {
    if (
      Date.now() - this.recentDirectContactsFetchedAt >
      QUICK_SHARE_CACHE_MS
    ) {
      return []
    }

    return this.recentDirectContacts
  }

  private async preloadDirectContacts() {
    const freshContacts = this.getFreshCachedContacts()
    if (freshContacts.length > 0) return freshContacts

    if (!this.recentDirectContactsPromise) {
      this.recentDirectContactsPromise =
        this.fetchRecentDirectContacts().finally(() => {
          this.recentDirectContactsPromise = null
        })
    }

    const contacts = await this.recentDirectContactsPromise
    this.recentDirectContacts = contacts
    this.recentDirectContactsFetchedAt = Date.now()
    return contacts
  }

  private async fetchRecentDirectContacts(): Promise<QuickShareContact[]> {
    try {
      const data = await this.fetchInstagramJson<DirectInboxResponse>([
        `${location.origin}/api/v1/direct_v2/inbox/?persistentBadging=true&folder=&limit=20`,
        `${location.origin}/api/v1/direct_v2/inbox/?visual_message_return_type=unseen&thread_message_limit=10&persistentBadging=true&limit=20`
      ])
      if (!data) return []

      const threads = data.inbox?.threads ?? []
      this.debugQuickShare("inbox:threads", { count: threads.length })
      const contacts: QuickShareContact[] = []

      for (const thread of threads) {
        if (contacts.length >= 6) break

        const users = thread.users ?? []
        const primaryUser = users[0]
        const name =
          thread.thread_title?.trim() ||
          primaryUser?.full_name?.trim() ||
          primaryUser?.username?.trim() ||
          "Sohbet"

        contacts.push({
          id: thread.thread_id ?? `${name}-${contacts.length}`,
          name,
          avatar: primaryUser?.profile_pic_url,
          threadId: thread.thread_id,
          username: primaryUser?.username,
          userIds: users
            .map((user) => user.pk?.toString())
            .filter((userId): userId is string => Boolean(userId))
        })
      }

      return contacts
    } catch {
      return []
    }
  }

  private async sendDirectLink(contact: QuickShareContact) {
    if (!contact.threadId && !contact.userIds?.length) return false

    const clientContext = this.generateDirectClientContext()
    const reelUrl = this.getCanonicalReelUrl()
    const body = new URLSearchParams({
      action: "send_item",
      client_context: clientContext,
      link_text: reelUrl,
      mutation_token: clientContext,
      offline_threading_id: clientContext
    })

    body.set("link_urls", JSON.stringify([reelUrl]))
    if (contact.threadId)
      body.set("thread_ids", JSON.stringify([contact.threadId]))
    if (contact.userIds?.length) {
      body.set("recipient_users", JSON.stringify([contact.userIds]))
    }

    const response = await fetch(
      `${location.origin}/api/v1/direct_v2/threads/broadcast/link/`,
      {
        body,
        credentials: "include",
        headers: {
          ...this.getInstagramHeaders(),
          "content-type": "application/x-www-form-urlencoded"
        },
        method: "POST"
      }
    )

    this.debugQuickShare("send:fetch", {
      ok: response.ok,
      status: response.status
    })

    return response.ok
  }

  private getCanonicalReelUrl() {
    const match = location.pathname.match(/\/(?:reel|reels)\/([^/?#]+)/i)
    if (!match?.[1]) return location.href.split(/[?#]/)[0]

    return `${location.origin}/reel/${match[1]}/`
  }

  private generateDirectClientContext() {
    const timestamp = Date.now().toString()
    const random = Math.floor(Math.random() * 1_000_000_000).toString()
    return `${timestamp}${random}`
  }

  private async fetchInstagramJson<T>(urls: string[]) {
    const headers = this.getInstagramHeaders()

    for (const url of urls) {
      const response = await fetch(url, {
        credentials: "include",
        headers
      })
      this.debugQuickShare("fetch", {
        ok: response.ok,
        status: response.status,
        url: url.replace(location.origin, "")
      })

      if (response.ok) return (await response.json()) as T
    }

    return null
  }

  private getInstagramHeaders() {
    return {
      accept: "application/json",
      "x-asbd-id": "129477",
      "x-csrftoken": this.getCookie("csrftoken"),
      "x-ig-app-id": "936619743392459",
      "x-ig-www-claim": this.getCookie("ig_www_claim"),
      "x-requested-with": "XMLHttpRequest"
    }
  }

  private getCookie(name: string) {
    return (
      document.cookie
        .split("; ")
        .find((cookie) => cookie.startsWith(`${name}=`))
        ?.split("=")[1] ?? ""
    )
  }

  private isVisible(element: HTMLElement) {
    const rect = element.getBoundingClientRect()
    const style = window.getComputedStyle(element)
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== "hidden" &&
      style.display !== "none"
    )
  }

  private distance(x1: number, y1: number, x2: number, y2: number) {
    return Math.hypot(x1 - x2, y1 - y2)
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private debugQuickShare(event: string, payload?: Record<string, unknown>) {
    if (!QUICK_SHARE_DEBUG) return

    console.debug(`[bigv:quick-share] ${event}`, payload ?? {})
  }
}

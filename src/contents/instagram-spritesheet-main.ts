import type { PlasmoCSConfig } from "plasmo"

import { idToPk } from "~utils/functions"
import {
  INSTAGRAM_SPRITESHEET_CHANNEL,
  type InstagramSpritesheet,
  type SpritesheetIncomingMessage
} from "~utils/instagram-spritesheet-bridge"

export const config: PlasmoCSConfig = {
  matches: ["https://www.instagram.com/*"],
  run_at: "document_start",
  world: "MAIN"
}

const INSTALL_KEY = Symbol.for(
  "better-instagram-videos.spritesheet-api-bridge-installed"
)
const SPRITESHEET_DOC_ID = "26425898630423344"
const SPRITESHEET_QUERY_NAME = "PolarisClipsProgressBarSpritesheetQuery"
const GRAPHQL_PATH = "/api/graphql"

type UnknownRecord = Record<string, unknown>

const bridgeWindow = window as typeof window & {
  [key: symbol]: unknown
}

if (!bridgeWindow[INSTALL_KEY]) {
  bridgeWindow[INSTALL_KEY] = true
  installSpritesheetApiBridge()
}

function installSpritesheetApiBridge() {
  const nativeFetch = window.fetch.bind(window)
  const mediaIdRequests = new Map<string, Promise<string | null>>()
  const spritesheetRequests = new Map<
    string,
    Promise<InstagramSpritesheet | null>
  >()
  const mediaIdsByShortcode = new Map<string, string>()
  const mediaIdsByAsset = new Map<string, string>()
  const capturedHeaders = new Headers()
  const reportedUnresolvedSources = new WeakMap<HTMLVideoElement, string>()
  const xhrMetadata = new WeakMap<
    XMLHttpRequest,
    { headers: Headers; method: string; url: string }
  >()
  let graphqlTemplate: URLSearchParams | null = null

  function asRecord(value: unknown): UnknownRecord | null {
    return value !== null && typeof value === "object"
      ? (value as UnknownRecord)
      : null
  }

  function captureHeaders(headers: Headers) {
    for (const name of [
      "x-asbd-id",
      "x-csrftoken",
      "x-fb-lsd",
      "x-ig-app-id"
    ]) {
      const value = headers.get(name)
      if (value) capturedHeaders.set(name, value)
    }
  }

  function getAssetKey(value: string) {
    try {
      const url = new URL(value, window.location.href)

      return /(?:cdninstagram\.com|fbcdn\.net)$/i.test(url.hostname)
        ? url.pathname
        : null
    } catch {
      return null
    }
  }

  function indexInstagramResponse(value: unknown) {
    const queue: Array<{ mediaId: string | null; value: unknown }> = [
      { mediaId: null, value }
    ]
    const visited = new WeakSet<object>()
    let inspectedNodes = 0

    while (queue.length > 0 && inspectedNodes < 50000) {
      const entry = queue.shift()
      if (!entry || entry.value === null || typeof entry.value !== "object") {
        continue
      }
      if (visited.has(entry.value)) continue

      visited.add(entry.value)
      inspectedNodes += 1

      const record = asRecord(entry.value)
      if (!record) continue

      const recordId = record.id
      const recordPk = record.pk
      const recordUser = asRecord(record.user)
      const recordOwner = asRecord(record.owner)
      const ownerPk =
        recordUser?.pk ?? recordUser?.id ?? recordOwner?.pk ?? recordOwner?.id
      const compositeMediaId =
        (typeof recordPk === "string" || typeof recordPk === "number") &&
        (typeof ownerPk === "string" || typeof ownerPk === "number")
          ? `${recordPk}_${ownerPk}`
          : null
      const mediaId =
        typeof recordId === "string" && /^\d+_\d+$/.test(recordId)
          ? recordId
          : compositeMediaId
            ? compositeMediaId
            : entry.mediaId
      const shortcode =
        typeof record.code === "string"
          ? record.code
          : typeof record.shortcode === "string"
            ? record.shortcode
            : null

      if (mediaId && shortcode) mediaIdsByShortcode.set(shortcode, mediaId)

      for (const child of Object.values(record)) {
        if (typeof child === "string" && mediaId) {
          const assetKey = getAssetKey(child)
          if (assetKey) mediaIdsByAsset.set(assetKey, mediaId)
        } else if (child !== null && typeof child === "object") {
          queue.push({ mediaId, value: child })
        }
      }
    }
  }

  async function captureFetchResponse(response: Response) {
    try {
      const url = new URL(response.url, window.location.href)
      const contentType = response.headers.get("content-type") ?? ""

      if (
        url.origin !== window.location.origin ||
        (!contentType.includes("json") && !url.pathname.startsWith("/api/"))
      ) {
        return
      }

      indexInstagramResponse(await response.clone().json())
    } catch {}
  }

  async function captureFetchRequest(
    input: RequestInfo | URL,
    init?: RequestInit
  ) {
    try {
      const request = input instanceof Request ? input : null
      const url = new URL(request?.url ?? String(input), window.location.href)
      const headers = new Headers(request?.headers)

      if (init?.headers) {
        new Headers(init.headers).forEach((value, name) => {
          headers.set(name, value)
        })
      }

      captureHeaders(headers)

      if (
        url.origin !== window.location.origin ||
        url.pathname !== GRAPHQL_PATH
      ) {
        return
      }

      const body = init?.body ?? request?.body
      let bodyText = ""

      if (typeof body === "string") {
        bodyText = body
      } else if (body instanceof URLSearchParams) {
        bodyText = body.toString()
      } else if (request) {
        bodyText = await request.clone().text()
      }

      if (bodyText) graphqlTemplate = new URLSearchParams(bodyText)
    } catch {}
  }

  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    void captureFetchRequest(input, init)
    const response = nativeFetch(input, init)
    void response.then(captureFetchResponse)
    return response
  } as typeof window.fetch

  const nativeXhrOpen = XMLHttpRequest.prototype.open
  const nativeXhrSend = XMLHttpRequest.prototype.send
  const nativeXhrSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader

  XMLHttpRequest.prototype.open = function (
    method: string,
    url: string | URL,
    ...args: unknown[]
  ) {
    xhrMetadata.set(this, {
      headers: new Headers(),
      method: method.toUpperCase(),
      url: new URL(String(url), window.location.href).href
    })

    return Reflect.apply(nativeXhrOpen, this, [method, url, ...args])
  } as typeof XMLHttpRequest.prototype.open

  XMLHttpRequest.prototype.setRequestHeader = function (
    name: string,
    value: string
  ) {
    xhrMetadata.get(this)?.headers.set(name, value)
    return nativeXhrSetRequestHeader.call(this, name, value)
  }

  XMLHttpRequest.prototype.send = function (
    body?: Document | XMLHttpRequestBodyInit | null
  ) {
    const metadata = xhrMetadata.get(this)

    if (metadata) {
      captureHeaders(metadata.headers)

      const requestUrl = new URL(metadata.url)
      if (
        requestUrl.origin === window.location.origin &&
        requestUrl.pathname === GRAPHQL_PATH &&
        typeof body === "string"
      ) {
        graphqlTemplate = new URLSearchParams(body)
      }

      this.addEventListener(
        "load",
        () => {
          try {
            const responseUrl = new URL(this.responseURL || metadata.url)

            if (
              responseUrl.origin === window.location.origin &&
              (this.responseType === "" || this.responseType === "text") &&
              this.responseText
            ) {
              indexInstagramResponse(JSON.parse(this.responseText))
            }
          } catch {}
        },
        { once: true }
      )
    }

    return nativeXhrSend.call(this, body)
  }

  function readPageModule(name: string) {
    try {
      const moduleLoader = (window as unknown as UnknownRecord).require
      return typeof moduleLoader === "function"
        ? asRecord(moduleLoader.call(window, name))
        : null
    } catch {
      return null
    }
  }

  function getCookie(name: string) {
    const prefix = `${name}=`

    for (const part of document.cookie.split(";")) {
      const cookie = part.trim()
      if (cookie.startsWith(prefix)) {
        return decodeURIComponent(cookie.slice(prefix.length))
      }
    }

    return ""
  }

  function getInstagramAppId() {
    const capturedAppId = capturedHeaders.get("x-ig-app-id")
    if (capturedAppId) return capturedAppId

    for (const script of document.scripts) {
      const appId = script.textContent?.match(/"APP_ID":\s*"(\d+)"/i)?.[1]
      if (appId) return appId
    }

    const bodyAppId =
      document.body?.innerHTML.match(/"APP_ID":\s*"(\d+)"/i)?.[1]
    if (bodyAppId) return bodyAppId

    return ""
  }

  function getIndexedMediaId(video: HTMLVideoElement) {
    for (const source of [video.poster, video.src, video.currentSrc]) {
      const assetKey = source ? getAssetKey(source) : null
      const mediaId = assetKey ? mediaIdsByAsset.get(assetKey) : null
      if (mediaId) return mediaId
    }

    let root: HTMLElement | null = video

    for (let depth = 0; root && depth < 10; depth += 1) {
      for (const attribute of Array.from(root.attributes)) {
        const mediaId = attribute.value.match(
          /(?:^|\D)(\d{10,}_\d+)(?:\D|$)/
        )?.[1]
        if (mediaId) return mediaId
      }

      const mediaIdElements = Array.from(
        root.querySelectorAll<HTMLElement>("[data-media-id], [data-id]")
      )

      for (const element of mediaIdElements) {
        for (const attribute of Array.from(element.attributes)) {
          const mediaId = attribute.value.match(
            /(?:^|\D)(\d{10,}_\d+)(?:\D|$)/
          )?.[1]
          if (mediaId) return mediaId
        }
      }

      const images = Array.from(root.querySelectorAll<HTMLImageElement>("img"))

      for (const image of images) {
        const assetKey = getAssetKey(image.currentSrc || image.src)
        const mediaId = assetKey ? mediaIdsByAsset.get(assetKey) : null
        if (mediaId) return mediaId
      }

      root = root.parentElement
    }

    return null
  }

  function getReelShortcode(video: HTMLVideoElement) {
    const locationMatch = window.location.pathname.match(
      /^\/(?:reel|reels|p)\/([^/?#]+)/
    )
    if (locationMatch?.[1] && locationMatch[1] !== "audio") {
      return locationMatch[1]
    }

    const parseHref = (href: string) => {
      try {
        const url = new URL(href, window.location.href)
        if (url.origin !== window.location.origin) return null
        const shortcode = url.pathname.match(
          /^\/(?:reel|reels|p)\/([^/?#]+)/
        )?.[1]

        return shortcode && shortcode !== "audio" ? shortcode : null
      } catch {
        return null
      }
    }

    let root: HTMLElement | null = video

    for (let depth = 0; root && depth < 16; depth += 1) {
      if (root instanceof HTMLAnchorElement) {
        const shortcode = parseHref(root.href)
        if (shortcode) return shortcode
      }

      const links = Array.from(
        root.querySelectorAll<HTMLAnchorElement>(
          'a[href*="/reel/"], a[href*="/reels/"], a[href*="/p/"]'
        )
      )
      const candidates = links
        .map((link) => ({ link, shortcode: parseHref(link.href) }))
        .filter(
          (
            candidate
          ): candidate is { link: HTMLAnchorElement; shortcode: string } =>
            candidate.shortcode !== null
        )

      if (candidates.length > 0) {
        const videoRect = video.getBoundingClientRect()
        const videoCenterY = videoRect.top + videoRect.height / 2

        candidates.sort((left, right) => {
          const leftRect = left.link.getBoundingClientRect()
          const rightRect = right.link.getBoundingClientRect()
          const leftDistance = Math.abs(
            leftRect.top + leftRect.height / 2 - videoCenterY
          )
          const rightDistance = Math.abs(
            rightRect.top + rightRect.height / 2 - videoCenterY
          )
          return leftDistance - rightDistance
        })

        return candidates[0].shortcode
      }

      root = root.parentElement
    }

    return null
  }

  function getMediaId(shortcode: string) {
    const indexedMediaId = mediaIdsByShortcode.get(shortcode)
    if (indexedMediaId) return Promise.resolve(indexedMediaId)

    const cachedRequest = mediaIdRequests.get(shortcode)
    if (cachedRequest) return cachedRequest

    const request = (async () => {
      try {
        const mediaPk = idToPk(shortcode)
        const headers = new Headers()
        const appId = getInstagramAppId()
        const csrfToken =
          capturedHeaders.get("x-csrftoken") || getCookie("csrftoken")

        if (appId) headers.set("x-ig-app-id", appId)
        if (csrfToken) headers.set("x-csrftoken", csrfToken)
        headers.set("x-requested-with", "XMLHttpRequest")

        const response = await nativeFetch(
          `/api/v1/media/${encodeURIComponent(mediaPk)}/info/`,
          {
            credentials: "include",
            headers
          }
        )

        if (!response.ok) {
          console.warn(
            `[Better IG] Media info request failed (${response.status})`
          )
          return null
        }

        const body = asRecord(await response.json())
        const items = body?.items
        const item = Array.isArray(items) ? asRecord(items[0]) : null
        const id = item?.id

        if (typeof id === "string" && id) return id
        if (typeof id === "number") return String(id)

        const pk = item?.pk
        const user = asRecord(item?.user)
        const userPk = user?.pk

        return (typeof pk === "string" || typeof pk === "number") &&
          (typeof userPk === "string" || typeof userPk === "number")
          ? `${pk}_${userPk}`
          : null
      } catch {
        return null
      }
    })()

    mediaIdRequests.set(shortcode, request)
    void request.then((mediaId) => {
      if (mediaId) {
        mediaIdsByShortcode.set(shortcode, mediaId)
      } else if (mediaIdRequests.get(shortcode) === request) {
        mediaIdRequests.delete(shortcode)
      }
    })
    return request
  }

  function createGraphqlPayload(mediaId: string) {
    const payload = graphqlTemplate
      ? new URLSearchParams(graphqlTemplate)
      : new URLSearchParams()
    const lsdModule = readPageModule("LSD")
    const dtsgModule = readPageModule("DTSGInitialData")
    const currentUser = readPageModule("CurrentUserInitialData")
    const lsd =
      payload.get("lsd") ||
      (typeof lsdModule?.token === "string" ? lsdModule.token : "")
    const fbDtsg =
      payload.get("fb_dtsg") ||
      (typeof dtsgModule?.token === "string" ? dtsgModule.token : "")
    const userId =
      typeof currentUser?.USER_ID === "string" ? currentUser.USER_ID : "0"

    payload.set("__a", "1")
    payload.set("__d", "www")
    payload.set("__user", payload.get("__user") || "0")
    payload.set("__comet_req", payload.get("__comet_req") || "7")
    payload.set("av", payload.get("av") || userId)
    payload.set("fb_api_caller_class", "RelayModern")
    payload.set("fb_api_req_friendly_name", SPRITESHEET_QUERY_NAME)
    payload.set("server_timestamps", "true")
    payload.set("variables", JSON.stringify({ media_id: mediaId }))
    payload.set("doc_id", SPRITESHEET_DOC_ID)

    if (lsd) payload.set("lsd", lsd)

    if (fbDtsg) {
      payload.set("fb_dtsg", fbDtsg)

      if (!payload.has("jazoest")) {
        const sum = Array.from(fbDtsg).reduce(
          (total, character) => total + character.charCodeAt(0),
          0
        )
        payload.set("jazoest", `2${sum}`)
      }
    }

    return payload
  }

  function parseSpritesheet(
    body: unknown,
    requestedMediaId: string
  ): InstagramSpritesheet | null {
    const root = asRecord(body)
    const data = asRecord(root?.data)
    const media = asRecord(data?.fetch__XDTMediaDict)
    const imageVersions = asRecord(media?.image_versions2)
    const candidates = asRecord(
      imageVersions?.scrubber_spritesheet_info_candidates
    )
    const spritesheet = asRecord(candidates?.default)
    const maxThumbnailsPerSprite = spritesheet?.max_thumbnails_per_sprite
    const spriteUrls = spritesheet?.sprite_urls
    const thumbnailDuration = spritesheet?.thumbnail_duration
    const thumbnailsPerRow = spritesheet?.thumbnails_per_row
    const responseMediaId = media?.id

    if (
      typeof maxThumbnailsPerSprite !== "number" ||
      !Array.isArray(spriteUrls) ||
      !spriteUrls.every((url) => typeof url === "string" && url) ||
      typeof thumbnailDuration !== "number" ||
      typeof thumbnailsPerRow !== "number" ||
      maxThumbnailsPerSprite <= 0 ||
      thumbnailDuration <= 0 ||
      thumbnailsPerRow <= 0 ||
      spriteUrls.length === 0
    ) {
      return null
    }

    return {
      mediaId:
        typeof responseMediaId === "string"
          ? responseMediaId
          : requestedMediaId,
      maxThumbnailsPerSprite,
      spriteUrls,
      thumbnailDuration,
      thumbnailsPerRow
    }
  }

  function getSpritesheet(mediaId: string) {
    const cachedRequest = spritesheetRequests.get(mediaId)
    if (cachedRequest) return cachedRequest

    const request = (async () => {
      try {
        const payload = createGraphqlPayload(mediaId)
        const headers = new Headers(capturedHeaders)
        const csrfToken = getCookie("csrftoken")
        const lsd = payload.get("lsd")

        headers.set("content-type", "application/x-www-form-urlencoded")
        headers.set("x-fb-friendly-name", SPRITESHEET_QUERY_NAME)
        if (csrfToken && !headers.has("x-csrftoken")) {
          headers.set("x-csrftoken", csrfToken)
        }
        if (lsd) headers.set("x-fb-lsd", lsd)

        const response = await nativeFetch(GRAPHQL_PATH, {
          method: "POST",
          body: payload,
          credentials: "include",
          headers
        })

        if (!response.ok) {
          console.warn(
            `[Better IG] Spritesheet GraphQL request failed (${response.status})`
          )
          return null
        }

        const body = await response.json()
        const spritesheet = parseSpritesheet(body, mediaId)

        if (!spritesheet) {
          const errors = asRecord(body)?.errors
          const firstError = Array.isArray(errors) ? asRecord(errors[0]) : null
          console.warn(
            "[Better IG] Instagram returned no spritesheet",
            typeof firstError?.message === "string"
              ? firstError.message
              : "empty response"
          )
        }

        return spritesheet
      } catch {
        return null
      }
    })()

    spritesheetRequests.set(mediaId, request)
    void request.then((spritesheet) => {
      if (!spritesheet && spritesheetRequests.get(mediaId) === request) {
        spritesheetRequests.delete(mediaId)
      }
    })
    return request
  }

  async function handleSpritesheetRequest(requestId: string, blobUrl: string) {
    const video = Array.from(document.querySelectorAll("video")).find(
      (candidate) =>
        candidate.src === blobUrl || candidate.currentSrc === blobUrl
    )
    const indexedMediaId = video ? getIndexedMediaId(video) : null
    const shortcode = video ? getReelShortcode(video) : null

    if (!video || (!indexedMediaId && !shortcode)) {
      if (video && reportedUnresolvedSources.get(video) !== blobUrl) {
        reportedUnresolvedSources.set(video, blobUrl)

        let debugRoot: HTMLElement | null = video
        const nearbyLinks = new Set<string>()

        for (let depth = 0; debugRoot && depth < 12; depth += 1) {
          for (const link of Array.from(
            debugRoot.querySelectorAll<HTMLAnchorElement>("a[href]")
          )) {
            try {
              nearbyLinks.add(new URL(link.href).pathname)
            } catch {}

            if (nearbyLinks.size >= 20) break
          }

          if (nearbyLinks.size >= 20) break
          debugRoot = debugRoot.parentElement
        }

        console.warn(
          "[Better IG] Active Reel media id could not be resolved",
          JSON.stringify({
            assetIndexSize: mediaIdsByAsset.size,
            graphqlTemplateCaptured: graphqlTemplate !== null,
            location: window.location.pathname,
            nearbyLinks: Array.from(nearbyLinks),
            posterAsset: video.poster ? getAssetKey(video.poster) : null,
            shortcodeIndexSize: mediaIdsByShortcode.size
          })
        )
      }
      postBridgeMessage({
        type: "spritesheet-error",
        requestId,
        reason: "media-id-not-found"
      })
      return
    }

    const mediaId =
      indexedMediaId ?? (shortcode ? await getMediaId(shortcode) : null)

    if (!mediaId) {
      postBridgeMessage({
        type: "spritesheet-error",
        requestId,
        reason: "media-id-not-found"
      })
      return
    }

    const spritesheet = await getSpritesheet(mediaId)

    if (!spritesheet) {
      postBridgeMessage({
        type: "spritesheet-error",
        requestId,
        reason: "spritesheet-unavailable"
      })
      return
    }

    postBridgeMessage({ type: "spritesheet-ready", requestId, spritesheet })
  }

  window.addEventListener("message", (event) => {
    if (
      event.source !== window ||
      event.origin !== window.location.origin ||
      !event.data ||
      typeof event.data !== "object" ||
      event.data.channel !== INSTAGRAM_SPRITESHEET_CHANNEL
    ) {
      return
    }

    const message = event.data as SpritesheetIncomingMessage

    if (
      message.type === "request-spritesheet" &&
      typeof message.requestId === "string" &&
      typeof message.blobUrl === "string"
    ) {
      void handleSpritesheetRequest(message.requestId, message.blobUrl)
    }
  })

  postBridgeMessage({ type: "bridge-ready" })
}

function postBridgeMessage(data: Record<string, unknown>) {
  window.postMessage(
    {
      channel: INSTAGRAM_SPRITESHEET_CHANNEL,
      ...data
    },
    window.location.origin
  )
}

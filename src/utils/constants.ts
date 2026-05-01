export const IG_APP_ID_REGEX = /"APP_ID":\s*"(\d+)"/i
export const IG_REELS_SNAP = '[role="main"]>:nth-child(2)'

export const IG_STORIES_INJECTOR_INDICATOR =
  "div:has(>div>div>div>div>div>div>span>time)"
export const IG_STORIES_PROGRESS_BARS_INDICATOR = `${IG_STORIES_INJECTOR_INDICATOR} > div:first-child`
export const IG_STORIES_BUTTONS_CONTAINER_INDICATOR = `${IG_STORIES_INJECTOR_INDICATOR}>div:last-child`

export const IG_STORIES_VOLUME_INDICATOR =
  'div[aria-label][role="button"]:has(> div > svg), div[aria-valuemax="100"][aria-valuemin="0"]'

export const IG_REELS_VOLUME_INDICATOR =
  'div[aria-disabled="false"][role="button"] > div > div[tabindex="0"][role="button"] > svg'
export const IG_NEW_VOLUME_INDICATOR =
  'div[role="slider"][aria-valuemax="100"][aria-valuemin="0"]'
export const IG_DIRECT_VOLUME_INDICATOR =
  '.html-div>div[role="button"]:has(svg[width="16"]>title)'
export const IG_HOME_VOLUME_INDICATOR = "div > button[aria-label] > div > svg"

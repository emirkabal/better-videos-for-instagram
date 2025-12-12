export const IG_APP_ID_REGEX = /"APP_ID":\s*"(\d+)"/i
export const IG_REELS_SNAP = '[role="main"]>:nth-child(2)'
export const IG_STORIES_VOLUME_INDICATOR =
  'div[aria-label][role="button"]:has(> div > svg)'
export const IG_REELS_VOLUME_INDICATOR =
  'div[aria-disabled="false"][role="button"] > div > div[tabindex="0"][role="button"] > svg'
export const IG_NEW_VOLUME_INDICATOR =
  'div[role="slider"][aria-valuemax="100"][aria-valuemin="0"]'
export const IG_DIRECT_VOLUME_INDICATOR = '.html-div>div[role="button"]:has(svg[width="16"]>title)'
export const IG_INSIGHTS_VOLUME_INDICATOR = 'div[role="button"][tabindex="0"] > div[data-visualcompletion="ignore"][role="none"][style]'
export const IG_HOME_VOLUME_INDICATOR = "div > button[aria-label] > div > svg"

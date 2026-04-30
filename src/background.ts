import { Storage } from "@plasmohq/storage"

const EXTERNAL_REEL_TO_POST_RULE_ID = 1
const storage = new Storage()

const getExternalReelToPostRule = () =>
  ({
    id: EXTERNAL_REEL_TO_POST_RULE_ID,
    priority: 1,
    action: {
      type: "redirect",
      redirect: {
        regexSubstitution: "https://www.instagram.com/p/\\1/\\2\\3"
      }
    },
    condition: {
      regexFilter:
        "^https://www\\.instagram\\.com/reel/([^/?#]+)/?(\\?[^#]*)?(#.*)?$",
      resourceTypes: ["main_frame"],
      excludedInitiatorDomains: ["instagram.com"]
    }
  }) as chrome.declarativeNetRequest.Rule

const updateExternalReelToPostRule = (enabled: boolean) => {
  if (!chrome.declarativeNetRequest?.updateDynamicRules) return

  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [EXTERNAL_REEL_TO_POST_RULE_ID],
    addRules: enabled ? [getExternalReelToPostRule()] : []
  })
}

storage.get<boolean>("bigv-open-external-reels-as-posts").then((value) => {
  updateExternalReelToPostRule(value === true)
})

storage.watch({
  "bigv-open-external-reels-as-posts": (change) => {
    updateExternalReelToPostRule(change.newValue === true)
  }
})

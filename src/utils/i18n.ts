import english from "../../public/_locales/en/messages.json"

export type MessageKey = keyof typeof english

export function t(key: MessageKey) {
  return chrome.i18n.getMessage(key) || english[key].message
}

export function getUiDirection() {
  return chrome.i18n.getMessage("@@bidi_dir") === "rtl" ? "rtl" : "ltr"
}

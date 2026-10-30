const labels = {
  next: /^(?:next(?: story)?|go to next story|sonraki(?: hikaye| hikâye)?|ileri|suivant|siguiente|weiter|следующая история|التالي)$/iu,
  previous:
    /^(?:previous(?: story)?|go back|go to previous story|önceki(?: hikaye| hikâye)?|geri|précédent|anterior|zurück|предыдущая история|السابق)$/iu
}

export function getStoryNavigationButton(
  direction: 1 | -1,
  doc: Document = document
) {
  const pattern = direction === 1 ? labels.next : labels.previous
  for (const node of doc.querySelectorAll<HTMLElement>(
    'button, [role="button"], svg[aria-label]'
  )) {
    if (node.closest("[data-bigv-controller], .bigv-control")) continue
    const label =
      node.getAttribute("aria-label") ?? node.getAttribute("title") ?? ""
    if (!pattern.test(label.trim())) continue
    const control = node.closest<HTMLElement>('button, [role="button"], a')
    if (
      !control ||
      control.getAttribute("aria-disabled") === "true" ||
      control.hasAttribute("disabled") ||
      control.getClientRects().length === 0
    )
      continue
    return control
  }
  return null
}

export function navigateStory(direction: 1 | -1, doc: Document = document) {
  const control = getStoryNavigationButton(direction, doc)
  if (!control) return false
  control.click()
  return true
}

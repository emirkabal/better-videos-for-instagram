import { memo } from "react"

import "./style.css"

export interface QuickShareContact {
  id: string
  name: string
  avatar?: string
  element?: HTMLElement
  threadId?: string
  username?: string
  userIds?: string[]
}

export interface QuickShareAnchor {
  x: number
  y: number
}

export interface QuickSharePosition extends QuickShareAnchor {
  delay: number
}

export const QUICK_SHARE_ITEM_RADIUS = 34
export const QUICK_SHARE_CENTER_RADIUS = 34

const CONTACT_RADIUS = 118
const FULL_CIRCLE = 360

export const truncateQuickShareName = (name: string) => {
  const cleaned = name.trim()
  return cleaned.length > 8 ? `${cleaned.slice(0, 8)}...` : cleaned
}

export const getQuickSharePosition = (
  index: number,
  total: number,
  anchor: QuickShareAnchor
): QuickSharePosition => {
  const step = FULL_CIRCLE / Math.max(total, 1)
  const angleOffset = total % 2 === 0 ? -90 : -90 - step / 2
  const angle = (angleOffset + step * index) * (Math.PI / 180)
  const rawX = anchor.x + Math.cos(angle) * CONTACT_RADIUS
  const rawY = anchor.y + Math.sin(angle) * CONTACT_RADIUS

  return {
    x: Math.min(Math.max(rawX, 48), window.innerWidth - 48),
    y: Math.min(Math.max(rawY, 48), window.innerHeight - 48),
    delay: 28 * index
  }
}

interface QuickShareOverlayProps {
  anchor: QuickShareAnchor
  contacts: QuickShareContact[]
  highlightedId: string | null
  isLoading: boolean
  statusText?: string
  sendingId: string | null
}

function QuickShareOverlayComponent({
  anchor,
  contacts,
  highlightedId,
  isLoading,
  statusText,
  sendingId
}: QuickShareOverlayProps) {
  const hasContacts = contacts.length > 0

  return (
    <div className="bigv-quick-share-overlay" aria-hidden="true">
      <div
        className="bigv-quick-share-aura"
        style={{ left: anchor.x, top: anchor.y }}
      />

      <div
        className={`bigv-quick-share-cancel${highlightedId === "__cancel" ? " is-active" : ""}`}
        style={{ left: anchor.x, top: anchor.y }}>
        <span />
        <span />
      </div>

      {!hasContacts && (isLoading || statusText) && (
        <div
          className="bigv-quick-share-loading"
          style={{ left: anchor.x, top: anchor.y }}>
          {statusText ?? "Sohbetler hazırlanıyor"}
        </div>
      )}

      {contacts.map((contact, index) => {
        const position = getQuickSharePosition(index, contacts.length, anchor)
        const isActive = highlightedId === contact.id
        const isSending = sendingId === contact.id

        return (
          <div
            key={contact.id}
            className={`bigv-quick-share-contact${isActive ? " is-active" : ""}${isSending ? " is-sending" : ""}`}
            style={{
              left: position.x,
              top: position.y,
              transitionDelay: `${position.delay}ms`
            }}>
            <div className="bigv-quick-share-avatar">
              {contact.avatar ? (
                <img src={contact.avatar} alt="" draggable={false} />
              ) : (
                <span>{contact.name.charAt(0).toLocaleUpperCase()}</span>
              )}
            </div>
            <span className="bigv-quick-share-name">
              {truncateQuickShareName(contact.name)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default memo(QuickShareOverlayComponent)

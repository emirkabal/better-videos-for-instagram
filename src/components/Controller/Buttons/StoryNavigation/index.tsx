import { t } from "@/utils/i18n"
import { navigateStory } from "@/features/instagram/navigation/stories"

export default function StoryNavigation({ direction }: { direction: 1 | -1 }) {
  const label = t(direction === 1 ? "nextStoryLabel" : "previousStoryLabel")
  return (
    <button
      type="button"
      className="bigv-story-navigation bigv-control"
      aria-label={label}
      title={label}
      onClick={() => navigateStory(direction)}>
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
        <path
          d={
            direction === 1
              ? "M6 5v14l10-7zm11 0h2v14h-2z"
              : "M18 5v14L8 12zM5 5h2v14H5z"
          }
        />
      </svg>
    </button>
  )
}

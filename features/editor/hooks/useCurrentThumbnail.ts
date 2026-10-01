import { useDerivedStore } from '@/features/editor/store/useDerivedStore'
import { useProjectStore } from '@/features/editor/store/useProjectStore'

/** What the open project looks like right now: its cropped photo, or the whole photo before the first crop. */
export function useCurrentThumbnail(): string | null {
  const thumbnail = useDerivedStore((state) => state.thumbnail?.dataUrl ?? null)
  const imageSrc = useProjectStore((state) => state.imageSrc)
  return thumbnail ?? imageSrc
}

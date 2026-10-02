import type { Mood, Rating } from '~/types'

export interface ScanOption<T extends string> {
  value: T
  emoji: string
  label: string
}

// Asked when a student scans in. Values match the check constraint on scans.mood.
export const MOOD_OPTIONS: ScanOption<Mood>[] = [
  { value: 'energetic', emoji: '⚡', label: 'Energetic' },
  { value: 'fine', emoji: '🙂', label: 'Fine' },
  { value: 'tired', emoji: '😴', label: 'Tired' },
]

// Asked when a student scans out. Values match the check constraint on scans.rating.
export const RATING_OPTIONS: ScanOption<Rating>[] = [
  { value: 'outstanding', emoji: '🤩', label: 'Outstanding' },
  { value: 'good', emoji: '😀', label: 'Good' },
  { value: 'normal', emoji: '😐', label: 'Normal' },
  { value: 'could_be_better', emoji: '😕', label: 'Could be better' },
  { value: 'very_boring', emoji: '🥱', label: 'Very boring' },
]

export function moodOption(value: Mood | null | undefined) {
  return MOOD_OPTIONS.find(o => o.value === value)
}

export function ratingOption(value: Rating | null | undefined) {
  return RATING_OPTIONS.find(o => o.value === value)
}

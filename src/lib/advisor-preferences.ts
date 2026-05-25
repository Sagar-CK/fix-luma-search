export type AdvisorInputMode = "describe" | "preset" | "link"

export const DEFAULT_ADVISOR_INPUT_MODE: AdvisorInputMode = "link"

export const DEFAULT_ADVISOR_PROFILE = ""

export const ADVISOR_INPUT_MODES: Array<{ id: AdvisorInputMode; label: string }> =
  [
    { id: "link", label: "Link" },
    { id: "preset", label: "Filters" },
    { id: "describe", label: "Describe" },
  ]

export const ADVISOR_DAY_OPTIONS = [
  { id: "weekdays", label: "Weekdays" },
  { id: "weekends", label: "Weekends" },
] as const

export const ADVISOR_TIME_ANY_ID = "any"

export const ADVISOR_TIME_OPTIONS = [
  { id: "morning", label: "Morning", start: "06:00", end: "11:00" },
  { id: "afternoon", label: "Afternoon", start: "11:00", end: "17:00" },
  { id: "evening", label: "Evening", start: "17:00", end: "23:00" },
  { id: ADVISOR_TIME_ANY_ID, label: "No preference" },
] as const

export interface AdvisorCategoryOption {
  slug: string
  name: string
}

export interface AdvisorPresetPreferences {
  categorySlugs: string[]
  days: string[]
  times: string[]
  notes: string
}

export const EMPTY_ADVISOR_PRESET: AdvisorPresetPreferences = {
  categorySlugs: [],
  days: [],
  times: [],
  notes: "",
}

export function togglePresetValue(values: string[], value: string): string[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value]
}

export function toggleTimeValue(values: string[], value: string): string[] {
  if (value === ADVISOR_TIME_ANY_ID) {
    return values.includes(ADVISOR_TIME_ANY_ID) ? [] : [ADVISOR_TIME_ANY_ID]
  }

  const withoutAny = values.filter((item) => item !== ADVISOR_TIME_ANY_ID)
  return togglePresetValue(withoutAny, value)
}

export function formatTimeLabel(time: string): string {
  const [hours, minutes] = time.split(":").map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

export function formatTimeWindow(start: string, end: string): string {
  return `${formatTimeLabel(start)} to ${formatTimeLabel(end)}`
}

export function composePresetDescription(
  prefs: AdvisorPresetPreferences,
  categories: AdvisorCategoryOption[],
  cityLabel: string,
): string {
  const lines: string[] = [`Plan a week of events in ${cityLabel}.`]

  if (prefs.categorySlugs.length > 0) {
    const names = prefs.categorySlugs
      .map(
        (slug) =>
          categories.find((category) => category.slug === slug)?.name ?? slug,
      )
      .join(", ")
    lines.push(`Preferred categories: ${names}.`)
  }

  const availability: string[] = []

  for (const dayId of prefs.days) {
    const day = ADVISOR_DAY_OPTIONS.find((option) => option.id === dayId)
    if (day) {
      availability.push(day.label.toLowerCase())
    }
  }

  if (prefs.times.includes(ADVISOR_TIME_ANY_ID)) {
    availability.push("any time")
  } else {
    for (const timeId of prefs.times) {
      const time = ADVISOR_TIME_OPTIONS.find((option) => option.id === timeId)
      if (time && "start" in time && "end" in time) {
        availability.push(
          `${time.label.toLowerCase()} (${formatTimeWindow(time.start, time.end).toLowerCase()})`,
        )
      }
    }
  }

  if (availability.length > 0) {
    lines.push(`Available: ${availability.join(", ")}.`)
  }

  const notes = prefs.notes.trim()
  if (notes) {
    lines.push(`Notes: ${notes}`)
  }

  return lines.join("\n")
}

export function isPresetPreferencesValid(
  prefs: AdvisorPresetPreferences,
): boolean {
  return (
    prefs.categorySlugs.length > 0 ||
    prefs.days.length > 0 ||
    prefs.times.length > 0 ||
    prefs.notes.trim().length >= 8
  )
}

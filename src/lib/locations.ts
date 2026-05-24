export interface SearchLocation {
  key: "nyc" | "sf"
  label: string
  shortLabel: string
  latitude: number
  longitude: number
  cronMinuteUtc: number
}

export const SEARCH_LOCATIONS: SearchLocation[] = [
  {
    key: "nyc",
    label: "New York",
    shortLabel: "NYC",
    latitude: 40.7128,
    longitude: -74.006,
    cronMinuteUtc: 0,
  },
  {
    key: "sf",
    label: "San Francisco",
    shortLabel: "SF",
    latitude: 37.7749,
    longitude: -122.4194,
    cronMinuteUtc: 30,
  },
]

export const DEFAULT_LOCATION = SEARCH_LOCATIONS[0]

const STORAGE_KEY = "luma-search-location"

export function getLocationByKey(key: string): SearchLocation {
  return (
    SEARCH_LOCATIONS.find((location) => location.key === key) ??
    DEFAULT_LOCATION
  )
}

export function loadStoredLocation(): SearchLocation {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return DEFAULT_LOCATION
    }

    const parsed = JSON.parse(raw) as { key?: string }
    if (parsed.key === "nyc" || parsed.key === "sf") {
      return getLocationByKey(parsed.key)
    }

    return DEFAULT_LOCATION
  } catch {
    return DEFAULT_LOCATION
  }
}

export function storeLocation(location: SearchLocation) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ key: location.key }),
  )
}

export function getNextSyncTimestamp(
  locationKey: string,
  now = Date.now(),
): number {
  const location = getLocationByKey(locationKey)
  const next = new Date(now)
  next.setUTCSeconds(0, 0)
  next.setUTCMinutes(location.cronMinuteUtc)
  if (next.getTime() <= now) {
    next.setUTCHours(next.getUTCHours() + 1)
  }
  return next.getTime()
}

export function formatTimeUntil(
  targetTimestamp: number,
  now = Date.now(),
): string {
  const remainingMs = targetTimestamp - now
  if (remainingMs <= 0) {
    return "soon"
  }

  const totalMinutes = Math.ceil(remainingMs / 60_000)
  if (totalMinutes < 60) {
    return `${totalMinutes} min`
  }

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (minutes === 0) {
    return `${hours} hr`
  }

  return `${hours} hr ${minutes} min`
}

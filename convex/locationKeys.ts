export const LOCATION_PRESETS = [
  {
    key: "nyc" as const,
    label: "New York",
    latitude: 40.7128,
    longitude: -74.006,
    cronMinuteUtc: 0,
  },
  {
    key: "sf" as const,
    label: "San Francisco",
    latitude: 37.7749,
    longitude: -122.4194,
    cronMinuteUtc: 30,
  },
] as const

export type LocationKey = (typeof LOCATION_PRESETS)[number]["key"]

export function isLocationKey(value: string): value is LocationKey {
  return LOCATION_PRESETS.some((location) => location.key === value)
}

export function getLocationPreset(key: string) {
  return LOCATION_PRESETS.find((location) => location.key === key)
}

export function getNextSyncTimestamp(
  locationKey: string,
  now = Date.now(),
): number {
  const preset = getLocationPreset(locationKey)
  const cronMinute = preset?.cronMinuteUtc ?? 0
  const next = new Date(now)
  next.setUTCSeconds(0, 0)
  next.setUTCMinutes(cronMinute)
  if (next.getTime() <= now) {
    next.setUTCHours(next.getUTCHours() + 1)
  }
  return next.getTime()
}

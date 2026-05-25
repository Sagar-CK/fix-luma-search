export interface EventDisplay {
  id: string
  name: string
  coverUrl?: string
  startAt: string
  endAt: string
  timezone: string
  urlSlug: string
  locationType: string
  venueName?: string
  city?: string
  cityState?: string
  country?: string
  calendarName: string
  calendarAvatarUrl?: string
  hostNames: string[]
  isSoldOut?: boolean
}

export function getEventUrl(event: Pick<EventDisplay, "urlSlug">): string {
  return `https://luma.com/${event.urlSlug}`
}

export function toEventDisplay(
  event: Omit<EventDisplay, "id"> & { lumaId: string },
): EventDisplay {
  return {
    id: event.lumaId,
    name: event.name,
    coverUrl: event.coverUrl,
    startAt: event.startAt,
    endAt: event.endAt,
    timezone: event.timezone,
    urlSlug: event.urlSlug,
    locationType: event.locationType,
    venueName: event.venueName,
    city: event.city,
    cityState: event.cityState,
    country: event.country,
    calendarName: event.calendarName,
    calendarAvatarUrl: event.calendarAvatarUrl,
    hostNames: event.hostNames,
    isSoldOut: event.isSoldOut,
  }
}

export function formatEventTime(startAt: string, timezone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(startAt))
}

export function getEventDayKey(startAt: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(startAt))
}

export function formatEventDayLabel(
  startAt: string,
  timezone: string,
): { monthDay: string; weekday: string } {
  const { primary, weekday } = formatTimelineDayLabel(startAt, timezone)
  return { monthDay: primary, weekday }
}

export function formatTimelineDayLabel(
  startAt: string,
  timezone: string,
  now = Date.now(),
): { primary: string; weekday: string } {
  const dayKey = getEventDayKey(startAt, timezone)
  const todayKey = getEventDayKey(new Date(now).toISOString(), timezone)
  const tomorrowKey = getEventDayKey(
    new Date(now + 86_400_000).toISOString(),
    timezone,
  )

  const weekday = new Intl.DateTimeFormat(undefined, {
    timeZone: timezone,
    weekday: "long",
  }).format(new Date(startAt))

  if (dayKey === todayKey) {
    return { primary: "Today", weekday }
  }

  if (dayKey === tomorrowKey) {
    return { primary: "Tomorrow", weekday }
  }

  const primary = new Intl.DateTimeFormat(undefined, {
    timeZone: timezone,
    month: "short",
    day: "numeric",
  }).format(new Date(startAt))

  return { primary, weekday }
}

export function isEventUpcoming(
  event: Pick<EventDisplay, "endAt">,
  now = Date.now(),
): boolean {
  return new Date(event.endAt).getTime() >= now
}

export function isEventPast(
  event: Pick<EventDisplay, "endAt">,
  now = Date.now(),
): boolean {
  return new Date(event.endAt).getTime() < now
}

export function isEventLive(
  event: Pick<EventDisplay, "startAt" | "endAt">,
  now = Date.now(),
): boolean {
  const start = new Date(event.startAt).getTime()
  const end = new Date(event.endAt).getTime()
  return now >= start && now <= end
}

export function getEventLocation(
  event: Pick<
    EventDisplay,
    "locationType" | "venueName" | "city" | "cityState" | "country"
  >,
): string {
  if (event.locationType === "online") {
    return "Online"
  }

  return (
    event.venueName ??
    event.cityState ??
    event.city ??
    event.country ??
    "Location TBD"
  )
}

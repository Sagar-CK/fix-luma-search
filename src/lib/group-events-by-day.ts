import {
  formatEventDayLabel,
  getEventDayKey,
  type EventDisplay,
} from "@/lib/event-display"

export interface EventDayGroup {
  dayKey: string
  monthDay: string
  weekday: string
  events: EventDisplay[]
}

export function groupEventsByDay(events: EventDisplay[]): EventDayGroup[] {
  const groups = new Map<
    string,
    { timezone: string; events: EventDisplay[] }
  >()

  for (const event of events) {
    const dayKey = getEventDayKey(event.startAt, event.timezone)
    const existing = groups.get(dayKey)

    if (existing) {
      existing.events.push(event)
      continue
    }

    groups.set(dayKey, {
      timezone: event.timezone,
      events: [event],
    })
  }

  return Array.from(groups.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([dayKey, { timezone, events: dayEvents }]) => {
      const sortedEvents = [...dayEvents].sort(
        (left, right) =>
          new Date(left.startAt).getTime() - new Date(right.startAt).getTime(),
      )

      const { monthDay, weekday } = formatEventDayLabel(
        sortedEvents[0].startAt,
        timezone,
      )

      return {
        dayKey,
        monthDay,
        weekday,
        events: sortedEvents,
      }
    })
}

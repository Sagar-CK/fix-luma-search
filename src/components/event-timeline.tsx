import { useMemo } from "react"

import { EventCard } from "@/components/event-card"
import { Skeleton } from "@/components/ui/skeleton"
import { isEventUpcoming, type EventDisplay } from "@/lib/event-display"
import { groupEventsByDay } from "@/lib/group-events-by-day"
import { cn } from "@/lib/utils"

interface EventTimelineProps {
  events: EventDisplay[]
}

function TimelineSkeleton() {
  return (
    <div className="flex gap-6">
      <div className="flex w-28 shrink-0 flex-col pt-1">
        <Skeleton className="h-5 w-24" />
      </div>
      <div className="flex w-6 shrink-0 flex-col items-center pt-2">
        <Skeleton className="size-2 rounded-full" />
      </div>
      <div className="min-w-0 flex-1 pb-8">
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    </div>
  )
}

export function EventTimelineSkeleton() {
  return (
    <div className="flex flex-col">
      {Array.from({ length: 4 }).map((_, index) => (
        <TimelineSkeleton key={index} />
      ))}
    </div>
  )
}

export function EventTimeline({ events }: EventTimelineProps) {
  const dayGroups = useMemo(() => {
    const upcomingEvents = events.filter((event) => isEventUpcoming(event))
    return groupEventsByDay(upcomingEvents)
  }, [events])

  if (dayGroups.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col">
      {dayGroups.map((group, groupIndex) => {
        const isLastGroup = groupIndex === dayGroups.length - 1

        return (
          <div key={group.dayKey} className="flex gap-6">
            <div className="flex w-28 shrink-0 pt-1">
              <h3 className="text-base leading-snug">
                <span className="font-semibold text-foreground">
                  {group.monthDay}
                </span>
                <span className="font-normal text-luma-secondary">
                  {" "}
                  {group.weekday}
                </span>
              </h3>
            </div>

            <div className="relative flex w-6 shrink-0 justify-center">
              <div className="z-10 mt-2 size-2 rounded-full bg-[#b3b5b7] ring-4 ring-luma-page" />
              {!isLastGroup ? (
                <div className="absolute top-3 bottom-0 w-px bg-[#ebeced]" />
              ) : null}
            </div>

            <div
              className={cn(
                "flex min-w-0 flex-1 flex-col gap-3",
                isLastGroup ? "pb-2" : "pb-10",
              )}
            >
              {group.events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

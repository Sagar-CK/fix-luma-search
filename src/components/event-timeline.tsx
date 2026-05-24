import { useMemo } from "react"

import { EventCard } from "@/components/event-card"
import { Skeleton } from "@/components/ui/skeleton"
import { isEventUpcoming, type EventDisplay } from "@/lib/event-display"
import { groupEventsByDay } from "@/lib/group-events-by-day"
import { cn } from "@/lib/utils"

interface EventTimelineProps {
  events: EventDisplay[]
}

function DayLabel({
  monthDay,
  weekday,
  className,
}: {
  monthDay: string
  weekday: string
  className?: string
}) {
  return (
    <h3
      className={cn(
        "text-[13px] leading-tight sm:text-base sm:leading-snug",
        className,
      )}
    >
      <span className="block font-semibold text-foreground">{monthDay}</span>
      <span className="block text-xs font-normal text-luma-secondary sm:inline sm:text-base">
        <span className="hidden sm:inline"> </span>
        {weekday}
      </span>
    </h3>
  )
}

function TimelineSkeleton() {
  return (
    <div className="flex gap-2.5 sm:gap-6">
      <div className="flex w-[4.75rem] shrink-0 flex-col pt-1 sm:w-28">
        <Skeleton className="h-4 w-12 sm:h-5 sm:w-24" />
        <Skeleton className="mt-1 h-3 w-14 sm:hidden" />
      </div>
      <div className="flex w-4 shrink-0 flex-col items-center pt-2 sm:w-6">
        <Skeleton className="size-1.5 rounded-full sm:size-2" />
      </div>
      <div className="min-w-0 flex-1 pb-8">
        <Skeleton className="h-28 w-full rounded-xl sm:h-32" />
      </div>
    </div>
  )
}

export function EventTimelineSkeleton() {
  return (
    <div className="flex flex-col">
      {Array.from({ length: 3 }).map((_, index) => (
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
          <div key={group.dayKey} className="flex gap-2.5 sm:gap-6">
            <div className="flex w-[4.75rem] shrink-0 pt-1 sm:w-28">
              <DayLabel monthDay={group.monthDay} weekday={group.weekday} />
            </div>

            <div className="relative flex w-4 shrink-0 justify-center sm:w-6">
              <div className="z-10 mt-2 size-1.5 rounded-full bg-[#b3b5b7] ring-[3px] ring-luma-page sm:size-2 sm:ring-4" />
              {!isLastGroup ? (
                <div className="absolute top-2.5 bottom-0 w-px bg-[#ebeced] sm:top-3" />
              ) : null}
            </div>

            <div
              className={cn(
                "flex min-w-0 flex-1 flex-col gap-2.5 sm:gap-3",
                isLastGroup ? "pb-2" : "pb-8 sm:pb-10",
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

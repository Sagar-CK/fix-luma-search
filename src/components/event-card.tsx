import { IconMapPin } from "@tabler/icons-react"

import {
  formatEventTime,
  getEventLocation,
  getEventUrl,
  isEventLive,
  type EventDisplay,
} from "@/lib/event-display"
import { cn } from "@/lib/utils"

interface EventCardProps {
  event: EventDisplay
}

function HostAvatar({ name }: { name: string }) {
  return (
    <div
      className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-[#ebeced] text-[9px] font-medium uppercase text-luma-secondary ring-2 ring-white"
      aria-hidden
    >
      {name.slice(0, 1)}
    </div>
  )
}

function HostAvatarStack({
  calendarName,
  calendarAvatarUrl,
  hostNames,
}: {
  calendarName: string
  calendarAvatarUrl?: string
  hostNames: string[]
}) {
  const hosts =
    hostNames.length > 0
      ? hostNames.slice(0, 3)
      : [calendarName]

  return (
    <div className="flex shrink-0 -space-x-1.5">
      {hosts.map((name, index) =>
        index === 0 && calendarAvatarUrl ? (
          <img
            key={name}
            src={calendarAvatarUrl}
            alt=""
            className="size-[18px] shrink-0 rounded-full object-cover ring-2 ring-white"
          />
        ) : (
          <HostAvatar key={`${name}-${index}`} name={name} />
        ),
      )}
    </div>
  )
}

function formatHostLabel(calendarName: string, hostNames: string[]): string {
  if (hostNames.length === 0) {
    return calendarName
  }

  if (hostNames.length <= 2) {
    return hostNames.join(", ")
  }

  return `${hostNames[0]}, ${hostNames[1]} +${hostNames.length - 2}`
}

export function EventCard({ event }: EventCardProps) {
  const live = isEventLive(event)
  const location = getEventLocation(event)
  const time = formatEventTime(event.startAt, event.timezone)
  const hostLabel = formatHostLabel(event.calendarName, event.hostNames)

  return (
    <a
      href={getEventUrl(event)}
      target="_blank"
      rel="noopener noreferrer"
      className="group block"
    >
      <article
        className={cn(
          "flex gap-3 rounded-[var(--luma-card-radius)] bg-card px-4 py-3",
          "border border-[#ebeced] shadow-[0_1px_2px_rgba(33,35,37,0.04)]",
          "transition-shadow hover:shadow-[0_2px_8px_rgba(33,35,37,0.08)]",
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-2 text-sm leading-none">
            {live ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-luma-orange uppercase">
                <span className="size-1.5 rounded-full bg-luma-orange" />
                LIVE
              </span>
            ) : null}
            <span className="text-luma-secondary">{time}</span>
          </div>

          <h3 className="line-clamp-2 text-lg leading-snug font-semibold text-foreground">
            {event.name}
          </h3>

          <div className="flex items-center gap-1.5 text-sm text-luma-secondary">
            <HostAvatarStack
              calendarName={event.calendarName}
              calendarAvatarUrl={event.calendarAvatarUrl}
              hostNames={event.hostNames}
            />
            <span className="truncate">By {hostLabel}</span>
          </div>

          <div className="flex items-center gap-1 text-sm text-luma-secondary">
            <IconMapPin className="size-3.5 shrink-0 opacity-70" stroke={1.75} />
            <span className="truncate">{location}</span>
          </div>

          {event.isSoldOut ? (
            <span className="inline-flex w-fit rounded-md bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-600">
              Sold Out
            </span>
          ) : null}
        </div>

        <div className="size-[6.5rem] shrink-0 overflow-hidden rounded-lg bg-[#ebeced] sm:size-28">
          {event.coverUrl ? (
            <img
              src={event.coverUrl}
              alt=""
              className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-xs text-luma-tertiary">
              No cover
            </div>
          )}
        </div>
      </article>
    </a>
  )
}

import { IconMapPin } from "@tabler/icons-react"

import { FadeInImage } from "@/components/fade-in-image"
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
  variant?: "default" | "compact"
}

function HostAvatar({
  name,
  compact,
}: {
  name: string
  compact: boolean
}) {
  return (
    <div
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-full bg-[#ebeced] text-[9px] font-medium uppercase text-luma-secondary ring-2 ring-white",
        !compact && "sm:size-[18px]",
      )}
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
  compact,
}: {
  calendarName: string
  calendarAvatarUrl?: string
  hostNames: string[]
  compact: boolean
}) {
  const hosts =
    hostNames.length > 0
      ? hostNames.slice(0, 3)
      : [calendarName]

  return (
    <div className="flex shrink-0 -space-x-1.5">
      {hosts.map((name, index) =>
        index === 0 && calendarAvatarUrl ? (
          <FadeInImage
            key={name}
            src={calendarAvatarUrl}
            alt=""
            blurClassName="blur-sm"
            className={cn(
              "size-4 shrink-0 rounded-full object-cover ring-2 ring-white",
              !compact && "sm:size-[18px]",
            )}
          />
        ) : (
          <HostAvatar key={`${name}-${index}`} name={name} compact={compact} />
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

export function EventCard({
  event,
  variant = "default",
}: EventCardProps) {
  const live = isEventLive(event)
  const location = getEventLocation(event)
  const time = formatEventTime(event.startAt, event.timezone)
  const hostLabel = formatHostLabel(event.calendarName, event.hostNames)
  const compact = variant === "compact"

  return (
    <a
      href={getEventUrl(event)}
      target="_blank"
      rel="noopener noreferrer"
      className="group block min-w-0"
    >
      <article
        className={cn(
          "flex gap-2.5 rounded-[var(--luma-card-radius)] bg-card px-3 py-2.5",
          "border border-[#ebeced] shadow-[0_1px_2px_rgba(33,35,37,0.04)]",
          "transition-shadow hover:shadow-[0_2px_8px_rgba(33,35,37,0.08)]",
          !compact && "sm:gap-3 sm:px-4 sm:py-3",
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:gap-1">
          <div
            className={cn(
              "flex items-center gap-1.5 text-xs leading-none",
              !compact && "sm:gap-2 sm:text-sm",
            )}
          >
            {live ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[11px] font-semibold tracking-wide text-luma-orange uppercase",
                  !compact && "sm:gap-1.5 sm:text-xs",
                )}
              >
                <span className="size-1.5 rounded-full bg-luma-orange" />
                LIVE
              </span>
            ) : null}
            <span className="text-luma-secondary">{time}</span>
          </div>

          <h3
            className={cn(
              "line-clamp-3 text-[15px] leading-snug font-semibold text-foreground",
              !compact && "sm:line-clamp-2 sm:text-lg",
            )}
          >
            {event.name}
          </h3>

          <div
            className={cn(
              "flex min-w-0 items-center gap-1.5 text-xs text-luma-secondary",
              !compact && "sm:text-sm",
            )}
          >
            <HostAvatarStack
              calendarName={event.calendarName}
              calendarAvatarUrl={event.calendarAvatarUrl}
              hostNames={event.hostNames}
              compact={compact}
            />
            <span className="truncate">By {hostLabel}</span>
          </div>

          <div
            className={cn(
              "flex min-w-0 items-center gap-1 text-xs text-luma-secondary",
              !compact && "sm:text-sm",
            )}
          >
            <IconMapPin
              className={cn(
                "size-3 shrink-0 opacity-70",
                !compact && "sm:size-3.5",
              )}
              stroke={1.75}
            />
            <span className="truncate">{location}</span>
          </div>

          {event.isSoldOut ? (
            <span
              className={cn(
                "inline-flex w-fit rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-600",
                !compact && "sm:text-xs",
              )}
            >
              Sold Out
            </span>
          ) : null}
        </div>

        <div
          className={cn(
            "size-[4.5rem] shrink-0 overflow-hidden rounded-md bg-[#ebeced]",
            !compact && "sm:size-28 sm:rounded-lg",
          )}
        >
          {event.coverUrl ? (
            <FadeInImage
              src={event.coverUrl}
              alt=""
              className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div
              className={cn(
                "flex size-full items-center justify-center text-[10px] text-luma-tertiary",
                !compact && "sm:text-xs",
              )}
            >
              No cover
            </div>
          )}
        </div>
      </article>
    </a>
  )
}

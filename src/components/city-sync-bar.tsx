import { useEffect, useState } from "react"

import {
  formatTimeUntil,
  getNextSyncTimestamp,
  SEARCH_LOCATIONS,
  type SearchLocation,
} from "@/lib/locations"
import { cn } from "@/lib/utils"

interface CityToggleProps {
  value: SearchLocation
  onChange: (location: SearchLocation) => void
  className?: string
}

export function CityToggle({ value, onChange, className }: CityToggleProps) {
  return (
    <div
      className={cn(
        "inline-flex w-fit shrink-0 rounded-full bg-[#ebeced]/70 p-0.5",
        className,
      )}
      role="tablist"
      aria-label="City"
    >
      {SEARCH_LOCATIONS.map((location) => {
        const selected = value.key === location.key

        return (
          <button
            key={location.key}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(location)}
            className={cn(
              "rounded-full px-3.5 py-1 text-sm font-medium transition-colors",
              selected
                ? "bg-white text-foreground shadow-[0_1px_2px_rgba(33,35,37,0.06)]"
                : "text-luma-secondary hover:text-foreground",
            )}
          >
            {location.label}
          </button>
        )
      })}
    </div>
  )
}

interface SyncCountdownProps {
  locationKey: string
  nextSyncAt?: number
  isSyncing: boolean
  lastSyncedAt?: number
  className?: string
}

export function SyncCountdown({
  locationKey,
  nextSyncAt,
  isSyncing,
  lastSyncedAt,
  className,
}: SyncCountdownProps) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(intervalId)
  }, [])

  if (isSyncing) {
    return (
      <span
        className={cn(
          "flex items-center gap-1.5 text-xs text-luma-secondary",
          className,
        )}
      >
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-luma-orange opacity-60" />
          <span className="relative inline-flex size-1.5 rounded-full bg-luma-orange" />
        </span>
        Syncing
      </span>
    )
  }

  const target = nextSyncAt ?? getNextSyncTimestamp(locationKey, now)
  const countdown = formatTimeUntil(target, now)

  return (
    <span className={cn("text-xs text-luma-tertiary tabular-nums", className)}>
      Syncs in {countdown}
      {lastSyncedAt ? (
        <span className="hidden sm:inline">
          {" · "}
          Updated{" "}
          {new Intl.DateTimeFormat(undefined, {
            hour: "numeric",
            minute: "2-digit",
          }).format(new Date(lastSyncedAt))}
        </span>
      ) : null}
    </span>
  )
}

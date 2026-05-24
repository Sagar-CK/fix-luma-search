import { useRef, useState } from "react"
import { IconCalendarEvent, IconSearch, IconX } from "@tabler/icons-react"

import { CityToggle, SyncCountdown } from "@/components/city-sync-bar"
import { CategoryFilter } from "@/components/category-filter"
import { EventTimeline, EventTimelineSkeleton } from "@/components/event-timeline"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useConvexEvents } from "@/hooks/use-convex-events"
import { isEventUpcoming } from "@/lib/event-display"
import { cn } from "@/lib/utils"

export function App() {
  const [searchOpen, setSearchOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const {
    categories,
    selectedSlug,
    setSelectedSlug,
    searchQuery,
    setSearchQuery,
    location,
    setLocation,
    events,
    totalCount,
    loadingCategories,
    loadingEvents,
    syncStatus,
    nextSyncAt,
    hasMore,
    loadMore,
    isSyncing,
  } = useConvexEvents()

  const upcomingEvents = events.filter((event) => isEventUpcoming(event))
  const isInitialLoad = loadingEvents && events.length === 0

  const selectedCategoryName =
    selectedSlug === "all"
      ? null
      : categories.find((category) => category.slug === selectedSlug)?.name

  const pageTitle =
    searchQuery.trim().length > 0
      ? "Search Results"
      : selectedCategoryName
        ? selectedCategoryName
        : `${location.label} Events`

  const mobilePageTitle =
    searchQuery.trim().length > 0
      ? "Search"
      : selectedCategoryName
        ? selectedCategoryName
        : `${location.shortLabel} Events`

  function openSearch() {
    setSearchOpen(true)
    window.requestAnimationFrame(() => searchInputRef.current?.focus())
  }

  function closeSearch() {
    setSearchOpen(false)
    setSearchQuery("")
  }

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-[820px] flex-col gap-6 overflow-x-hidden px-4 py-5 sm:gap-8 sm:px-6 sm:py-6">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="min-w-0 truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            <span className="sm:hidden">{mobilePageTitle}</span>
            <span className="hidden sm:inline">{pageTitle}</span>
          </h1>

          <button
            type="button"
            onClick={searchOpen ? closeSearch : openSearch}
            aria-label={searchOpen ? "Close search" : "Search events"}
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              "border border-[#ebeced] bg-white text-luma-secondary",
              "shadow-[0_1px_2px_rgba(33,35,37,0.04)] transition-colors",
              "hover:text-foreground",
            )}
          >
            {searchOpen ? (
              <IconX className="size-4" stroke={1.75} />
            ) : (
              <IconSearch className="size-4" stroke={1.75} />
            )}
          </button>
        </div>

        <div className="flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-2">
          <CityToggle value={location} onChange={setLocation} />
          <SyncCountdown
            locationKey={location.key}
            nextSyncAt={nextSyncAt}
            isSyncing={isSyncing}
            lastSyncedAt={syncStatus?.lastSyncedAt}
          />
        </div>

        {searchOpen ? (
          <div className="relative">
            <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-luma-tertiary" />
            <Input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={
                totalCount > 0
                  ? `Search ${totalCount.toLocaleString()} events`
                  : "Search events"
              }
              className="h-10 border-[#ebeced] bg-white pl-9 shadow-[0_1px_2px_rgba(33,35,37,0.04)]"
            />
          </div>
        ) : null}

        {syncStatus?.lastError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive sm:px-4 sm:py-3">
            Sync error: {syncStatus.lastError}
          </div>
        ) : null}
      </header>

      <section className="flex flex-col gap-4 sm:gap-5">
        <CategoryFilter
          categories={categories}
          value={selectedSlug}
          onChange={setSelectedSlug}
          disabled={loadingCategories}
        />

        {isInitialLoad ? (
          <EventTimelineSkeleton />
        ) : upcomingEvents.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <IconCalendarEvent />
              </EmptyMedia>
              <EmptyTitle>No events found</EmptyTitle>
              <EmptyDescription>
                {searchQuery.trim()
                  ? "Try a different search term."
                  : selectedSlug !== "all"
                    ? "Try another category or switch back to All categories."
                    : isSyncing
                      ? "Events will appear as they sync."
                      : "Events refresh hourly from Luma."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <EventTimeline events={events} />
        )}

        {hasMore && upcomingEvents.length > 0 ? (
          <div className="flex justify-center pb-4 sm:pb-8">
            <Button
              onClick={() => loadMore()}
              variant="outline"
              className="w-full border-[#ebeced] bg-white shadow-[0_1px_2px_rgba(33,35,37,0.04)] sm:w-auto"
            >
              Load more events
            </Button>
          </div>
        ) : null}
      </section>

      <footer className="pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center text-sm text-luma-tertiary">
        by{" "}
        <a
          href="https://sagarck.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-luma-secondary underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          sagar
        </a>
      </footer>
    </div>
  )
}

export default App

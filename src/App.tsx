import { useRef } from "react"
import { IconCalendarEvent, IconSearch } from "@tabler/icons-react"

import { CityToggle, SyncCountdown } from "@/components/city-sync-bar"
import { CategoryFilter } from "@/components/category-filter"
import { EventAdvisorChat } from "@/components/event-advisor-chat"
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
import {
  formatCategorySearchScope,
  formatCategorySummary,
} from "@/lib/category-selection"

function getSearchPlaceholder(
  count: number,
  categoryScope: string | null,
  loading: boolean,
) {
  if (loading) {
    return "Search events"
  }

  if (count === 0) {
    return categoryScope ? `Search ${categoryScope} events` : "Search events"
  }

  const countLabel = count.toLocaleString()

  if (categoryScope) {
    return count === 1
      ? `Search 1 ${categoryScope} event`
      : `Search ${countLabel} ${categoryScope} events`
  }

  return count === 1 ? "Search 1 event" : `Search ${countLabel} events`
}

export function App() {
  const searchInputRef = useRef<HTMLInputElement>(null)

  const {
    categories,
    selectedSlugs,
    setSelectedSlugs,
    searchQuery,
    setSearchQuery,
    location,
    setLocation,
    events,
    scopedEventCount,
    loadingScopedEventCount,
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

  const categorySummary = formatCategorySummary(categories, selectedSlugs)
  const categorySearchScope = formatCategorySearchScope(categories, selectedSlugs)

  const pageTitle =
    searchQuery.trim().length > 0
      ? "Search Results"
      : categorySummary
        ? `${categorySummary} · ${location.label}`
        : `${location.label} Events`

  const mobilePageTitle =
    searchQuery.trim().length > 0
      ? "Search"
      : categorySummary
        ? `${categorySummary} · ${location.shortLabel}`
        : `${location.shortLabel} Events`

  const searchPlaceholder = getSearchPlaceholder(
    scopedEventCount,
    categorySearchScope,
    loadingScopedEventCount,
  )

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-[820px] flex-col gap-6 overflow-x-hidden px-4 py-5 sm:gap-8 sm:px-6 sm:py-6">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              <span className="sm:hidden">{mobilePageTitle}</span>
              <span className="hidden sm:inline">{pageTitle}</span>
            </h1>
          </div>

          <CategoryFilter
            categories={categories}
            value={selectedSlugs}
            onChange={setSelectedSlugs}
            disabled={loadingCategories}
          />
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

        <div className="relative">
          <IconSearch className="pointer-events-none absolute top-1/2 left-3.5 size-[1.125rem] -translate-y-1/2 text-luma-tertiary" />
          <Input
            ref={searchInputRef}
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-11 border-[#ebeced] bg-white pl-10 text-[15px] shadow-[0_1px_2px_rgba(33,35,37,0.04)] sm:h-12 sm:pl-11 sm:text-base"
          />
        </div>

        {syncStatus?.lastError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive sm:px-4 sm:py-3">
            Sync error: {syncStatus.lastError}
          </div>
        ) : null}
      </header>

      <section className="flex flex-col gap-4 sm:gap-5">
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
                  : selectedSlugs.length > 0
                    ? "Try another category or clear your filters."
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

      <EventAdvisorChat location={location} />
    </div>
  )
}

export default App

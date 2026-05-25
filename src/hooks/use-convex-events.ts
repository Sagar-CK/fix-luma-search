import { useEffect, useMemo, useState } from "react"
import { usePaginatedQuery, useQuery } from "convex/react"

import { api } from "../../convex/_generated/api"
import type { Doc } from "../../convex/_generated/dataModel"
import type { EventDisplay } from "@/lib/event-display"
import {
  loadStoredLocation,
  storeLocation,
  type SearchLocation,
} from "@/lib/locations"

function toEventDisplay(event: Doc<"events">): EventDisplay {
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

export function useConvexEvents() {
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [location, setLocationState] = useState<SearchLocation>(loadStoredLocation)

  const categories = useQuery(api.categories.listForLocation, {
    locationKey: location.key,
  })

  useEffect(() => {
    if (selectedSlugs.length === 0 || categories === undefined) {
      return
    }

    const availableSlugs = new Set(categories.map((category) => category.slug))
    const nextSlugs = selectedSlugs.filter((slug) => availableSlugs.has(slug))

    if (nextSlugs.length !== selectedSlugs.length) {
      setSelectedSlugs(nextSlugs)
    }
  }, [categories, selectedSlugs])

  const syncInfo = useQuery(api.sync.status, { locationKey: location.key })

  const syncStatus = syncInfo?.syncStatus ?? null
  const nextSyncAt = syncInfo?.nextSyncAt

  const trimmedSearch = searchQuery.trim()
  const isSearching = trimmedSearch.length > 0
  const categorySlugs = selectedSlugs.length > 0 ? selectedSlugs : undefined

  const scopedEventCount = useQuery(api.events.count, {
    locationKey: location.key,
    categorySlugs,
  })

  const searchResults = useQuery(
    api.events.search,
    isSearching
      ? {
          locationKey: location.key,
          query: trimmedSearch,
          categorySlugs,
        }
      : "skip",
  )

  const {
    results: paginatedResults,
    status: paginationStatus,
    loadMore,
  } = usePaginatedQuery(
    api.events.list,
    {
      locationKey: location.key,
      categorySlugs,
    },
    { initialNumItems: 60 },
  )

  const events = useMemo(() => {
    if (isSearching) {
      return (searchResults ?? []).map(toEventDisplay)
    }
    return paginatedResults.map(toEventDisplay)
  }, [isSearching, paginatedResults, searchResults])

  const hasMore =
    !isSearching &&
    (paginationStatus === "CanLoadMore" || paginationStatus === "LoadingMore")

  const loadingEvents = isSearching
    ? searchResults === undefined
    : paginationStatus === "LoadingFirstPage"

  const isSyncing = syncStatus?.isSyncing ?? false

  function setLocation(next: SearchLocation) {
    storeLocation(next)
    setLocationState(next)
    setSearchQuery("")
    setSelectedSlugs([])
  }

  return {
    categories: categories ?? [],
    selectedSlugs,
    setSelectedSlugs,
    searchQuery,
    setSearchQuery,
    location,
    setLocation,
    events,
    scopedEventCount: scopedEventCount ?? 0,
    loadingScopedEventCount: scopedEventCount === undefined,
    loadingCategories: categories === undefined,
    loadingEvents,
    syncStatus,
    nextSyncAt,
    hasMore,
    loadMore: () => loadMore(60),
    isSyncing,
  }
}

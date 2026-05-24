import { useEffect, useMemo, useState } from "react"
import { useMutation, usePaginatedQuery, useQuery } from "convex/react"

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
  const [selectedSlug, setSelectedSlug] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [location, setLocationState] = useState<SearchLocation>(loadStoredLocation)

  const categories = useQuery(api.categories.listForLocation, {
    locationKey: location.key,
  })

  useEffect(() => {
    if (selectedSlug === "all" || categories === undefined) {
      return
    }

    const isAvailable = categories.some((category) => category.slug === selectedSlug)
    if (!isAvailable) {
      setSelectedSlug("all")
    }
  }, [categories, selectedSlug])
  const syncInfo = useQuery(api.sync.status, { locationKey: location.key })

  const syncStatus = syncInfo?.syncStatus ?? null
  const totalCount = syncInfo?.cachedEventCount ?? 0
  const nextSyncAt = syncInfo?.nextSyncAt

  const trimmedSearch = searchQuery.trim()
  const isSearching = trimmedSearch.length > 0

  const searchResults = useQuery(
    api.events.search,
    isSearching
      ? {
          locationKey: location.key,
          query: trimmedSearch,
          categorySlug: selectedSlug === "all" ? undefined : selectedSlug,
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
      categorySlug: selectedSlug === "all" ? undefined : selectedSlug,
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
    setSelectedSlug("all")
  }

  return {
    categories: categories ?? [],
    selectedSlug,
    setSelectedSlug,
    searchQuery,
    setSearchQuery,
    location,
    setLocation,
    events,
    totalCount,
    loadingCategories: categories === undefined,
    loadingEvents,
    syncStatus,
    nextSyncAt,
    hasMore,
    loadMore: () => loadMore(60),
    isSyncing,
  }
}

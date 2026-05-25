"use node"

import { v } from "convex/values"

import {
  fetchLumaEventDescription,
  mapWithConcurrency,
} from "./lumaEventDescription"
import { internal } from "./_generated/api"
import { internalAction, type ActionCtx } from "./_generated/server"
import {
  getLocationPreset,
  isLocationKey,
  LOCATION_PRESETS,
} from "./locationKeys"

const LUMA_BASE = "https://api2.luma.com"
const PAGE_SIZE = 50
const REQUEST_DELAY_MS = 200
const DESCRIPTION_BATCH_SIZE = 40
const DESCRIPTION_FETCH_CONCURRENCY = 6
const DESCRIPTION_REQUEST_DELAY_MS = 120

interface LumaCategoryResponse {
  entries: Array<{
    category: {
      api_id: string
      name: string
      slug: string
      description: string
      event_count: number
      icon_url?: string
      tint_color?: string
    }
    event_count: number
  }>
}

interface LumaEventResponse {
  entries: Array<{
    event: {
      api_id: string
      name: string | null
      cover_url: string | null
      start_at: string
      end_at: string
      timezone: string | null
      url: string | null
      location_type: string | null
      geo_address_info: {
        city: string | null
        city_state: string | null
        country: string | null
        address?: string | null
      } | null
    }
    calendar: {
      name: string | null
      avatar_url?: string | null
    }
    hosts: Array<{ name: string | null }>
    ticket_info?: { is_sold_out?: boolean | null } | null
  }>
  has_more: boolean
  next_cursor: string | null
}

interface SlimEvent {
  lumaId: string
  locationKey: string
  name: string
  coverUrl?: string
  startAt: string
  endAt: string
  timezone: string
  urlSlug: string
  locationType: string
  venueName?: string
  city?: string
  cityState?: string
  country?: string
  calendarName: string
  calendarAvatarUrl?: string
  hostNames: string[]
  isSoldOut?: boolean
  categorySlug: string
  searchText: string
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function optionalString(value: string | null | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function requiredString(
  value: string | null | undefined,
  fallback: string,
): string {
  return optionalString(value) ?? fallback
}

function toSlimEvent(
  entry: LumaEventResponse["entries"][number],
  categorySlug: string,
  locationKey: string,
): SlimEvent | null {
  const lumaId = optionalString(entry.event.api_id)
  const name = optionalString(entry.event.name)
  const startAt = optionalString(entry.event.start_at)
  const endAt = optionalString(entry.event.end_at)

  if (!lumaId || !name || !startAt || !endAt) {
    return null
  }

  const hostNames = entry.hosts
    .map((host) => optionalString(host.name))
    .filter((hostName): hostName is string => hostName !== undefined)

  const geo = entry.event.geo_address_info
  const calendarName = requiredString(entry.calendar.name, "Unknown organizer")

  return {
    lumaId,
    locationKey,
    name,
    coverUrl: optionalString(entry.event.cover_url),
    startAt,
    endAt,
    timezone: requiredString(entry.event.timezone, "UTC"),
    urlSlug: requiredString(entry.event.url, lumaId),
    locationType: requiredString(entry.event.location_type, "offline"),
    venueName: optionalString(geo?.address ?? undefined),
    city: optionalString(geo?.city ?? undefined),
    cityState: optionalString(geo?.city_state ?? undefined),
    country: optionalString(geo?.country ?? undefined),
    calendarName,
    calendarAvatarUrl: optionalString(entry.calendar.avatar_url ?? undefined),
    hostNames,
    isSoldOut: entry.ticket_info?.is_sold_out === true ? true : undefined,
    categorySlug,
    searchText: [
      name,
      calendarName,
      geo?.address,
      geo?.city,
      geo?.city_state,
      geo?.country,
      ...hostNames,
      categorySlug,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "luma-search/1.0",
      },
    })

    if (response.status === 403 && attempt < 4) {
      await sleep(1000 * (attempt + 1))
      continue
    }

    if (!response.ok) {
      throw new Error(`Luma API error: ${response.status} ${response.statusText}`)
    }

    return response.json() as Promise<T>
  }

  throw new Error("Luma API error: exhausted retries")
}

async function fetchCategoryPage(
  categorySlug: string,
  cursor: string | null,
  latitude: number,
  longitude: number,
): Promise<LumaEventResponse> {
  const params = new URLSearchParams({
    slug: categorySlug,
    pagination_limit: String(PAGE_SIZE),
    latitude: String(latitude),
    longitude: String(longitude),
  })

  if (cursor) {
    params.set("pagination_cursor", cursor)
  }

  return fetchJson<LumaEventResponse>(
    `${LUMA_BASE}/discover/get-paginated-events?${params}`,
  )
}

async function syncEventDescriptions(
  ctx: ActionCtx,
  locationKey: "nyc" | "sf",
  locationLabel: string,
) {
  let batch = 0
  let totalFetched = 0
  let totalPatched = 0

  while (true) {
    const pending = await ctx.runQuery(
      internal.lumaSync.listEventsMissingDescriptions,
      {
        locationKey,
        limit: DESCRIPTION_BATCH_SIZE,
      },
    )

    if (pending.length === 0) {
      break
    }

    batch += 1

    const updates = await mapWithConcurrency(
      pending,
      DESCRIPTION_FETCH_CONCURRENCY,
      async (event: { lumaId: string; urlSlug: string }) => {
        await sleep(DESCRIPTION_REQUEST_DELAY_MS)
        const description = await fetchLumaEventDescription(event.urlSlug)
        return {
          lumaId: event.lumaId,
          description: description ?? "",
        }
      },
    )

    await ctx.runMutation(internal.lumaSync.patchEventDescriptions, {
      updates,
    })

    const fetchedInBatch = updates.filter((update) => update.description.length > 0)
      .length
    totalFetched += fetchedInBatch
    totalPatched += updates.length

    console.log(
      `[${locationLabel}] descriptions batch ${batch}: ${fetchedInBatch}/${pending.length} fetched`,
    )
  }

  console.log(
    `[${locationLabel}] descriptions complete: ${totalFetched}/${totalPatched} events with text`,
  )
}

async function syncLocation(
  ctx: ActionCtx,
  locationKey: "nyc" | "sf",
  locationLabel: string,
  latitude: number,
  longitude: number,
) {
  const data = await fetchJson<LumaCategoryResponse>(
    `${LUMA_BASE}/discover/category/list-categories`,
  )

  const categories = data.entries.map((entry) => ({
    slug: entry.category.slug,
    name: entry.category.name,
  }))

  await ctx.runMutation(internal.lumaSync.beginSync, {
    locationKey,
    locationLabel,
  })
  await ctx.runMutation(internal.lumaSync.upsertCategories, { categories })

  for (const [index, category] of categories.entries()) {
    let cursor: string | null = null
    let page = 0

    while (true) {
      page += 1
      const pageData = await fetchCategoryPage(
        category.slug,
        cursor,
        latitude,
        longitude,
      )

      const events = pageData.entries
        .map((entry) => toSlimEvent(entry, category.slug, locationKey))
        .filter((event): event is SlimEvent => event !== null)

      if (events.length > 0) {
        await ctx.runMutation(internal.lumaSync.upsertEvents, { events })
      }

      console.log(
        `[${locationLabel}] [${index + 1}/${categories.length}] ${category.slug} page ${page}: ${events.length} events`,
      )

      if (!pageData.has_more || !pageData.next_cursor) {
        break
      }

      cursor = pageData.next_cursor
      await sleep(REQUEST_DELAY_MS)
    }

    await sleep(REQUEST_DELAY_MS)
  }

  await ctx.runMutation(internal.lumaSync.completeSync, {
    locationKey,
  })

  console.log(`[${locationLabel}] syncing event descriptions...`)
  await syncEventDescriptions(ctx, locationKey, locationLabel)
}

export const run = internalAction({
  args: {
    locationKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.locationKey && !isLocationKey(args.locationKey)) {
      throw new Error(`Unsupported location: ${args.locationKey}. Use nyc or sf.`)
    }

    const targets = args.locationKey
      ? [getLocationPreset(args.locationKey)!]
      : [...LOCATION_PRESETS]

    const results: Array<{ locationKey: string; ok: boolean; error?: string }> =
      []

    await ctx.runMutation(internal.lumaSync.purgeLegacyData, {})

    for (const location of targets) {
      try {
        console.log(`Starting sync for ${location.label}...`)
        await syncLocation(
          ctx,
          location.key,
          location.label,
          location.latitude,
          location.longitude,
        )
        results.push({ locationKey: location.key, ok: true })
        console.log(`Finished sync for ${location.label}`)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to sync Luma events"
        console.error(`Sync failed for ${location.label}:`, message)
        await ctx.runMutation(internal.lumaSync.markSyncFailed, {
          locationKey: location.key,
          message,
        })
        results.push({ locationKey: location.key, ok: false, error: message })
      }
    }

    return { results }
  },
})

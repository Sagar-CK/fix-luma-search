import { v } from "convex/values"

import { upsertEventByLumaId } from "./eventUpsert"
import { isLocationKey } from "./locationKeys"
import { internalMutation, internalQuery, type MutationCtx } from "./_generated/server"

const locationKeyValidator = v.string()

const categoryValidator = v.object({
  slug: v.string(),
  name: v.string(),
})

const eventValidator = v.object({
  lumaId: v.string(),
  locationKey: locationKeyValidator,
  name: v.string(),
  coverUrl: v.optional(v.string()),
  startAt: v.string(),
  endAt: v.string(),
  timezone: v.string(),
  urlSlug: v.string(),
  locationType: v.string(),
  venueName: v.optional(v.string()),
  city: v.optional(v.string()),
  cityState: v.optional(v.string()),
  country: v.optional(v.string()),
  calendarName: v.string(),
  calendarAvatarUrl: v.optional(v.string()),
  hostNames: v.array(v.string()),
  isSoldOut: v.optional(v.boolean()),
  categorySlug: v.string(),
  searchText: v.string(),
  description: v.optional(v.string()),
})

async function getOrCreateSyncStatus(
  ctx: MutationCtx,
  locationKey: string,
  locationLabel: string,
) {
  const existing = await ctx.db
    .query("syncStatus")
    .withIndex("by_location_key", (q) => q.eq("locationKey", locationKey))
    .unique()

  if (existing) {
    return existing
  }

  const id = await ctx.db.insert("syncStatus", {
    locationKey,
    locationLabel,
    isSyncing: false,
  })

  return (await ctx.db.get(id))!
}

export const purgeLegacyData = internalMutation({
  args: {},
  handler: async (ctx) => {
    let removedEvents = 0

    const events = await ctx.db.query("events").collect()
    for (const event of events) {
      if (!isLocationKey(event.locationKey)) {
        await ctx.db.delete(event._id)
        removedEvents += 1
      }
    }

    const syncRows = await ctx.db.query("syncStatus").collect()
    for (const row of syncRows) {
      if (!isLocationKey(row.locationKey)) {
        await ctx.db.delete(row._id)
      }
    }

    return { removedEvents }
  },
})

export const beginSync = internalMutation({
  args: {
    locationKey: locationKeyValidator,
    locationLabel: v.string(),
  },
  handler: async (ctx, args) => {
    const status = await getOrCreateSyncStatus(
      ctx,
      args.locationKey,
      args.locationLabel,
    )

    const existingEvents = await ctx.db
      .query("events")
      .withIndex("by_location_and_start", (q) =>
        q.eq("locationKey", args.locationKey),
      )
      .collect()

    for (const event of existingEvents) {
      await ctx.db.delete(event._id)
    }

    await ctx.db.patch(status._id, {
      isSyncing: true,
      lastError: undefined,
      locationLabel: args.locationLabel,
    })
  },
})

export const upsertCategories = internalMutation({
  args: {
    categories: v.array(categoryValidator),
  },
  handler: async (ctx, args) => {
    for (const category of args.categories) {
      const existing = await ctx.db
        .query("categories")
        .withIndex("by_slug", (q) => q.eq("slug", category.slug))
        .unique()

      if (existing) {
        await ctx.db.patch(existing._id, category)
      } else {
        await ctx.db.insert("categories", category)
      }
    }
  },
})

export const upsertEvents = internalMutation({
  args: {
    events: v.array(eventValidator),
  },
  handler: async (ctx, args) => {
    for (const event of args.events) {
      await upsertEventByLumaId(ctx, event)
    }
  },
})

export const completeSync = internalMutation({
  args: {
    locationKey: locationKeyValidator,
  },
  handler: async (ctx, args) => {
    const status = await ctx.db
      .query("syncStatus")
      .withIndex("by_location_key", (q) =>
        q.eq("locationKey", args.locationKey),
      )
      .unique()

    if (!status) {
      return
    }

    await ctx.db.patch(status._id, {
      isSyncing: false,
      lastSyncedAt: Date.now(),
      lastError: undefined,
    })
  },
})

export const markSyncFailed = internalMutation({
  args: {
    locationKey: locationKeyValidator,
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const status = await ctx.db
      .query("syncStatus")
      .withIndex("by_location_key", (q) =>
        q.eq("locationKey", args.locationKey),
      )
      .unique()

    if (!status) {
      return
    }

    await ctx.db.patch(status._id, {
      isSyncing: false,
      lastError: args.message,
    })
  },
})

const descriptionTargetValidator = v.object({
  lumaId: v.string(),
  urlSlug: v.string(),
})

export const listEventsMissingDescriptions = internalQuery({
  args: {
    locationKey: locationKeyValidator,
    limit: v.optional(v.number()),
  },
  returns: v.array(descriptionTargetValidator),
  handler: async (ctx, args) => {
    const take = args.limit ?? 50
    const events = await ctx.db
      .query("events")
      .withIndex("by_location_and_start", (q) =>
        q.eq("locationKey", args.locationKey),
      )
      .collect()

    return events
      .filter((event) => event.description === undefined)
      .slice(0, take)
      .map((event) => ({
        lumaId: event.lumaId,
        urlSlug: event.urlSlug,
      }))
  },
})

export const patchEventDescriptions = internalMutation({
  args: {
    updates: v.array(
      v.object({
        lumaId: v.string(),
        description: v.string(),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const update of args.updates) {
      const event = await ctx.db
        .query("events")
        .withIndex("by_luma_id", (q) => q.eq("lumaId", update.lumaId))
        .first()

      if (!event) {
        continue
      }

      await ctx.db.patch(event._id, {
        description: update.description,
      })
    }

    return null
  },
})

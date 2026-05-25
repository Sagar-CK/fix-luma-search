import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"

import type { Doc } from "./_generated/dataModel"
import type { QueryCtx } from "./_generated/server"
import { query } from "./_generated/server"

function normalizeCategorySlugs(categorySlugs?: string[]): string[] {
  return (categorySlugs ?? []).filter(Boolean)
}

async function countEventsForCategory(
  ctx: QueryCtx,
  locationKey: string,
  categorySlug: string,
): Promise<number> {
  const events = await ctx.db
    .query("events")
    .withIndex("by_location_category_and_start", (q) =>
      q.eq("locationKey", locationKey).eq("categorySlug", categorySlug),
    )
    .collect()

  return events.length
}

async function countEventsForLocation(
  ctx: QueryCtx,
  locationKey: string,
): Promise<number> {
  const events = await ctx.db
    .query("events")
    .withIndex("by_location_and_start", (q) => q.eq("locationKey", locationKey))
    .collect()

  return events.length
}

async function searchEventsForCategory(
  ctx: QueryCtx,
  locationKey: string,
  categorySlug: string,
  queryText: string,
  take: number,
): Promise<Doc<"events">[]> {
  return await ctx.db
    .query("events")
    .withSearchIndex("search_events", (q) =>
      q
        .search("searchText", queryText)
        .eq("locationKey", locationKey)
        .eq("categorySlug", categorySlug),
    )
    .take(take)
}

export const list = query({
  args: {
    locationKey: v.string(),
    categorySlugs: v.optional(v.array(v.string())),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const categorySlugs = normalizeCategorySlugs(args.categorySlugs)

    if (categorySlugs.length === 1) {
      return await ctx.db
        .query("events")
        .withIndex("by_location_category_and_start", (q) =>
          q
            .eq("locationKey", args.locationKey)
            .eq("categorySlug", categorySlugs[0]),
        )
        .order("asc")
        .paginate(args.paginationOpts)
    }

    if (categorySlugs.length > 1) {
      return await ctx.db
        .query("events")
        .withIndex("by_location_and_start", (q) =>
          q.eq("locationKey", args.locationKey),
        )
        .filter((q) =>
          q.or(
            ...categorySlugs.map((categorySlug) =>
              q.eq(q.field("categorySlug"), categorySlug),
            ),
          ),
        )
        .order("asc")
        .paginate(args.paginationOpts)
    }

    return await ctx.db
      .query("events")
      .withIndex("by_location_and_start", (q) =>
        q.eq("locationKey", args.locationKey),
      )
      .order("asc")
      .paginate(args.paginationOpts)
  },
})

export const count = query({
  args: {
    locationKey: v.string(),
    categorySlugs: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const categorySlugs = normalizeCategorySlugs(args.categorySlugs)

    if (categorySlugs.length === 0) {
      return await countEventsForLocation(ctx, args.locationKey)
    }

    let total = 0
    for (const categorySlug of categorySlugs) {
      total += await countEventsForCategory(
        ctx,
        args.locationKey,
        categorySlug,
      )
    }

    return total
  },
})

export const search = query({
  args: {
    locationKey: v.string(),
    query: v.string(),
    categorySlugs: v.optional(v.array(v.string())),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const trimmed = args.query.trim()
    if (!trimmed) {
      return []
    }

    const take = args.limit ?? 100
    const categorySlugs = normalizeCategorySlugs(args.categorySlugs)

    if (categorySlugs.length === 1) {
      return await searchEventsForCategory(
        ctx,
        args.locationKey,
        categorySlugs[0],
        trimmed,
        take,
      )
    }

    if (categorySlugs.length > 1) {
      const byId = new Map<string, Doc<"events">>()

      for (const categorySlug of categorySlugs) {
        const batch = await searchEventsForCategory(
          ctx,
          args.locationKey,
          categorySlug,
          trimmed,
          take,
        )

        for (const event of batch) {
          byId.set(event._id, event)
        }
      }

      return [...byId.values()].slice(0, take)
    }

    return await ctx.db
      .query("events")
      .withSearchIndex("search_events", (q) =>
        q.search("searchText", trimmed).eq("locationKey", args.locationKey),
      )
      .take(take)
  },
})

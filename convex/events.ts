import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"

import { query } from "./_generated/server"

export const list = query({
  args: {
    locationKey: v.string(),
    categorySlug: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    if (args.categorySlug && args.categorySlug !== "all") {
      return await ctx.db
        .query("events")
        .withIndex("by_location_category_and_start", (q) =>
          q
            .eq("locationKey", args.locationKey)
            .eq("categorySlug", args.categorySlug!),
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

export const search = query({
  args: {
    locationKey: v.string(),
    query: v.string(),
    categorySlug: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const trimmed = args.query.trim()
    if (!trimmed) {
      return []
    }

    const take = args.limit ?? 100

    if (args.categorySlug && args.categorySlug !== "all") {
      return await ctx.db
        .query("events")
        .withSearchIndex("search_events", (q) =>
          q
            .search("searchText", trimmed)
            .eq("locationKey", args.locationKey)
            .eq("categorySlug", args.categorySlug!),
        )
        .take(take)
    }

    return await ctx.db
      .query("events")
      .withSearchIndex("search_events", (q) =>
        q.search("searchText", trimmed).eq("locationKey", args.locationKey),
      )
      .take(take)
  },
})

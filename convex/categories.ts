import { v } from "convex/values"

import { query } from "./_generated/server"

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("categories").collect()
  },
})

export const listForLocation = query({
  args: {
    locationKey: v.string(),
  },
  handler: async (ctx, args) => {
    const categories = await ctx.db.query("categories").collect()
    const available = []

    for (const category of categories) {
      const hasEvents = await ctx.db
        .query("events")
        .withIndex("by_location_category_and_start", (q) =>
          q
            .eq("locationKey", args.locationKey)
            .eq("categorySlug", category.slug),
        )
        .first()

      if (hasEvents) {
        available.push(category)
      }
    }

    return available.sort((left, right) => left.name.localeCompare(right.name))
  },
})

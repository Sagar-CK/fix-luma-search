import { v } from "convex/values"

import { getNextSyncTimestamp } from "./locationKeys"
import { query } from "./_generated/server"

export const status = query({
  args: {
    locationKey: v.string(),
  },
  handler: async (ctx, args) => {
    const syncStatus = await ctx.db
      .query("syncStatus")
      .withIndex("by_location_key", (q) =>
        q.eq("locationKey", args.locationKey),
      )
      .unique()

    const cachedEventCount = (
      await ctx.db
        .query("events")
        .withIndex("by_location_and_start", (q) =>
          q.eq("locationKey", args.locationKey),
        )
        .collect()
    ).length

    const nextSyncAt = getNextSyncTimestamp(args.locationKey)

    return {
      syncStatus,
      cachedEventCount,
      nextSyncAt,
    }
  },
})

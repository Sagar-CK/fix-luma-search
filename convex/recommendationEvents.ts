import { v } from "convex/values"

import { internalQuery } from "./_generated/server"

const candidateValidator = v.object({
  lumaId: v.string(),
  name: v.string(),
  coverUrl: v.optional(v.string()),
  startAt: v.string(),
  endAt: v.string(),
  timezone: v.string(),
  urlSlug: v.string(),
  categorySlug: v.string(),
  locationType: v.string(),
  venueName: v.optional(v.string()),
  city: v.optional(v.string()),
  cityState: v.optional(v.string()),
  country: v.optional(v.string()),
  calendarName: v.string(),
  calendarAvatarUrl: v.optional(v.string()),
  hostNames: v.array(v.string()),
  isSoldOut: v.optional(v.boolean()),
  description: v.optional(v.string()),
})

export const listUpcomingWeek = internalQuery({
  args: {
    locationKey: v.string(),
    rangeStartIso: v.string(),
    rangeEndIso: v.string(),
  },
  returns: v.array(candidateValidator),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("events")
      .withIndex("by_location_and_start", (q) =>
        q
          .eq("locationKey", args.locationKey)
          .gte("startAt", args.rangeStartIso)
          .lte("startAt", args.rangeEndIso),
      )
      .collect()

    return rows
      .filter((event) => event.endAt >= args.rangeStartIso)
      .map((event) => ({
        lumaId: event.lumaId,
        name: event.name,
        coverUrl: event.coverUrl,
        startAt: event.startAt,
        endAt: event.endAt,
        timezone: event.timezone,
        urlSlug: event.urlSlug,
        categorySlug: event.categorySlug,
        locationType: event.locationType,
        venueName: event.venueName,
        city: event.city,
        cityState: event.cityState,
        country: event.country,
        calendarName: event.calendarName,
        calendarAvatarUrl: event.calendarAvatarUrl,
        hostNames: event.hostNames,
        isSoldOut: event.isSoldOut,
        description: event.description,
      }))
  },
})

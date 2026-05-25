import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  categories: defineTable({
    slug: v.string(),
    name: v.string(),
  }).index("by_slug", ["slug"]),

  events: defineTable({
    lumaId: v.string(),
    locationKey: v.string(),
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
    description: v.optional(v.string()),
    categorySlug: v.string(),
    searchText: v.string(),
  })
    .index("by_luma_id", ["lumaId"])
    .index("by_location_and_start", ["locationKey", "startAt"])
    .index("by_location_category_and_start", [
      "locationKey",
      "categorySlug",
      "startAt",
    ])
    .searchIndex("search_events", {
      searchField: "searchText",
      filterFields: ["locationKey", "categorySlug"],
    }),

  syncStatus: defineTable({
    locationKey: v.string(),
    locationLabel: v.string(),
    isSyncing: v.boolean(),
    lastSyncedAt: v.optional(v.number()),
    lastError: v.optional(v.string()),
  }).index("by_location_key", ["locationKey"]),
})

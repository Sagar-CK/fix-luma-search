import type { MutationCtx } from "./_generated/server"
import type { Doc } from "./_generated/dataModel"

type EventInsert = Omit<Doc<"events">, "_id" | "_creationTime">

export async function upsertEventByLumaId(
  ctx: MutationCtx,
  event: EventInsert,
): Promise<void> {
  const duplicates = await ctx.db
    .query("events")
    .withIndex("by_luma_id", (q) => q.eq("lumaId", event.lumaId))
    .collect()

  if (duplicates.length === 0) {
    await ctx.db.insert("events", event)
    return
  }

  const primary =
    duplicates.find((row) => row.locationKey === event.locationKey) ??
    duplicates[0]

  await ctx.db.patch(primary._id, event)

  for (const duplicate of duplicates) {
    if (duplicate._id !== primary._id) {
      await ctx.db.delete(duplicate._id)
    }
  }
}

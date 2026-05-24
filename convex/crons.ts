import { cronJobs } from "convex/server"

import { internal } from "./_generated/api"
import { LOCATION_PRESETS } from "./locationKeys"

const crons = cronJobs()

for (const location of LOCATION_PRESETS) {
  crons.cron(
    `sync-luma-${location.key}`,
    `${location.cronMinuteUtc} * * * *`,
    internal.lumaSyncActions.run,
    { locationKey: location.key },
  )
}

export default crons

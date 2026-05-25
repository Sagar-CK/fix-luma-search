"use node"

import { GoogleGenAI, type GenerateContentResponse } from "@google/genai"
import { v } from "convex/values"

import {
  extractResponseText,
  isTruncatedResponse,
  logAdvisorModelRequest,
  logAdvisorModelResponse,
  parseAdvisorModelPayload,
} from "./advisorModelResponse"
import { throwAdvisorError } from "./advisorErrors"
import { buildUserDescriptionFromProfileUrl } from "./profileFromUrl"
import { truncateDescription } from "./lumaEventDescription"
import { internal } from "./_generated/api"
import { action, type ActionCtx } from "./_generated/server"
import { getLocationPreset, isLocationKey } from "./locationKeys"

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash"
const MAX_USER_DESCRIPTION_LENGTH = 1200
const MIN_USER_DESCRIPTION_LENGTH = 12
const MAX_CANDIDATES_PER_DAY = 8
const MAX_TOTAL_MODEL_CANDIDATES = 56

const WEEK_PLAN_JSON_SCHEMA = {
  type: "object",
  properties: {
    intro: {
      type: "string",
      description: "Friendly 1-2 sentence summary of the plan.",
    },
    picks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "YYYY-MM-DD in the city timezone.",
          },
          lumaId: {
            type: "string",
            description:
              "Exact lumaId from the candidate list. Must be unique across all picks.",
          },
          reason: {
            type: "string",
            description:
              "One short, casual note (max 12 words) on why they'd like it. Sound like a friend, not a formal write-up.",
          },
        },
        required: ["date", "lumaId", "reason"],
      },
    },
  },
  required: ["intro", "picks"],
} as const

const eventSummaryValidator = v.object({
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
})

const dayPlanValidator = v.object({
  date: v.string(),
  dayLabel: v.string(),
  weekday: v.string(),
  reason: v.string(),
  event: v.union(eventSummaryValidator, v.null()),
})

const weekPlanReturnValidator = v.object({
  intro: v.string(),
  cityLabel: v.string(),
  days: v.array(dayPlanValidator),
})

interface CandidateEvent {
  lumaId: string
  name: string
  coverUrl?: string
  startAt: string
  endAt: string
  timezone: string
  urlSlug: string
  categorySlug: string
  locationType: string
  venueName?: string
  city?: string
  cityState?: string
  country?: string
  calendarName: string
  calendarAvatarUrl?: string
  hostNames: string[]
  isSoldOut?: boolean
  description?: string
}

type WeekPlanResult = {
  intro: string
  cityLabel: string
  days: Array<{
    date: string
    dayLabel: string
    weekday: string
    reason: string
    event: CandidateEvent | null
  }>
}

export const generateWeekPlan = action({
  args: {
    locationKey: v.string(),
    userDescription: v.optional(v.string()),
    profileUrl: v.optional(v.string()),
    nowIso: v.string(),
  },
  returns: weekPlanReturnValidator,
  handler: async (ctx, args): Promise<WeekPlanResult> => {
    return await buildWeekPlan(ctx, args)
  },
})

async function buildWeekPlan(
  ctx: ActionCtx,
  args: {
    locationKey: string
    userDescription?: string
    profileUrl?: string
    nowIso: string
  },
): Promise<WeekPlanResult> {
    if (!isLocationKey(args.locationKey)) {
      throwAdvisorError("UNSUPPORTED_CITY")
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) {
      throwAdvisorError("CONFIG")
    }

    const location = getLocationPreset(args.locationKey)!
    const ai = new GoogleGenAI({ apiKey })

    const profileUrl = args.profileUrl?.trim()
    let userDescription = args.userDescription?.trim() ?? ""

    if (profileUrl) {
      try {
        userDescription = await buildUserDescriptionFromProfileUrl({
          ai,
          model: GEMINI_MODEL,
          profileUrl,
          cityLabel: location.label,
          maxLength: MAX_USER_DESCRIPTION_LENGTH,
        })
      } catch (error) {
        console.warn("[event-advisor] profile url failed", {
          profileUrl,
          error,
        })
        throwAdvisorError("VALIDATION")
      }
    }

    if (userDescription.length < MIN_USER_DESCRIPTION_LENGTH) {
      throwAdvisorError("VALIDATION")
    }
    if (userDescription.length > MAX_USER_DESCRIPTION_LENGTH) {
      throwAdvisorError("VALIDATION")
    }

    const timezone =
      args.locationKey === "sf" ? "America/Los_Angeles" : "America/New_York"
    const now = new Date(args.nowIso)
    const weekEnd = new Date(now.getTime() + 7 * 86_400_000)

    const candidates: CandidateEvent[] = await ctx.runQuery(
      internal.recommendationEvents.listUpcomingWeek,
      {
        locationKey: args.locationKey,
        rangeStartIso: args.nowIso,
        rangeEndIso: weekEnd.toISOString(),
      },
    )

    const dayPlans = buildUpcomingDays(now, timezone)

    if (candidates.length === 0) {
      return {
        intro:
          "I couldn't find upcoming events in the next week for this city yet. Try again after the next sync.",
        cityLabel: location.label,
        days: dayPlans.map((day) => ({
          date: day.date,
          dayLabel: day.dayLabel,
          weekday: day.weekday,
          reason: "No events available to recommend yet.",
          event: null,
        })),
      }
    }

    const modelPool = capCandidatesForModel(candidates, timezone)
    const modelCandidates = modelPool.map((event) => toModelCandidate(event, timezone))

    const prompt = buildPrompt({
      cityLabel: location.label,
      userDescription,
      dates: dayPlans.map((day) => day.date),
      candidates: modelCandidates,
    })

    logAdvisorModelRequest({
      model: GEMINI_MODEL,
      locationKey: args.locationKey,
      cityLabel: location.label,
      profileUrl,
      userDescription,
      dates: dayPlans.map((day) => day.date),
      totalCandidateCount: candidates.length,
      modelCandidateCount: modelCandidates.length,
      candidates: modelCandidates,
      prompt,
    })

    let parsed: {
      intro: string
      picks: Array<{ date: string; lumaId: string; reason: string }>
    }

    try {
      parsed = await requestAdvisorPlan(ai, prompt)
    } catch (requestError) {
      console.warn("[event-advisor] model request failed", requestError)
      throwAdvisorError("AI_PARSE")
    }

    const candidateById = new Map<string, CandidateEvent>(
      candidates.map((event) => [event.lumaId, event]),
    )
    const usedIds = new Set<string>()
    const recommendationByDate = new Map<
      string,
      { lumaId: string; reason: string }
    >()

    for (const pick of parsed.picks ?? []) {
      if (recommendationByDate.has(pick.date)) {
        continue
      }

      const event = candidateById.get(pick.lumaId)
      if (!event || usedIds.has(event.lumaId)) {
        continue
      }

      if (!eventStartsOnDate(event.startAt, event.timezone, pick.date)) {
        continue
      }

      usedIds.add(event.lumaId)
      recommendationByDate.set(pick.date, {
        lumaId: pick.lumaId,
        reason: pick.reason.trim(),
      })
    }

    fillMissingDays(dayPlans, candidates, usedIds, recommendationByDate)

    return {
      intro: parsed.intro?.trim() || "Here's a week of events picked for you.",
      cityLabel: location.label,
      days: dayPlans.map((day) => {
        const pick = recommendationByDate.get(day.date)
        const event = pick ? (candidateById.get(pick.lumaId) ?? null) : null

        return {
          date: day.date,
          dayLabel: day.dayLabel,
          weekday: day.weekday,
          reason:
            pick?.reason ??
            (event
              ? "Could be a good fit."
              : "Nothing stood out this day."),
          event: event
            ? {
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
              }
            : null,
        }
      }),
    }
}

interface DayPlanSeed {
  date: string
  dayLabel: string
  weekday: string
}

async function requestAdvisorPlan(
  ai: GoogleGenAI,
  prompt: string,
): Promise<{
  intro: string
  picks: Array<{ date: string; lumaId: string; reason: string }>
}> {
  let lastParseError: unknown

  for (let attempt = 0; attempt < 2; attempt += 1) {
    let response: GenerateContentResponse

    try {
      response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: advisorModelConfig(attempt),
      })
    } catch (error) {
      console.warn(`[event-advisor] model call failed on attempt ${attempt + 1}`, error)
      throwAdvisorError("AI_UNAVAILABLE")
    }

    logAdvisorModelResponse(response, {
      attempt: attempt + 1,
      model: GEMINI_MODEL,
    })

    try {
      return parseResponsePayload(response)
    } catch (error) {
      lastParseError = error
      console.warn(`[event-advisor] parse failed on attempt ${attempt + 1}`, error)
    }
  }

  throw lastParseError ?? new Error("advisor parse failed")
}

function advisorModelConfig(attempt: number) {
  return {
    responseMimeType: "application/json" as const,
    responseJsonSchema: WEEK_PLAN_JSON_SCHEMA,
    maxOutputTokens: attempt === 0 ? 2048 : 4096,
    thinkingConfig: {
      thinkingBudget: 0,
    },
  }
}

function parseResponsePayload(response: GenerateContentResponse) {
  const rawText = extractResponseText(response)
  if (!rawText) {
    throw new Error("empty model response")
  }

  if (isTruncatedResponse(response)) {
    throw new Error("truncated model response")
  }

  return parseAdvisorModelPayload(rawText)
}

function buildUpcomingDays(now: Date, timezone: string): DayPlanSeed[] {
  const days: DayPlanSeed[] = []

  for (let offset = 0; offset < 7; offset += 1) {
    const date = new Date(now.getTime() + offset * 86_400_000)
    const dateKey = formatDateKey(date, timezone)
    const dayLabel = formatDayLabel(date, timezone, offset)
    const weekday = new Intl.DateTimeFormat(undefined, {
      timeZone: timezone,
      weekday: "long",
    }).format(date)

    days.push({ date: dateKey, dayLabel, weekday })
  }

  return days
}

function formatDateKey(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

function formatDayLabel(date: Date, timezone: string, offset: number): string {
  if (offset === 0) {
    return "Today"
  }
  if (offset === 1) {
    return "Tomorrow"
  }

  return new Intl.DateTimeFormat(undefined, {
    timeZone: timezone,
    month: "short",
    day: "numeric",
  }).format(date)
}

function eventStartsOnDate(
  startAt: string,
  timezone: string,
  dateKey: string,
): boolean {
  return formatDateKey(new Date(startAt), timezone) === dateKey
}

function fillMissingDays(
  dayPlans: DayPlanSeed[],
  candidates: Array<{ lumaId: string; startAt: string; timezone: string }>,
  usedIds: Set<string>,
  recommendationByDate: Map<string, { lumaId: string; reason: string }>,
) {
  for (const day of dayPlans) {
    if (recommendationByDate.has(day.date)) {
      continue
    }

    const fallback = candidates.find(
      (event) =>
        !usedIds.has(event.lumaId) &&
        eventStartsOnDate(event.startAt, event.timezone, day.date),
    )

    if (!fallback) {
      continue
    }

    usedIds.add(fallback.lumaId)
    recommendationByDate.set(day.date, {
      lumaId: fallback.lumaId,
      reason: "Popular pick for the day.",
    })
  }
}

function capCandidatesForModel(
  candidates: CandidateEvent[],
  timezone: string,
): CandidateEvent[] {
  const byDay = new Map<string, CandidateEvent[]>()

  for (const event of candidates) {
    if (event.isSoldOut) {
      continue
    }

    const day = formatDateKey(new Date(event.startAt), timezone)
    const bucket = byDay.get(day) ?? []
    bucket.push(event)
    byDay.set(day, bucket)
  }

  const capped: CandidateEvent[] = []

  for (const events of byDay.values()) {
    const sorted = [...events].sort((left, right) =>
      left.startAt.localeCompare(right.startAt),
    )
    capped.push(...sorted.slice(0, MAX_CANDIDATES_PER_DAY))
  }

  capped.sort((left, right) => left.startAt.localeCompare(right.startAt))
  return capped.slice(0, MAX_TOTAL_MODEL_CANDIDATES)
}

interface ModelCandidate {
  id: string
  name: string
  day: string
  time: string
  cat: string
  where: string
  host: string
  desc?: string
}

function toModelCandidate(
  event: CandidateEvent,
  timezone: string,
): ModelCandidate {
  const candidate: ModelCandidate = {
    id: event.lumaId,
    name: event.name,
    day: formatDateKey(new Date(event.startAt), timezone),
    time: formatLocalTime(event.startAt, timezone),
    cat: event.categorySlug,
    where: compactWhere(event),
    host: event.hostNames[0] ?? event.calendarName,
  }

  if (event.description && event.description.trim().length > 0) {
    candidate.desc = truncateDescription(event.description)
  }

  return candidate
}

function formatLocalTime(startAt: string, timezone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(startAt))
}

function compactWhere(event: CandidateEvent): string {
  if (event.locationType === "online") {
    return "Online"
  }

  return (
    event.venueName ??
    event.cityState ??
    event.city ??
    event.locationType
  )
}

function buildPrompt({
  cityLabel,
  userDescription,
  dates,
  candidates,
}: {
  cityLabel: string
  userDescription: string
  dates: string[]
  candidates: ModelCandidate[]
}): string {
  return [
    `Curate 7 days of Luma events in ${cityLabel}.`,
    "Respond with JSON only: { intro: string, picks: [{ date, lumaId, reason }] }.",
    "Use exact candidate id values. Use desc to match user interests. One unique event per day when possible.",
    "Match event day to pick date. Skip days with no good fit.",
    "Keep intro to 1-2 casual sentences.",
    "For each pick, reason is a muted caption under the card: max 12 words, friendly and specific.",
    "Examples: 'Good if you want to meet founders.' 'You'll like this if you're into AI.'",
    "Don't repeat the event name in the reason.",
    "",
    `User: ${userDescription}`,
    `Dates: ${dates.join(", ")}`,
    `Candidates: ${JSON.stringify(candidates)}`,
  ].join("\n")
}

import type { GenerateContentResponse } from "@google/genai"

export interface AdvisorModelPayload {
  intro: string
  picks: Array<{ date: string; lumaId: string; reason: string }>
}

export function extractResponseText(
  response: GenerateContentResponse,
): string | undefined {
  const primary = response.text?.trim()
  if (primary) {
    return primary
  }

  const parts = response.candidates?.[0]?.content?.parts ?? []
  const joined = parts
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("")
    .trim()

  return joined.length > 0 ? joined : undefined
}

export interface AdvisorModelRequestLog {
  model: string
  locationKey: string
  cityLabel: string
  profileUrl?: string
  userDescription: string
  dates: string[]
  totalCandidateCount: number
  modelCandidateCount: number
  candidates: unknown[]
  prompt: string
}

export function logAdvisorModelRequest(payload: AdvisorModelRequestLog): void {
  console.log("[event-advisor] model request", {
    model: payload.model,
    locationKey: payload.locationKey,
    cityLabel: payload.cityLabel,
    profileUrl: payload.profileUrl ?? null,
    userDescription: payload.userDescription,
    dates: payload.dates,
    totalCandidateCount: payload.totalCandidateCount,
    modelCandidateCount: payload.modelCandidateCount,
    candidates: payload.candidates,
    promptLength: payload.prompt.length,
    prompt: payload.prompt,
  })
}

export function logAdvisorModelResponse(
  response: GenerateContentResponse,
  context: { attempt: number; model: string },
): void {
  const candidate = response.candidates?.[0]
  const rawText = extractResponseText(response)

  console.log("[event-advisor] model response", {
    attempt: context.attempt,
    model: context.model,
    responseId: response.responseId,
    modelVersion: response.modelVersion,
    finishReason: candidate?.finishReason,
    usageMetadata: response.usageMetadata,
    rawText: rawText ?? null,
    parts: candidate?.content?.parts ?? null,
  })
}

export function parseAdvisorModelPayload(rawText: string): AdvisorModelPayload {
  const parsed = parseLooseJson(rawText)

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("invalid payload shape")
  }

  const record = parsed as Record<string, unknown>
  const intro =
    typeof record.intro === "string" ? record.intro.trim() : ""
  const picks = normalizePicks(record.picks)

  return { intro, picks }
}

function normalizePicks(value: unknown): AdvisorModelPayload["picks"] {
  if (!Array.isArray(value)) {
    return []
  }

  const picks: AdvisorModelPayload["picks"] = []

  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue
    }

    const pick = item as Record<string, unknown>
    const date = typeof pick.date === "string" ? pick.date.trim() : ""
    const lumaId =
      typeof pick.lumaId === "string"
        ? pick.lumaId.trim()
        : typeof pick.id === "string"
          ? pick.id.trim()
          : ""
    const reason = typeof pick.reason === "string" ? pick.reason.trim() : ""

    if (!date || !lumaId) {
      continue
    }

    picks.push({ date, lumaId, reason })
  }

  return picks
}

function parseLooseJson(rawText: string): unknown {
  const trimmed = rawText.trim()

  try {
    return JSON.parse(trimmed)
  } catch {
    // continue
  }

  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  if (fenced) {
    return JSON.parse(fenced[1].trim())
  }

  const start = trimmed.indexOf("{")
  const end = trimmed.lastIndexOf("}")
  if (start !== -1 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1))
  }

  throw new Error("invalid json")
}

export function isTruncatedResponse(response: GenerateContentResponse): boolean {
  return response.candidates?.[0]?.finishReason === "MAX_TOKENS"
}

import { ConvexError } from "convex/values"

import type { AdvisorInputMode } from "@/lib/advisor-preferences"

export type AdvisorErrorCode =
  | "VALIDATION"
  | "UNSUPPORTED_CITY"
  | "NO_EVENTS"
  | "AI_UNAVAILABLE"
  | "AI_PARSE"
  | "CONFIG"

interface AdvisorErrorPayload {
  code: AdvisorErrorCode
}

export interface AdvisorFailure {
  code: AdvisorErrorCode | "UNKNOWN"
  title: string
  message: string
  canRetry: boolean
}

const FAILURE_COPY: Record<
  AdvisorErrorCode,
  Pick<AdvisorFailure, "title" | "message" | "canRetry">
> = {
  VALIDATION: {
    title: "Check your input",
    message: "Something in your request needs a quick fix.",
    canRetry: true,
  },
  UNSUPPORTED_CITY: {
    title: "City not supported",
    message: "The event advisor only works for New York and San Francisco right now.",
    canRetry: false,
  },
  NO_EVENTS: {
    title: "No events yet",
    message:
      "There aren't enough upcoming events to build a week. Try again after the next sync.",
    canRetry: true,
  },
  AI_UNAVAILABLE: {
    title: "Advisor unavailable",
    message:
      "We couldn't reach the recommendation service. Wait a moment and try again.",
    canRetry: true,
  },
  AI_PARSE: {
    title: "Couldn't build your plan",
    message: "Something went wrong while putting your week together. Try again.",
    canRetry: true,
  },
  CONFIG: {
    title: "Advisor unavailable",
    message: "The event advisor isn't set up yet. Check back soon.",
    canRetry: false,
  },
}

const UNKNOWN_FAILURE: AdvisorFailure = {
  code: "UNKNOWN",
  title: "Something went wrong",
  message: "We couldn't build your week right now. Try again in a moment.",
  canRetry: true,
}

const VALIDATION_HINTS: Record<AdvisorInputMode, string> = {
  describe: "Add a sentence or two about yourself.",
  preset: "Pick at least one filter or add a note.",
  link: "Couldn't read that link. Try another URL.",
}

function isAdvisorErrorCode(value: string): value is AdvisorErrorCode {
  return value in FAILURE_COPY
}

function parseAdvisorErrorPayload(error: unknown): AdvisorErrorPayload | null {
  if (error instanceof ConvexError) {
    const data = error.data
    if (
      data &&
      typeof data === "object" &&
      "code" in data &&
      typeof data.code === "string" &&
      isAdvisorErrorCode(data.code)
    ) {
      return { code: data.code }
    }
  }

  return null
}

export function getAdvisorValidationHint(mode: AdvisorInputMode): string {
  return VALIDATION_HINTS[mode]
}

export function resolveAdvisorFailure(error: unknown): AdvisorFailure {
  const payload = parseAdvisorErrorPayload(error)
  if (payload) {
    return {
      code: payload.code,
      ...FAILURE_COPY[payload.code],
    }
  }

  if (import.meta.env.DEV) {
    console.error("[event-advisor]", error)
  }

  return UNKNOWN_FAILURE
}

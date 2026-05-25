import { ConvexError } from "convex/values"

export type AdvisorErrorCode =
  | "VALIDATION"
  | "UNSUPPORTED_CITY"
  | "NO_EVENTS"
  | "AI_UNAVAILABLE"
  | "AI_PARSE"
  | "CONFIG"

export function advisorError(code: AdvisorErrorCode): ConvexError<{ code: string }> {
  return new ConvexError({ code })
}

export function throwAdvisorError(code: AdvisorErrorCode): never {
  throw advisorError(code)
}

import { GoogleGenAI } from "@google/genai"

import {
  buildUserDescriptionFromProfileUrl,
  scrapePageHints,
} from "../convex/profileFromUrl"

const profileUrl = process.argv[2] ?? "https://www.linkedin.com/in/reti-eedra/"
const cityLabel = process.argv[3] ?? "New York"

const hints = await scrapePageHints(profileUrl)
console.log("=== SCRAPED HINTS ===")
console.log(hints ?? "(empty)")
console.log()

if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
  console.log("Set GOOGLE_GENERATIVE_AI_API_KEY to test Gemini synthesis.")
  process.exit(hints ? 0 : 1)
}

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY })
const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash"

const description = await buildUserDescriptionFromProfileUrl({
  ai,
  model,
  profileUrl,
  cityLabel,
  maxLength: 1200,
})

console.log("=== ADVISOR DESCRIPTION ===")
console.log(description)

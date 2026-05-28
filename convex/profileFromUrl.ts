"use node"

import { GoogleGenAI } from "@google/genai"

import { extractResponseText } from "./advisorModelResponse"

const PROFILE_HOSTS = new Set([
  "linkedin.com",
  "x.com",
  "twitter.com",
])

const BLOCKED_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"])

const LINKEDIN_CRAWLER_USER_AGENTS = [
  "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
  "Twitterbot/1.0",
  "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
  "WhatsApp/2.19.81 A",
] as const

const LINKEDIN_FETCH_ROUNDS = 3
const LINKEDIN_FETCH_RETRY_DELAY_MS = 400

const FXTWITTER_API_BASE = "https://api.fxtwitter.com"
const X_RECENT_POSTS_LIMIT = 3

const X_RESERVED_PATHS = new Set([
  "explore",
  "home",
  "i",
  "intent",
  "messages",
  "search",
  "settings",
])

const USELESS_PAGE_HINT_PATTERNS = [
  /javascript is not available/i,
  /enable javascript/i,
] as const

const META_TAG_PATTERN =
  /<meta[^>]+(?:property|name)=["']([^"']+)["'][^>]+content=["']([^"']+)["'][^>]*>/gi

const JSON_LD_PATTERN =
  /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi

export function normalizeProfileUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) {
    return null
  }

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`
    const url = new URL(withProtocol)

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null
    }

    url.protocol = "https:"
    url.hash = ""
    return url.toString()
  } catch {
    return null
  }
}

export function isSupportedProfileUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "")

    if (BLOCKED_HOSTS.has(host)) {
      return false
    }

    if (host.endsWith(".local")) {
      return false
    }

    if (PROFILE_HOSTS.has(host)) {
      return true
    }

    return parsed.protocol === "https:"
  } catch {
    return false
  }
}

export function isLinkedInProfileUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "")
    return host === "linkedin.com" || host.endsWith(".linkedin.com")
  } catch {
    return false
  }
}

export function isXProfileUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "")
    return host === "x.com" || host.endsWith(".x.com") || host === "twitter.com" || host.endsWith(".twitter.com")
  } catch {
    return false
  }
}

function extractXScreenName(url: string): string | null {
  try {
    const segments = new URL(url).pathname.split("/").filter(Boolean)
    if (segments.length === 0) {
      return null
    }

    const handle = segments[0] ?? ""
    if (!handle || X_RESERVED_PATHS.has(handle.toLowerCase())) {
      return null
    }

    return handle
  } catch {
    return null
  }
}

type FxTwitterUser = {
  name?: string
  screen_name?: string
  description?: string
  location?: string
  website?: {
    display_url?: string
    url?: string
  }
}

type FxTwitterStatus = {
  text?: string
}

type FxTwitterApiResponse<T> = {
  code?: number
} & T

function formatXProfileHints(
  user: FxTwitterUser,
  statuses: FxTwitterStatus[],
): string {
  const parts: string[] = []

  if (user.name && user.screen_name) {
    parts.push(`${user.name} (@${user.screen_name})`)
  } else if (user.name) {
    parts.push(user.name)
  }

  if (user.description) {
    parts.push(`Bio: ${user.description}`)
  }

  if (user.location) {
    parts.push(`Location: ${user.location}`)
  }

  const website = user.website?.display_url ?? user.website?.url
  if (website) {
    parts.push(`Website: ${website}`)
  }

  for (const status of statuses) {
    const text = status.text?.replace(/\s+/g, " ").trim()
    if (text) {
      parts.push(`Recent post: ${text.slice(0, 280)}`)
    }
  }

  return parts.join("\n").slice(0, 2500)
}

async function fetchFxTwitterJson<T>(
  path: string,
): Promise<FxTwitterApiResponse<T> | undefined> {
  try {
    const response = await fetch(`${FXTWITTER_API_BASE}${path}`, {
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (compatible; luma-search/1.0; +https://sagarck.com)",
      },
    })

    if (!response.ok) {
      return undefined
    }

    const data = (await response.json()) as FxTwitterApiResponse<T>
    if (data.code !== 200) {
      return undefined
    }

    return data
  } catch (error) {
    console.warn("[profile-from-url] fxtwitter fetch failed", path, error)
    return undefined
  }
}

async function scrapeXPageHints(url: string): Promise<string | undefined> {
  const handle = extractXScreenName(url)
  if (!handle) {
    return undefined
  }

  const encodedHandle = encodeURIComponent(handle)
  const [profileData, statusesData] = await Promise.all([
    fetchFxTwitterJson<{ user?: FxTwitterUser }>(`/2/profile/${encodedHandle}`),
    fetchFxTwitterJson<{ results?: FxTwitterStatus[] }>(
      `/2/profile/${encodedHandle}/statuses?count=${X_RECENT_POSTS_LIMIT}`,
    ),
  ])

  if (!profileData?.user) {
    return undefined
  }

  const statuses =
    statusesData?.results?.slice(0, X_RECENT_POSTS_LIMIT) ?? []
  const hints = formatXProfileHints(profileData.user, statuses)
  return hints.length > 0 ? hints : undefined
}

function isUselessPageHints(text: string): boolean {
  return USELESS_PAGE_HINT_PATTERNS.some((pattern) => pattern.test(text))
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
}

function extractMetaContent(html: string, key: string): string | undefined {
  META_TAG_PATTERN.lastIndex = 0

  for (const match of html.matchAll(META_TAG_PATTERN)) {
    if (match[1]?.toLowerCase() === key.toLowerCase()) {
      const content = decodeHtml(match[2] ?? "")
      if (content.length > 0) {
        return content
      }
    }
  }

  return undefined
}

function extractTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (!match) {
    return undefined
  }

  const title = decodeHtml(match[1] ?? "")
  return title.length > 0 ? title : undefined
}

function stripHtmlToText(html: string): string {
  return decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
}

function parseLinkedInOpenGraphDescription(description: string): string[] {
  const segments = description
    .split(" · ")
    .map((segment) => segment.trim())
    .filter(Boolean)

  if (segments.length === 0) {
    return []
  }

  const hints: string[] = []
  const [headline, ...rest] = segments

  if (headline && !headline.startsWith("Experience:")) {
    hints.push(`Headline: ${headline}`)
  }

  for (const segment of rest) {
    if (
      segment.startsWith("Experience:") ||
      segment.startsWith("Education:") ||
      segment.startsWith("Location:")
    ) {
      hints.push(segment)
      continue
    }

    if (
      !segment.includes("connections on LinkedIn") &&
      !segment.startsWith("View ") &&
      headline &&
      segment !== headline &&
      !hints.some((hint) => hint.includes(segment))
    ) {
      hints.push(`Bio: ${segment}`)
    }
  }

  return hints
}

function extractLinkedInPostHints(html: string, maxPosts = 3): string[] {
  JSON_LD_PATTERN.lastIndex = 0
  const hints: string[] = []

  for (const match of html.matchAll(JSON_LD_PATTERN)) {
    try {
      const data = JSON.parse(match[1] ?? "") as {
        "@graph"?: Array<Record<string, unknown>>
      }
      const graphItems = Array.isArray(data["@graph"])
        ? data["@graph"]
        : [data as Record<string, unknown>]

      for (const item of graphItems) {
        if (item["@type"] !== "DiscussionForumPosting") {
          continue
        }

        const text =
          typeof item.text === "string" ? item.text.trim() : ""
        if (!text) {
          continue
        }

        hints.push(`Recent post: ${text.slice(0, 280)}`)
        if (hints.length >= maxPosts) {
          return hints
        }
      }
    } catch {
      // ignore malformed JSON-LD blocks
    }
  }

  return hints
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function hasLinkedInProfileData(html: string): boolean {
  const description =
    extractMetaContent(html, "og:description") ??
    extractMetaContent(html, "description")
  if (description && description.length > 20) {
    return true
  }

  const title =
    extractMetaContent(html, "og:title") ?? extractTitle(html) ?? ""
  return title.length > 0 && title !== "LinkedIn" && title.includes("|")
}

export function extractLinkedInPageHints(html: string): string | undefined {
  const title =
    extractMetaContent(html, "og:title") ?? extractTitle(html) ?? undefined
  const description =
    extractMetaContent(html, "og:description") ??
    extractMetaContent(html, "description") ??
    undefined

  const parts = [
    title,
    ...(description ? parseLinkedInOpenGraphDescription(description) : []),
    ...extractLinkedInPostHints(html),
  ].filter((part): part is string => Boolean(part && part.length > 0))

  if (parts.length > 0) {
    return parts.join("\n").slice(0, 2500)
  }

  return undefined
}

async function fetchLinkedInHtml(url: string): Promise<string | undefined> {
  for (let round = 0; round < LINKEDIN_FETCH_ROUNDS; round += 1) {
    for (const userAgent of LINKEDIN_CRAWLER_USER_AGENTS) {
      try {
        const response = await fetch(url, {
          headers: {
            Accept: "text/html,application/xhtml+xml",
            "Accept-Language": "en-US,en;q=0.9",
            "User-Agent": userAgent,
          },
          redirect: "follow",
        })

        const html = await response.text()
        if (hasLinkedInProfileData(html)) {
          return html
        }
      } catch (error) {
        console.warn("[profile-from-url] linkedin fetch failed", userAgent, error)
      }
    }

    if (round < LINKEDIN_FETCH_ROUNDS - 1) {
      await sleep(LINKEDIN_FETCH_RETRY_DELAY_MS)
    }
  }

  return undefined
}

async function fetchDefaultHtml(url: string): Promise<string | undefined> {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent":
          "Mozilla/5.0 (compatible; luma-search/1.0; +https://sagarck.com)",
      },
      redirect: "follow",
    })

    if (!response.ok) {
      return undefined
    }

    return await response.text()
  } catch (error) {
    console.warn("[profile-from-url] scrape failed", url, error)
    return undefined
  }
}

function extractDefaultPageHints(html: string): string | undefined {
  const title =
    extractMetaContent(html, "og:title") ?? extractTitle(html) ?? undefined
  const description =
    extractMetaContent(html, "og:description") ??
    extractMetaContent(html, "description") ??
    undefined

  const parts = [title, description].filter(
    (part): part is string => Boolean(part && part.length > 0),
  )

  if (parts.length > 0) {
    const combined = parts.join("\n").slice(0, 1500)
    return isUselessPageHints(combined) ? undefined : combined
  }

  const bodyText = stripHtmlToText(html).slice(0, 1500)
  if (bodyText.length === 0 || isUselessPageHints(bodyText)) {
    return undefined
  }

  return bodyText
}

export async function scrapePageHints(url: string): Promise<string | undefined> {
  if (isLinkedInProfileUrl(url)) {
    const html = await fetchLinkedInHtml(url)
    if (!html) {
      return undefined
    }

    return extractLinkedInPageHints(html)
  }

  if (isXProfileUrl(url)) {
    return await scrapeXPageHints(url)
  }

  const html = await fetchDefaultHtml(url)
  if (!html) {
    return undefined
  }

  return extractDefaultPageHints(html)
}

async function summarizeProfileFromHints({
  ai,
  model,
  profileUrl,
  cityLabel,
  pageHints,
  maxLength,
}: {
  ai: GoogleGenAI
  model: string
  profileUrl: string
  cityLabel: string
  pageHints: string
  maxLength: number
}): Promise<string | undefined> {
  const response = await ai.models.generateContent({
    model,
    contents: [
      `Summarize this public profile for picking in-person events in ${cityLabel}.`,
      `Profile URL: ${profileUrl}`,
      `Scraped profile hints:\n${pageHints}`,
      "Return 2-4 plain-text sentences about their role, interests, and the kinds of events they'd enjoy.",
    ].join("\n\n"),
    config: {
      thinkingConfig: {
        thinkingBudget: 0,
      },
      maxOutputTokens: 512,
    },
  })

  const text = extractResponseText(response)
  if (text && text.length >= 12) {
    return text.slice(0, maxLength)
  }

  return undefined
}

async function fetchProfileViaUrlContext({
  ai,
  model,
  profileUrl,
  cityLabel,
  pageHints,
  maxLength,
}: {
  ai: GoogleGenAI
  model: string
  profileUrl: string
  cityLabel: string
  pageHints?: string
  maxLength: number
}): Promise<string | undefined> {
  const hintSuffix = pageHints
    ? ` Scraped page hints: ${pageHints.slice(0, 500)}`
    : ""

  const prompt = `Visit ${profileUrl} and write 2-4 plain sentences about who this person is and what in-person events in ${cityLabel} they might enjoy.${hintSuffix}`

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          tools: [{ urlContext: {} }],
          maxOutputTokens: 512,
        },
      })

      const text = extractResponseText(response)
      if (text && text.length >= 12) {
        return text.slice(0, maxLength)
      }
    } catch (error) {
      const retriable =
        error instanceof Error &&
        /503|429|UNAVAILABLE|RESOURCE_EXHAUSTED/i.test(error.message)

      if (!retriable || attempt === 1) {
        throw error
      }
    }
  }

  return undefined
}

export async function extractProfileDescription({
  ai,
  model,
  profileUrl,
  cityLabel,
  pageHints,
  maxLength,
}: {
  ai: GoogleGenAI
  model: string
  profileUrl: string
  cityLabel: string
  pageHints?: string
  maxLength: number
}): Promise<string> {
  const trimmedHints = pageHints?.trim()

  if (trimmedHints && trimmedHints.length >= 40) {
    try {
      const summarized = await summarizeProfileFromHints({
        ai,
        model,
        profileUrl,
        cityLabel,
        pageHints: trimmedHints,
        maxLength,
      })
      if (summarized) {
        return summarized
      }
    } catch (error) {
      console.warn(
        "[profile-from-url] gemini hint synthesis failed",
        profileUrl,
        error,
      )
    }
  }

  if (!isLinkedInProfileUrl(profileUrl) && !isXProfileUrl(profileUrl)) {
    try {
      const fromUrl = await fetchProfileViaUrlContext({
        ai,
        model,
        profileUrl,
        cityLabel,
        pageHints: trimmedHints,
        maxLength,
      })
      if (fromUrl) {
        return fromUrl
      }
    } catch (error) {
      console.warn("[profile-from-url] gemini url context failed", profileUrl, error)
    }
  }

  if (trimmedHints && trimmedHints.length >= 12) {
    return `Public profile summary from ${profileUrl}:\n${trimmedHints}`.slice(
      0,
      maxLength,
    )
  }

  throw new Error("profile summary empty")
}

export async function buildUserDescriptionFromProfileUrl({
  ai,
  model,
  profileUrl,
  cityLabel,
  maxLength,
}: {
  ai: GoogleGenAI
  model: string
  profileUrl: string
  cityLabel: string
  maxLength: number
}): Promise<string> {
  const normalized = normalizeProfileUrl(profileUrl)
  if (!normalized || !isSupportedProfileUrl(normalized)) {
    throw new Error("invalid profile url")
  }

  const pageHints = await scrapePageHints(normalized)

  return await extractProfileDescription({
    ai,
    model,
    profileUrl: normalized,
    cityLabel,
    pageHints,
    maxLength,
  })
}

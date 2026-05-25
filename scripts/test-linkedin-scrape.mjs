const url = process.argv[2] ?? "https://www.linkedin.com/in/reti-eedra/"

const LINKEDIN_CRAWLER_USER_AGENT =
  "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
}

function extractMetaContent(html, key) {
  const pattern =
    /<meta[^>]+(?:property|name)=["']([^"']+)["'][^>]+content=["']([^"']+)["'][^>]*>/gi

  for (const match of html.matchAll(pattern)) {
    if (match[1]?.toLowerCase() === key.toLowerCase()) {
      const content = decodeHtml(match[2] ?? "")
      if (content.length > 0) {
        return content
      }
    }
  }

  return undefined
}

function extractJsonLd(html) {
  const blocks = []
  const pattern =
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi

  for (const match of html.matchAll(pattern)) {
    try {
      blocks.push(JSON.parse(match[1] ?? ""))
    } catch {
      // ignore malformed blocks
    }
  }

  return blocks
}

function formatJsonLdHints(blocks) {
  const lines = []

  for (const block of blocks) {
    const type = block["@type"]
    if (type === "Person" || type === "ProfilePage") {
      if (typeof block.name === "string") {
        lines.push(`Name: ${block.name}`)
      }
      if (typeof block.description === "string") {
        lines.push(`Description: ${block.description}`)
      }
      if (typeof block.jobTitle === "string") {
        lines.push(`Job title: ${block.jobTitle}`)
      }
      if (block.worksFor?.name) {
        lines.push(`Company: ${block.worksFor.name}`)
      }
      if (typeof block.url === "string") {
        lines.push(`Website: ${block.url}`)
      }
    }

    if (block.mainEntity?.["@type"] === "Person") {
      const person = block.mainEntity
      if (typeof person.name === "string") {
        lines.push(`Name: ${person.name}`)
      }
      if (typeof person.description === "string") {
        lines.push(`Description: ${person.description}`)
      }
      if (typeof person.jobTitle === "string") {
        lines.push(`Job title: ${person.jobTitle}`)
      }
    }
  }

  return lines.join("\n")
}

const response = await fetch(url, {
  headers: {
    Accept: "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent": LINKEDIN_CRAWLER_USER_AGENT,
  },
  redirect: "follow",
})

const html = await response.text()
const title =
  extractMetaContent(html, "og:title") ??
  decodeHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "")
const description =
  extractMetaContent(html, "og:description") ??
  extractMetaContent(html, "description")
const jsonLd = extractJsonLd(html)
const jsonLdHints = formatJsonLdHints(jsonLd)

console.log(JSON.stringify({
  url,
  status: response.status,
  htmlLength: html.length,
  title,
  description,
  jsonLdCount: jsonLd.length,
  jsonLdHints,
  combinedHints: [title, description, jsonLdHints].filter(Boolean).join("\n").slice(0, 2000),
}, null, 2))

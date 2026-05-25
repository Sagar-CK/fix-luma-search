const PROFILE_HOSTS = new Set(["linkedin.com", "x.com", "twitter.com"])

const BLOCKED_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"])

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

    if (BLOCKED_HOSTS.has(host) || host.endsWith(".local")) {
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

export function isValidProfileUrlInput(value: string): boolean {
  const normalized = normalizeProfileUrl(value)
  return normalized !== null && isSupportedProfileUrl(normalized)
}

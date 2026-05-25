"use node"

const LUMA_PAGE_BASE = "https://lu.ma"
const NEXT_DATA_PATTERN =
  /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/

export function proseMirrorToPlainText(node: unknown): string {
  if (!node || typeof node !== "object") {
    return ""
  }

  const record = node as {
    type?: string
    text?: string
    content?: unknown[]
  }

  if (record.type === "text" && typeof record.text === "string") {
    return record.text
  }

  if (!Array.isArray(record.content)) {
    return ""
  }

  const parts = record.content
    .map(proseMirrorToPlainText)
    .filter((part) => part.length > 0)

  const separator =
    record.type === "paragraph" ||
    record.type === "heading" ||
    record.type === "listItem"
      ? "\n"
      : " "

  return parts.join(separator)
}

export function truncateDescription(text: string, maxLength = 280): string {
  const collapsed = text.replace(/\s+/g, " ").trim()
  if (collapsed.length <= maxLength) {
    return collapsed
  }

  return `${collapsed.slice(0, maxLength - 1).trimEnd()}…`
}

export async function fetchLumaEventDescription(
  urlSlug: string,
): Promise<string | undefined> {
  try {
    const response = await fetch(`${LUMA_PAGE_BASE}/${urlSlug}`, {
      headers: {
        Accept: "text/html",
        "User-Agent": "luma-search/1.0",
      },
    })

    if (!response.ok) {
      return undefined
    }

    const html = await response.text()
    const match = html.match(NEXT_DATA_PATTERN)
    if (!match) {
      return undefined
    }

    const payload = JSON.parse(match[1]) as {
      props?: {
        pageProps?: {
          initialData?: {
            data?: {
              description_mirror?: unknown
            }
          }
        }
      }
    }

    const description = proseMirrorToPlainText(
      payload.props?.pageProps?.initialData?.data?.description_mirror,
    ).trim()

    return description.length > 0 ? description : undefined
  } catch (error) {
    console.warn(`[luma-sync] failed to fetch description for ${urlSlug}`, error)
    return undefined
  }
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex
      nextIndex += 1
      results[currentIndex] = await mapper(items[currentIndex])
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  )

  await Promise.all(workers)
  return results
}

interface CategoryOption {
  slug: string
  name: string
}

export function formatCategoryTriggerLabel(
  categories: CategoryOption[],
  selectedSlugs: string[],
): string {
  if (selectedSlugs.length === 0) {
    return "All categories"
  }

  const names = selectedSlugs
    .map((slug) => categories.find((category) => category.slug === slug)?.name)
    .filter((name): name is string => Boolean(name))

  if (names.length === 0) {
    return "All categories"
  }

  if (names.length === 1) {
    return names[0]
  }

  if (names.length === 2) {
    return `${names[0]}, ${names[1]}`
  }

  return `${names[0]} +${names.length - 1}`
}

export function formatCategorySummary(
  categories: CategoryOption[],
  selectedSlugs: string[],
): string | null {
  if (selectedSlugs.length === 0) {
    return null
  }

  const names = selectedSlugs
    .map((slug) => categories.find((category) => category.slug === slug)?.name)
    .filter((name): name is string => Boolean(name))

  if (names.length === 0) {
    return null
  }

  if (names.length === 1) {
    return names[0]
  }

  if (names.length === 2) {
    return `${names[0]} & ${names[1]}`
  }

  return `${names.length} categories`
}

export function formatCategorySearchScope(
  categories: CategoryOption[],
  selectedSlugs: string[],
): string | null {
  if (selectedSlugs.length === 0) {
    return null
  }

  const names = selectedSlugs
    .map((slug) => categories.find((category) => category.slug === slug)?.name)
    .filter((name): name is string => Boolean(name))

  if (names.length === 0) {
    return null
  }

  if (names.length <= 2) {
    return names.join(", ")
  }

  return `${names.length} categories`
}

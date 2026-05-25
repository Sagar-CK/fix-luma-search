import { useState } from "react"
import { IconSelector } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { formatCategoryTriggerLabel } from "@/lib/category-selection"
import { togglePresetValue } from "@/lib/advisor-preferences"
import { cn } from "@/lib/utils"

interface CategoryOption {
  slug: string
  name: string
}

interface CategoryFilterProps {
  categories: CategoryOption[]
  value: string[]
  onChange: (slugs: string[]) => void
  disabled?: boolean
  className?: string
}

export function CategoryFilter({
  categories,
  value,
  onChange,
  disabled = false,
  className,
}: CategoryFilterProps) {
  const [open, setOpen] = useState(false)
  const label = formatCategoryTriggerLabel(categories, value)

  function toggleCategory(slug: string) {
    onChange(togglePresetValue(value, slug))
  }

  function clearCategories() {
    onChange([])
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Filter by category"
          disabled={disabled}
          className={cn(
            "h-9 w-auto max-w-[min(11rem,44vw)] shrink-0 justify-between gap-1.5 rounded-lg border-[#ebeced] bg-white px-3 font-normal shadow-[0_1px_2px_rgba(33,35,37,0.04)] hover:bg-white sm:max-w-[12rem]",
            className,
          )}
        >
          <span className="truncate">{label}</span>
          <IconSelector className="size-3.5 shrink-0 text-luma-tertiary" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(18rem,calc(100vw-2rem))] p-0">
        <Command>
          <CommandInput placeholder="Search categories..." />
          <CommandList>
            <CommandEmpty>No categories found.</CommandEmpty>
            <CommandGroup>
              {value.length > 0 ? (
                <CommandItem
                  value="clear-all-categories"
                  onSelect={clearCategories}
                  className="text-luma-secondary"
                >
                  Clear all
                </CommandItem>
              ) : null}
              {categories.map((category) => {
                const selected = value.includes(category.slug)

                return (
                  <CommandItem
                    key={category.slug}
                    value={category.name}
                    data-checked={selected}
                    onSelect={() => toggleCategory(category.slug)}
                  >
                    {category.name}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

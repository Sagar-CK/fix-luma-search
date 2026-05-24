import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface CategoryOption {
  slug: string
  name: string
}

interface CategoryFilterProps {
  categories: CategoryOption[]
  value: string
  onChange: (slug: string) => void
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
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        className={cn(
          "h-9 min-w-[9.5rem] rounded-full border-[#ebeced] bg-white px-4",
          "text-sm font-normal text-foreground shadow-[0_1px_2px_rgba(33,35,37,0.04)]",
          "hover:bg-white data-[placeholder]:text-foreground",
          className,
        )}
      >
        <SelectValue placeholder="All categories" />
      </SelectTrigger>
      <SelectContent align="start">
        <SelectGroup>
          <SelectItem value="all" className="text-sm">
            All categories
          </SelectItem>
          {categories.map((category) => (
            <SelectItem
              key={category.slug}
              value={category.slug}
              className="text-sm"
            >
              {category.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

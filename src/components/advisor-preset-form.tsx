import type { ReactNode } from "react"

import {
  ADVISOR_DAY_OPTIONS,
  ADVISOR_TIME_OPTIONS,
  toggleTimeValue,
  type AdvisorCategoryOption,
  type AdvisorPresetPreferences,
  togglePresetValue,
} from "@/lib/advisor-preferences"
import { cn } from "@/lib/utils"

interface AdvisorPresetFormProps {
  categories: AdvisorCategoryOption[]
  loadingCategories: boolean
  value: AdvisorPresetPreferences
  onChange: (value: AdvisorPresetPreferences) => void
  hint?: string | null
  disabled?: boolean
}

function PresetSection({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-foreground">{label}</span>
      {children}
    </div>
  )
}

function PresetPill({
  label,
  selected,
  disabled,
  onClick,
}: {
  label: string
  selected: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
        selected
          ? "bg-foreground text-background"
          : "bg-[#f7f8f9] text-luma-secondary hover:text-foreground",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      {label}
    </button>
  )
}

export function AdvisorPresetForm({
  categories,
  loadingCategories,
  value,
  onChange,
  hint,
  disabled = false,
}: AdvisorPresetFormProps) {
  function update(partial: Partial<AdvisorPresetPreferences>) {
    onChange({ ...value, ...partial })
  }

  return (
    <div className="flex flex-col gap-4">
      <PresetSection label="Categories">
        {loadingCategories ? (
          <p className="text-xs text-luma-secondary">Loading categories...</p>
        ) : categories.length === 0 ? (
          <p className="text-xs text-luma-secondary">
            No categories available yet.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <PresetPill
                key={category.slug}
                label={category.name}
                selected={value.categorySlugs.includes(category.slug)}
                disabled={disabled}
                onClick={() =>
                  update({
                    categorySlugs: togglePresetValue(
                      value.categorySlugs,
                      category.slug,
                    ),
                  })
                }
              />
            ))}
          </div>
        )}
      </PresetSection>

      <PresetSection label="Days">
        <div className="flex flex-wrap gap-2">
          {ADVISOR_DAY_OPTIONS.map((option) => (
            <PresetPill
              key={option.id}
              label={option.label}
              selected={value.days.includes(option.id)}
              disabled={disabled}
              onClick={() =>
                update({
                  days: togglePresetValue(value.days, option.id),
                })
              }
            />
          ))}
        </div>
      </PresetSection>

      <PresetSection label="Time">
        <div className="flex flex-wrap gap-2">
          {ADVISOR_TIME_OPTIONS.map((option) => (
            <PresetPill
              key={option.id}
              label={option.label}
              selected={value.times.includes(option.id)}
              disabled={disabled}
              onClick={() =>
                update({
                  times: toggleTimeValue(value.times, option.id),
                })
              }
            />
          ))}
        </div>
      </PresetSection>

      <PresetSection label="Notes">
        <textarea
          value={value.notes}
          onChange={(event) => update({ notes: event.target.value })}
          placeholder="Smaller meetups, casual networking, etc."
          rows={3}
          disabled={disabled}
          className={cn(
            "resize-none rounded-xl border border-[#ebeced] bg-white px-3 py-2.5",
            "text-sm text-foreground placeholder:text-luma-tertiary",
            "shadow-[0_1px_2px_rgba(33,35,37,0.04)] outline-none",
            "focus-visible:border-foreground/30 focus-visible:ring-2 focus-visible:ring-foreground/10",
            "disabled:cursor-not-allowed disabled:opacity-60",
            hint ? "border-foreground/20" : undefined,
          )}
        />
      </PresetSection>

      {hint ? <p className="text-xs text-luma-secondary">{hint}</p> : null}
    </div>
  )
}

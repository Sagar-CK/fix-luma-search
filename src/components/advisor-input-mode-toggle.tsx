import {
  ADVISOR_INPUT_MODES,
  type AdvisorInputMode,
} from "@/lib/advisor-preferences"
import { cn } from "@/lib/utils"

interface AdvisorInputModeToggleProps {
  value: AdvisorInputMode
  onChange: (mode: AdvisorInputMode) => void
  disabled?: boolean
  className?: string
}

export function AdvisorInputModeToggle({
  value,
  onChange,
  disabled = false,
  className,
}: AdvisorInputModeToggleProps) {
  return (
    <div
      className={cn(
        "inline-flex w-full rounded-full bg-[#ebeced]/70 p-0.5",
        className,
      )}
      role="tablist"
      aria-label="How to personalize recommendations"
    >
      {ADVISOR_INPUT_MODES.map((mode) => {
        const selected = value === mode.id

        return (
          <button
            key={mode.id}
            type="button"
            role="tab"
            aria-selected={selected}
            disabled={disabled}
            onClick={() => onChange(mode.id)}
            className={cn(
              "flex-1 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm",
              selected
                ? "bg-white text-foreground shadow-[0_1px_2px_rgba(33,35,37,0.06)]"
                : "text-luma-secondary hover:text-foreground",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            {mode.label}
          </button>
        )
      })}
    </div>
  )
}

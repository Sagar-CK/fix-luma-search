import { IconArrowDown, IconX } from "@tabler/icons-react"

import { cn } from "@/lib/utils"

interface AdvisorScrollPromptProps {
  onDismiss: () => void
  className?: string
}

export function AdvisorScrollPrompt({
  onDismiss,
  className,
}: AdvisorScrollPromptProps) {
  return (
    <div
      role="dialog"
      aria-labelledby="advisor-scroll-prompt-title"
      className={cn(
        "relative w-[min(100vw-2rem,18rem)] animate-in fade-in slide-in-from-bottom-2 duration-300",
        className,
      )}
    >
      <div className="rounded-2xl border border-[#ebeced] bg-white p-3.5 shadow-[0_12px_40px_rgba(33,35,37,0.14)]">
        <div className="relative pr-6">
          <p
            id="advisor-scroll-prompt-title"
            className="text-sm font-medium leading-snug text-foreground"
          >
            Want to find the perfect events?
          </p>
          <p className="mt-1 text-xs leading-relaxed text-luma-secondary">
            Try the event advisor for a personalized week.
          </p>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="absolute -top-0.5 -right-0.5 flex size-7 items-center justify-center rounded-lg text-luma-secondary transition-colors hover:bg-[#f7f8f9] hover:text-foreground"
          >
            <IconX className="size-3.5" stroke={1.75} />
          </button>
        </div>
      </div>

      <div
        aria-hidden
        className="mt-1 flex items-center justify-end gap-1 text-luma-orange"
      >
        <span className="text-[11px] font-medium tracking-wide text-luma-secondary">
          Try me
        </span>
        <IconArrowDown
          className="size-3.5 animate-bounce motion-reduce:animate-none"
          stroke={2}
        />
      </div>
    </div>
  )
}

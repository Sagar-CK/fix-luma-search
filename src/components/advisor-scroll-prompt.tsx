import { IconSparkles, IconX } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AdvisorScrollPromptProps {
  onTry: () => void
  onDismiss: () => void
  className?: string
}

export function AdvisorScrollPrompt({
  onTry,
  onDismiss,
  className,
}: AdvisorScrollPromptProps) {
  return (
    <div
      role="dialog"
      aria-labelledby="advisor-scroll-prompt-title"
      className={cn(
        "relative mb-3 w-[min(100vw-2rem,18rem)] animate-in fade-in slide-in-from-bottom-2 duration-300",
        className,
      )}
    >
      <div className="rounded-2xl border border-[#ebeced] bg-white p-3.5 shadow-[0_12px_40px_rgba(33,35,37,0.14)]">
        <div className="flex items-start gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#fff4ed]">
            <IconSparkles className="size-4 text-luma-orange" stroke={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <p
              id="advisor-scroll-prompt-title"
              className="pr-6 text-sm font-medium leading-snug text-foreground"
            >
              Want to find the perfect events?
            </p>
            <p className="mt-1 text-xs leading-relaxed text-luma-secondary">
              Try the event advisor for a personalized week.
            </p>
            <Button
              type="button"
              onClick={onTry}
              className="mt-3 h-8 rounded-full bg-foreground px-3.5 text-xs text-background hover:bg-foreground/90"
            >
              Try me out
            </Button>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="absolute top-3 right-3 flex size-7 items-center justify-center rounded-lg text-luma-secondary transition-colors hover:bg-[#f7f8f9] hover:text-foreground"
          >
            <IconX className="size-3.5" stroke={1.75} />
          </button>
        </div>
      </div>
    </div>
  )
}

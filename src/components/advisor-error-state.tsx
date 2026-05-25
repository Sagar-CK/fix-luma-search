import { IconRefresh } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import type { AdvisorFailure } from "@/lib/advisor-errors"
import { cn } from "@/lib/utils"

interface AdvisorErrorStateProps {
  failure: AdvisorFailure
  onRetry?: () => void
  onDismiss?: () => void
  variant?: "inline" | "standalone"
  className?: string
}

export function AdvisorErrorState({
  failure,
  onRetry,
  onDismiss,
  variant = "standalone",
  className,
}: AdvisorErrorStateProps) {
  const showRetry = failure.canRetry && onRetry && variant === "standalone"
  const showDismiss = onDismiss && !showRetry

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col",
        variant === "standalone" ? "gap-4" : "gap-0",
        className,
      )}
    >
      <div className="rounded-xl bg-[#f7f8f9] px-3 py-3">
        <p className="text-sm font-semibold text-foreground">{failure.title}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-luma-secondary">
          {failure.message}
        </p>
      </div>

      {showRetry ? (
        <Button
          type="button"
          onClick={onRetry}
          className="h-10 w-full rounded-full bg-foreground text-background hover:bg-foreground/90"
        >
          <IconRefresh className="size-4" stroke={1.75} />
          Try again
        </Button>
      ) : null}

      {showDismiss ? (
        <Button
          type="button"
          variant="outline"
          onClick={onDismiss}
          className="h-9 w-full rounded-full border-[#ebeced] bg-white"
        >
          Back
        </Button>
      ) : null}
    </div>
  )
}

import { useState } from "react"
import { useAction, useQuery } from "convex/react"
import {
  IconLoader2,
  IconSparkles,
  IconX,
} from "@tabler/icons-react"

import { EventCard } from "@/components/event-card"
import { AdvisorErrorState } from "@/components/advisor-error-state"
import { AdvisorInputModeToggle } from "@/components/advisor-input-mode-toggle"
import { AdvisorPresetForm } from "@/components/advisor-preset-form"
import { AdvisorScrollPrompt } from "@/components/advisor-scroll-prompt"
import { Button } from "@/components/ui/button"
import { useAdvisorScrollPrompt } from "@/hooks/use-advisor-scroll-prompt"
import {
  getAdvisorValidationHint,
  resolveAdvisorFailure,
  type AdvisorFailure,
} from "@/lib/advisor-errors"
import {
  composePresetDescription,
  DEFAULT_ADVISOR_INPUT_MODE,
  DEFAULT_ADVISOR_PROFILE,
  EMPTY_ADVISOR_PRESET,
  isPresetPreferencesValid,
  type AdvisorInputMode,
  type AdvisorPresetPreferences,
} from "@/lib/advisor-preferences"
import { isValidProfileUrlInput } from "@/lib/profile-url"
import { toEventDisplay } from "@/lib/event-display"
import type { SearchLocation } from "@/lib/locations"
import { cn } from "@/lib/utils"
import { api } from "../../convex/_generated/api"

interface WeekPlanEvent {
  lumaId: string
  name: string
  coverUrl?: string
  startAt: string
  endAt: string
  timezone: string
  urlSlug: string
  categorySlug: string
  locationType: string
  venueName?: string
  city?: string
  cityState?: string
  country?: string
  calendarName: string
  calendarAvatarUrl?: string
  hostNames: string[]
  isSoldOut?: boolean
}

interface WeekPlanDay {
  date: string
  dayLabel: string
  weekday: string
  reason: string
  event: WeekPlanEvent | null
}

interface WeekPlanResult {
  intro: string
  cityLabel: string
  days: WeekPlanDay[]
}

interface EventAdvisorChatProps {
  location: SearchLocation
}

export function EventAdvisorChat({ location }: EventAdvisorChatProps) {
  const generateWeekPlan = useAction(api.eventRecommendations.generateWeekPlan)
  const categories = useQuery(api.categories.listForLocation, {
    locationKey: location.key,
  })

  const [open, setOpen] = useState(false)
  const [inputMode, setInputMode] = useState<AdvisorInputMode>(
    DEFAULT_ADVISOR_INPUT_MODE,
  )
  const [profile, setProfile] = useState(DEFAULT_ADVISOR_PROFILE)
  const [profileUrl, setProfileUrl] = useState("")
  const [presetPreferences, setPresetPreferences] =
    useState<AdvisorPresetPreferences>(EMPTY_ADVISOR_PRESET)
  const [loading, setLoading] = useState(false)
  const [profileHint, setProfileHint] = useState<string | null>(null)
  const [failure, setFailure] = useState<AdvisorFailure | null>(null)
  const [plan, setPlan] = useState<WeekPlanResult | null>(null)
  const { visible: showScrollPrompt, dismiss: dismissScrollPrompt } =
    useAdvisorScrollPrompt(open)

  const canSubmit =
    inputMode === "describe"
      ? profile.trim().length >= 12
      : inputMode === "link"
        ? isValidProfileUrlInput(profileUrl)
        : isPresetPreferencesValid(presetPreferences)

  const loadingLabel =
    inputMode === "link" ? "Reading your profile..." : "Building your week..."

  async function handleSubmit() {
    let userDescription: string | undefined
    let submitProfileUrl: string | undefined

    if (inputMode === "describe") {
      userDescription = profile.trim()
      if (userDescription.length < 12) {
        setProfileHint("Add a sentence or two about yourself.")
        return
      }
    } else if (inputMode === "link") {
      if (!isValidProfileUrlInput(profileUrl)) {
        setProfileHint("Enter a LinkedIn, X, or personal website link.")
        return
      }
      submitProfileUrl = profileUrl.trim()
    } else {
      if (!isPresetPreferencesValid(presetPreferences)) {
        setProfileHint("Pick at least one filter or add a note.")
        return
      }

      userDescription = composePresetDescription(
        presetPreferences,
        categories ?? [],
        location.label,
      )
    }

    setLoading(true)
    setProfileHint(null)
    setFailure(null)

    try {
      const result = await generateWeekPlan({
        locationKey: location.key,
        userDescription,
        profileUrl: submitProfileUrl,
        nowIso: new Date().toISOString(),
      })
      setPlan(result)
    } catch (submitError) {
      const resolved = resolveAdvisorFailure(submitError)
      if (resolved.code === "VALIDATION") {
        setProfileHint(getAdvisorValidationHint(inputMode))
      } else {
        setFailure(resolved)
      }
    } finally {
      setLoading(false)
    }
  }

  function resetAdvisorForm() {
    setInputMode(DEFAULT_ADVISOR_INPUT_MODE)
    setProfile(DEFAULT_ADVISOR_PROFILE)
    setProfileUrl("")
    setPresetPreferences(EMPTY_ADVISOR_PRESET)
    setProfileHint(null)
    setFailure(null)
  }

  function handleClose() {
    setOpen(false)
  }

  function handleReset() {
    setPlan(null)
    resetAdvisorForm()
  }

  function handleOpen() {
    dismissScrollPrompt()
    if (!plan) {
      resetAdvisorForm()
    }
    setOpen(true)
  }

  function handleTryFromPrompt() {
    handleOpen()
  }

  function handleInputModeChange(mode: AdvisorInputMode) {
    setInputMode(mode)
    setProfileHint(null)
  }

  return (
    <>
      {open ? (
        <div
          className={cn(
            "fixed inset-0 z-40 bg-black/20 sm:bg-transparent",
            "pb-[env(safe-area-inset-bottom)]",
          )}
          onClick={handleClose}
          aria-hidden
        />
      ) : null}

      <div
        className={cn(
          "fixed z-50 flex flex-col",
          "right-4 bottom-[max(1rem,env(safe-area-inset-bottom))]",
          "sm:right-6 sm:bottom-6",
        )}
      >
        {open ? (
          <div
            className={cn(
              "mb-3 flex w-[min(100vw-2rem,26rem)] flex-col overflow-hidden rounded-2xl",
              "border border-[#ebeced] bg-white shadow-[0_12px_40px_rgba(33,35,37,0.14)]",
              "max-h-[min(78vh,680px)] sm:max-h-[min(82vh,720px)]",
            )}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-[#ebeced] px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <IconSparkles className="size-4 text-luma-orange" stroke={1.75} />
                  <h2 className="text-sm font-semibold text-foreground">
                    Event advisor
                  </h2>
                </div>
                <p className="mt-0.5 text-xs text-luma-secondary">
                  Find events that match your profile in {location.label}!
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close chat"
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-luma-secondary transition-colors hover:bg-[#f7f8f9] hover:text-foreground"
              >
                <IconX className="size-4" stroke={1.75} />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
              {failure && !failure.canRetry ? (
                <AdvisorErrorState
                  failure={failure}
                  onDismiss={() => setFailure(null)}
                />
              ) : !plan ? (
                <div className="flex flex-col gap-4">
                  {failure ? (
                    <AdvisorErrorState failure={failure} variant="inline" />
                  ) : null}

                  <AdvisorInputModeToggle
                    value={inputMode}
                    onChange={handleInputModeChange}
                    disabled={loading}
                  />

                  {inputMode === "describe" ? (
                    <label className="flex flex-col gap-2">
                      <textarea
                        value={profile}
                        onChange={(event) => {
                          setProfile(event.target.value)
                          if (profileHint) {
                            setProfileHint(null)
                          }
                        }}
                        placeholder="What you're into, where you are, when you're free..."
                        rows={4}
                        disabled={loading}
                        className={cn(
                          "resize-none rounded-xl border border-[#ebeced] bg-white px-3 py-2.5",
                          "text-sm text-foreground placeholder:text-luma-tertiary",
                          "shadow-[0_1px_2px_rgba(33,35,37,0.04)] outline-none",
                          "focus-visible:border-foreground/30 focus-visible:ring-2 focus-visible:ring-foreground/10",
                          "disabled:cursor-not-allowed disabled:opacity-60",
                          profileHint ? "border-foreground/20" : undefined,
                        )}
                      />
                      {profileHint ? (
                        <p className="text-xs text-luma-secondary">{profileHint}</p>
                      ) : null}
                    </label>
                  ) : inputMode === "link" ? (
                    <label className="flex flex-col gap-2">
                      <input
                        type="url"
                        value={profileUrl}
                        onChange={(event) => {
                          setProfileUrl(event.target.value)
                          if (profileHint) {
                            setProfileHint(null)
                          }
                        }}
                        placeholder="linkedin.com/in/you or x.com/you"
                        disabled={loading}
                        className={cn(
                          "h-10 rounded-xl border border-[#ebeced] bg-white px-3 py-2.5",
                          "text-sm text-foreground placeholder:text-luma-tertiary",
                          "shadow-[0_1px_2px_rgba(33,35,37,0.04)] outline-none",
                          "focus-visible:border-foreground/30 focus-visible:ring-2 focus-visible:ring-foreground/10",
                          "disabled:cursor-not-allowed disabled:opacity-60",
                          profileHint ? "border-foreground/20" : undefined,
                        )}
                      />
                      {profileHint ? (
                        <p className="text-xs text-luma-secondary">{profileHint}</p>
                      ) : (
                        <p className="text-xs text-luma-secondary">
                          LinkedIn, X, or your personal site.
                        </p>
                      )}
                    </label>
                  ) : (
                    <AdvisorPresetForm
                      categories={categories ?? []}
                      loadingCategories={categories === undefined}
                      value={presetPreferences}
                      onChange={(value) => {
                        setPresetPreferences(value)
                        if (profileHint) {
                          setProfileHint(null)
                        }
                      }}
                      hint={profileHint}
                      disabled={loading}
                    />
                  )}

                  <Button
                    onClick={() => {
                      setFailure(null)
                      void handleSubmit()
                    }}
                    disabled={loading || !canSubmit}
                    className="h-10 w-full rounded-full bg-foreground text-background hover:bg-foreground/90"
                  >
                    {loading ? (
                      <>
                        <IconLoader2 className="size-4 animate-spin" />
                        {loadingLabel}
                      </>
                    ) : (
                      <>
                        <IconSparkles className="size-4" />
                        Find events!
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <p className="text-sm leading-relaxed text-foreground">
                    {plan.intro}
                  </p>

                  <div className="flex flex-col gap-4">
                    {plan.days.map((day) => (
                      <DayRecommendation key={day.date} day={day} />
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="h-9 w-full rounded-full border-[#ebeced] bg-white"
                  >
                    Start over
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {showScrollPrompt ? (
          <AdvisorScrollPrompt
            onTry={handleTryFromPrompt}
            onDismiss={dismissScrollPrompt}
          />
        ) : null}

        <button
          type="button"
          onClick={() => (open ? handleClose() : handleOpen())}
          aria-label={open ? "Close event advisor" : "Open event advisor"}
          className={cn(
            "ml-auto flex size-14 items-center justify-center rounded-full",
            "bg-foreground text-background shadow-[0_8px_24px_rgba(33,35,37,0.18)]",
            "transition-transform hover:scale-[1.03] active:scale-[0.98]",
          )}
        >
          {open ? (
            <IconX className="size-6" stroke={1.75} />
          ) : (
            <IconSparkles className="size-6" stroke={1.75} />
          )}
        </button>
      </div>
    </>
  )
}

function RecommendationReason({ children }: { children: string }) {
  return (
    <p className="rounded-lg bg-[#f7f8f9] px-3 py-2 text-xs leading-relaxed text-luma-secondary">
      {children}
    </p>
  )
}

function DayRecommendation({ day }: { day: WeekPlanDay }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-[13px] leading-tight">
        <span className="font-semibold text-foreground">{day.dayLabel}</span>
        <span className="font-normal text-luma-secondary"> {day.weekday}</span>
      </h3>

      {day.event ? (
        <div className="flex flex-col gap-1.5">
          <EventCard event={toEventDisplay(day.event)} variant="compact" />
          <RecommendationReason>{day.reason}</RecommendationReason>
        </div>
      ) : (
        <RecommendationReason>{day.reason}</RecommendationReason>
      )}
    </section>
  )
}

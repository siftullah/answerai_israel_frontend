"use client";

import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { CircleCheckIcon, PauseIcon, PlayIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { ErrorState } from "@/components/error-state";
import { useBusiness } from "@/components/business/business-provider";
import { AgentSection } from "@/components/agents/detail/agent-section";
import { useVoicePreview, useVoices } from "@/hooks/use-voices";
import type { Voice } from "@/lib/api/types";
import type { AgentSettingsValues } from "@/lib/validation/agent";
import { cn } from "@/lib/utils";

/** Gender accents — deliberately outside the blue/teal the rest of the app uses. */
const GENDER_TINTS: Record<string, string> = {
  male: "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400",
  female: "bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400",
};

function VoiceCard({
  voice,
  selected,
  disabled,
  onSelect,
  preview,
  unknown,
}: {
  voice: Voice;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  preview: ReturnType<typeof useVoicePreview>;
  unknown?: boolean;
}) {
  const playing = preview.playingId === voice.id;
  const loading = preview.loadingId === voice.id;

  return (
    <div
      role="radio"
      aria-checked={selected}
      tabIndex={disabled ? -1 : 0}
      onClick={() => {
        if (!disabled) onSelect();
      }}
      onKeyDown={(event) => {
        if (!disabled && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-2xl border bg-card p-4 text-left outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "hover:border-foreground/20",
        disabled && "cursor-default opacity-70"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium">{voice.display_name}</p>
          {selected && <CircleCheckIcon className="size-4 shrink-0 text-primary" />}
        </div>
        <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
          {unknown
            ? "This voice is no longer offered — pick a replacement."
            : voice.description}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge
            variant="secondary"
            className={cn("capitalize", GENDER_TINTS[voice.gender])}
          >
            {voice.gender}
          </Badge>
          <Badge variant="ghost" className="capitalize">
            {voice.accent}
          </Badge>
        </div>
      </div>
      {!unknown && (
        <button
          type="button"
          aria-label={playing ? `Pause ${voice.display_name}` : `Play ${voice.display_name}`}
          onClick={(event) => {
            event.stopPropagation();
            void preview.toggle(voice.id);
          }}
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
            playing
              ? "bg-primary text-primary-foreground"
              : "bg-primary/10 text-primary hover:bg-primary/20"
          )}
        >
          {loading ? (
            <Spinner className="size-4" />
          ) : playing ? (
            <PauseIcon className="size-4" />
          ) : (
            <PlayIcon className="size-4" />
          )}
        </button>
      )}
    </div>
  );
}

export function VoiceSection() {
  const { business } = useBusiness();
  const form = useFormContext<AgentSettingsValues>();
  const { disabled } = form.formState;
  const voicesQuery = useVoices(business.id);
  const preview = useVoicePreview();

  const [gender, setGender] = useState<string>("all");

  const voices = voicesQuery.data ?? [];
  const genders = [...new Set(voices.map((voice) => voice.gender))];
  const visible = voices.filter((voice) => gender === "all" || voice.gender === gender);

  return (
    <AgentSection
      id="voice"
      title="Voice"
      description="How this agent sounds on a call. Tap play to hear a sample."
    >
      <Controller
        control={form.control}
        name="voice_id"
        render={({ field, fieldState }) => {
          const knownSelection = voices.some((voice) => voice.id === field.value);
          return (
            <div className="flex flex-col gap-4">
              {voicesQuery.isPending ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-28 w-full" />
                </div>
              ) : voicesQuery.isError ? (
                <ErrorState
                  title="Couldn't load voices"
                  message={voicesQuery.error.message}
                  onRetry={() => voicesQuery.refetch()}
                />
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <div
                      role="group"
                      aria-label="Filter voices by gender"
                      className="flex shrink-0 items-center gap-0.5 rounded-full bg-muted p-1"
                    >
                      {["all", ...genders].map((option) => (
                        <button
                          key={option}
                          type="button"
                          aria-pressed={gender === option}
                          onClick={() => setGender(option)}
                          className={cn(
                            "flex h-7 items-center rounded-full px-3 text-sm font-medium capitalize transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                            gender === option
                              ? (GENDER_TINTS[option] ??
                                "bg-background text-foreground shadow-sm ring-1 ring-foreground/10")
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {option === "all" ? "All" : option}
                        </button>
                      ))}
                    </div>
                  </div>

                  {field.value === "" && (
                    <p
                      className={cn(
                        "text-sm",
                        fieldState.error ? "font-medium text-destructive" : "text-muted-foreground"
                      )}
                    >
                      {fieldState.error?.message ??
                        "No voice selected yet — the agent can't take calls without one."}
                    </p>
                  )}

                  <div role="radiogroup" aria-label="Voice" className="grid gap-3 sm:grid-cols-2">
                    {field.value !== "" && !knownSelection && (
                      <VoiceCard
                        voice={{
                          id: field.value,
                          display_name: `Unknown voice (${field.value})`,
                          description: "",
                          gender: "—",
                          accent: "—",
                          language: "",
                        }}
                        selected
                        unknown
                        disabled={disabled ?? false}
                        onSelect={() => {}}
                        preview={preview}
                      />
                    )}
                    {visible.map((voice) => (
                      <VoiceCard
                        key={voice.id}
                        voice={voice}
                        selected={field.value === voice.id}
                        disabled={disabled ?? false}
                        onSelect={() => field.onChange(voice.id)}
                        preview={preview}
                      />
                    ))}
                  </div>
                  {visible.length === 0 && (
                    <p className="text-sm text-muted-foreground">No voices match.</p>
                  )}
                </>
              )}
            </div>
          );
        }}
      />
    </AgentSection>
  );
}

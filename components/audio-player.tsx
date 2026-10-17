"use client";

import { useImperativeHandle, useRef, useState } from "react";
import {
  DownloadIcon,
  PauseIcon,
  PlayIcon,
  RotateCcwIcon,
  RotateCwIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { formatDuration } from "@/lib/datetime";
import { cn } from "@/lib/utils";

const SPEEDS = [1, 1.25, 1.5, 2] as const;

const EXTENSIONS: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/webm": "webm",
  "audio/x-wav": "wav",
};

export interface AudioPlayerHandle {
  seekTo(seconds: number, opts?: { play?: boolean }): void;
}

/**
 * Minimal themed audio player (native <audio> is unstyleable). Metadata loads
 * lazily; the duration falls back to a caller-provided hint until it does —
 * some signed-URL responses don't expose length until play.
 */
export function AudioPlayer({
  src,
  durationHint,
  className,
  compact = false,
  onTimeChange,
  downloadName,
  ref,
}: {
  src: string;
  /** Known duration in seconds, shown until the element reports its own. */
  durationHint?: number | null;
  className?: string;
  /** Play/track/time only — for tight contexts like the transfer legs. */
  compact?: boolean;
  /** Fires on whole-second changes only (~1Hz) — for transcript highlight. */
  onTimeChange?: (seconds: number) => void;
  /** Base filename (no extension). When set, a download button is shown. */
  downloadName?: string;
  ref?: React.Ref<AudioPlayerHandle>;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastEmitted = useRef(-1);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number | null>(null);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const total = duration ?? durationHint ?? null;

  const seek = (value: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setCurrentTime(value);
  };

  useImperativeHandle(ref, () => ({
    seekTo(seconds, opts) {
      const audio = audioRef.current;
      if (!audio) return;
      seek(Math.max(0, total !== null ? Math.min(seconds, total) : seconds));
      if (opts?.play && audio.paused) {
        void audio.play().catch(() => setFailed(true));
      }
    },
  }));

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play().catch(() => setFailed(true));
    } else {
      audio.pause();
    }
  };

  const skip = (delta: number) => {
    const max = total ?? Number.POSITIVE_INFINITY;
    seek(Math.min(Math.max(0, currentTime + delta), max));
  };

  const cycleSpeed = () => {
    const next = (speedIndex + 1) % SPEEDS.length;
    setSpeedIndex(next);
    const audio = audioRef.current;
    if (audio) audio.playbackRate = SPEEDS[next];
  };

  const download = async () => {
    setDownloading(true);
    try {
      const response = await fetch(src);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${downloadName}.${EXTENSIONS[blob.type.split(";")[0]] ?? "mp3"}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      // Signed URLs that disallow a cross-origin fetch still open directly.
      window.open(src, "_blank", "noopener");
    } finally {
      setDownloading(false);
    }
  };

  if (failed) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        The recording couldn&apos;t be played. Try reloading the page.
      </p>
    );
  }

  const progress = total !== null && total > 0 ? Math.min(100, (currentTime / total) * 100) : 0;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(event) => {
          const time = event.currentTarget.currentTime;
          setCurrentTime(time);
          const whole = Math.floor(time);
          if (onTimeChange && whole !== lastEmitted.current) {
            lastEmitted.current = whole;
            onTimeChange(whole);
          }
        }}
        onLoadedMetadata={(event) => {
          const value = event.currentTarget.duration;
          if (Number.isFinite(value)) setDuration(value);
          // Some browsers reset the rate when metadata (re)loads.
          event.currentTarget.playbackRate = SPEEDS[speedIndex];
        }}
        onError={() => setFailed(true)}
      />
      {!compact && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => skip(-10)}
          aria-label="Back 10 seconds"
        >
          <RotateCcwIcon />
        </Button>
      )}
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        onClick={toggle}
        aria-label={playing ? "Pause recording" : "Play recording"}
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </Button>
      {!compact && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => skip(10)}
          aria-label="Forward 10 seconds"
        >
          <RotateCwIcon />
        </Button>
      )}
      <input
        type="range"
        min={0}
        max={total ?? 0}
        step={0.1}
        value={Math.min(currentTime, total ?? 0)}
        onChange={(event) => seek(Number(event.target.value))}
        disabled={total === null}
        aria-label="Seek recording"
        style={{
          backgroundImage: `linear-gradient(to right, var(--color-primary) ${progress}%, var(--color-muted) ${progress}%)`,
        }}
        className="h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full [&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
      />
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
        {formatDuration(currentTime)}
        {total !== null && ` / ${formatDuration(total)}`}
      </span>
      {!compact && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={cycleSpeed}
          aria-label={`Playback speed ${SPEEDS[speedIndex]}x`}
          className="w-11 px-0 text-xs tabular-nums text-muted-foreground"
        >
          {SPEEDS[speedIndex]}×
        </Button>
      )}
      {downloadName && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={download}
          disabled={downloading}
          aria-label="Download recording"
        >
          {downloading ? <Spinner /> : <DownloadIcon />}
        </Button>
      )}
    </div>
  );
}

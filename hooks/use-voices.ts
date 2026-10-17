"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { ApiError } from "@/lib/api/errors";
import type { Voice } from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

/** Fixed platform catalog — never goes stale within a session. */
export function useVoices(businessUuid: string) {
  return useQuery<Voice[], ApiError>({
    queryKey: queryKeys.business(businessUuid, "voices"),
    queryFn: () =>
      api.get<{ data: Voice[] }>(endpoints.voices.index).then((r) => r.data.data),
    staleTime: Infinity,
  });
}

/**
 * Plays voice preview MP3s — one at a time. `toggle(id)` stops a playing
 * preview or starts that voice's; preview URLs are fetched once and cached
 * for the component's lifetime.
 */
export function useVoicePreview() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlsRef = useRef(new Map<string, string>());
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    setPlayingId(null);
  }, []);

  useEffect(() => stop, [stop]);

  const toggle = useCallback(
    async (voiceId: string) => {
      if (playingId === voiceId) {
        stop();
        return;
      }
      stop();
      setLoadingId(voiceId);
      try {
        let url = urlsRef.current.get(voiceId);
        if (!url) {
          const response = await api.get<{ url: string }>(endpoints.voices.preview(voiceId));
          url = response.data.url;
          urlsRef.current.set(voiceId, url);
        }
        const audio = new Audio(url);
        audio.onended = () => {
          audioRef.current = null;
          setPlayingId(null);
        };
        audio.onerror = () => {
          audioRef.current = null;
          setPlayingId(null);
          toast.error("Couldn't play the voice preview.");
        };
        audioRef.current = audio;
        await audio.play();
        setPlayingId(voiceId);
      } catch {
        toast.error("Couldn't play the voice preview.");
        stop();
      } finally {
        setLoadingId(null);
      }
    },
    [playingId, stop]
  );

  return { playingId, loadingId, toggle, stop };
}

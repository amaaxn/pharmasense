import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "../../i18n/useTranslation";

interface VoicePlayerProps {
  audioUrl: string | null;
  onGenerate: () => void;
  isGenerating: boolean;
  onRegenerateInLanguage?: (lang: "en" | "es") => void;
}

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5];

export function VoicePlayer({
  audioUrl,
  onGenerate,
  isGenerating,
  onRegenerateInLanguage,
}: VoicePlayerProps) {
  const { t, lang } = useTranslation();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setProgress(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration || 0);
    const onEnded = () => {
      setIsPlaying(false);
      setStatusMessage(t.patientPackVoicePause);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
    };
  }, [audioUrl, t]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      setStatusMessage(t.patientPackVoicePause);
    } else {
      audio.play();
      setIsPlaying(true);
      setStatusMessage(t.patientPackVoicePlay);
    }
  }, [isPlaying, t]);

  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Number(e.target.value);
      if (audioRef.current) audioRef.current.currentTime = val;
      setProgress(val);
    },
    [],
  );

  const handleSpeedChange = useCallback((s: number) => {
    setSpeed(s);
    if (audioRef.current) audioRef.current.playbackRate = s;
  }, []);

  const formatTime = (s: number) => {
    if (!s || !isFinite(s)) return "0:00";
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  if (!audioUrl && !isGenerating) {
    return (
      <button
        type="button"
        onClick={onGenerate}
        className="flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90"
        aria-label={t.patientPackVoiceListen}
      >
        🔊 {t.patientPackVoiceListen}
      </button>
    );
  }

  if (isGenerating) {
    return (
      <button
        type="button"
        disabled
        className="flex items-center gap-2 rounded-lg bg-bg-elevated px-4 py-2 text-sm font-medium text-text-secondary"
      >
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        {t.patientPackVoiceGenerating}
      </button>
    );
  }

  const otherLang = lang === "en" ? "es" : "en";
  const otherLabel = otherLang === "en" ? "English" : "Español";

  return (
    <div
      className="rounded-xl border border-border bg-bg-elevated p-4"
      role="region"
      aria-label="Voice instructions audio player"
    >
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="metadata" />}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? t.patientPackVoicePause : t.patientPackVoicePlay}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary text-white hover:bg-brand-primary/90"
        >
          {isPlaying ? "⏸" : "▶"}
        </button>

        <div className="flex flex-1 items-center gap-2">
          <span className="text-xs font-mono text-text-secondary">
            {formatTime(progress)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={progress}
            onChange={handleSeek}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-border"
            aria-label="Seek"
          />
          <span className="text-xs font-mono text-text-secondary">
            {formatTime(duration)}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs text-text-secondary">
            {t.patientPackVoiceSpeed}:
          </span>
          {SPEED_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleSpeedChange(s)}
              className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                speed === s
                  ? "bg-brand-primary text-white"
                  : "bg-bg-surface text-text-secondary hover:bg-border"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {onRegenerateInLanguage && (
        <button
          type="button"
          onClick={() => onRegenerateInLanguage(otherLang)}
          className="mt-3 text-xs text-brand-primary hover:underline"
        >
          {t.patientPackVoiceRegenerate.replace("{lang}", otherLabel)}
        </button>
      )}

      <span className="sr-only" aria-live="polite">
        {statusMessage}
      </span>
    </div>
  );
}

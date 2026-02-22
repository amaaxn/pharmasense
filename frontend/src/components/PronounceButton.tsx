import { useCallback, useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import { textToSpeech } from "../api/voice";

interface PronounceButtonProps {
  name: string;
  className?: string;
}

export function PronounceButton({ name, className = "" }: PronounceButtonProps) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleClick = useCallback(async () => {
    if (playing) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPlaying(false);
      return;
    }

    setPlaying(true);
    try {
      const blob = await textToSpeech(name);
      if (blob.size < 100) {
        setPlaying(false);
        return;
      }
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        audioRef.current = null;
        setPlaying(false);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        audioRef.current = null;
        setPlaying(false);
      };
      await audio.play();
    } catch {
      setPlaying(false);
    }
  }, [name, playing]);

  return (
    <button
      onClick={handleClick}
      aria-label={`Pronounce ${name}`}
      title={`Pronounce "${name}"`}
      className={`inline-flex items-center justify-center rounded-lg p-1 text-muted-foreground transition hover:bg-secondary/60 hover:text-primary ${
        playing ? "text-primary animate-pulse" : ""
      } ${className}`}
    >
      <Volume2 className="h-3.5 w-3.5" />
    </button>
  );
}

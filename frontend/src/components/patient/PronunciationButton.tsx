import { useCallback, useState } from "react";
import { generateVoicePack } from "../../api/voice";
import { useTranslation } from "../../i18n/useTranslation";

interface PronunciationButtonProps {
  medicationName: string;
}

export function PronunciationButton({
  medicationName,
}: PronunciationButtonProps) {
  const { t, lang } = useTranslation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [cachedUrl, setCachedUrl] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    if (cachedUrl) {
      const audio = new Audio(cachedUrl);
      audio.play();
      return;
    }

    setIsGenerating(true);
    try {
      const resp = await generateVoicePack({
        prescriptionId: "pronunciation",
        text: medicationName,
        language: lang,
      });
      setCachedUrl(resp.audioUrl);
      const audio = new Audio(resp.audioUrl);
      audio.play();
    } finally {
      setIsGenerating(false);
    }
  }, [cachedUrl, medicationName, lang]);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isGenerating}
      aria-label={t.patientPackPronounce}
      title={t.patientPackPronounce}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm hover:bg-accent-blue/10 ${
        isGenerating ? "animate-pulse text-accent-blue" : "text-text-secondary"
      }`}
    >
      🔊
    </button>
  );
}

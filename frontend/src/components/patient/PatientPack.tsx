import { useCallback, useState } from "react";
import { generateVoicePack } from "../../api/voice";
import { useTranslation } from "../../i18n/useTranslation";
import type { PatientPack as PatientPackType } from "../../types/models";
import { AvoidList } from "./AvoidList";
import { MedicationSchedule } from "./MedicationSchedule";
import { PronunciationButton } from "./PronunciationButton";
import { SideEffectTriage } from "./SideEffectTriage";
import { VoicePlayer } from "./VoicePlayer";

interface PatientPackProps {
  pack: PatientPackType;
  prescriptionId: string;
}

export function PatientPack({ pack, prescriptionId }: PatientPackProps) {
  const { t, lang } = useTranslation();
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);

  const handleGenerateVoice = useCallback(async () => {
    setIsGeneratingVoice(true);
    try {
      const resp = await generateVoicePack({
        prescriptionId,
        language: lang,
      });
      setAudioUrl(resp.audioUrl);
    } finally {
      setIsGeneratingVoice(false);
    }
  }, [prescriptionId, lang]);

  const handleRegenerateInLanguage = useCallback(
    async (targetLang: "en" | "es") => {
      setIsGeneratingVoice(true);
      try {
        const resp = await generateVoicePack({
          prescriptionId,
          language: targetLang,
        });
        setAudioUrl(resp.audioUrl);
      } finally {
        setIsGeneratingVoice(false);
      }
    },
    [prescriptionId],
  );

  return (
    <article
      className="space-y-6 rounded-2xl border border-border bg-bg-surface p-6"
      aria-label={t.patientPackTitle}
    >
      {/* Header */}
      <header>
        <h2 className="text-2xl font-bold text-text-primary">
          {t.patientPackTitle}
        </h2>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-xl font-semibold text-brand-primary">
            {pack.medicationName}
          </span>
          <PronunciationButton medicationName={pack.medicationName} />
        </div>
      </header>

      {/* Purpose */}
      <section aria-label={t.patientPackPurpose}>
        <h3 className="mb-1 text-lg font-semibold text-text-primary">
          {t.patientPackPurpose}
        </h3>
        <p className="text-body-lg text-text-primary">{pack.purpose}</p>
      </section>

      {/* How to take */}
      <section aria-label={t.patientPackHowToTake}>
        <h3 className="mb-1 text-lg font-semibold text-text-primary">
          {t.patientPackHowToTake}
        </h3>
        <p className="text-body text-text-primary">{pack.howToTake}</p>
      </section>

      {/* Schedule */}
      {pack.dailySchedule && (
        <MedicationSchedule schedule={pack.dailySchedule} />
      )}

      {/* What to avoid */}
      <AvoidList items={pack.whatToAvoid} />

      {/* Side effects */}
      <SideEffectTriage
        normal={pack.sideEffects}
        seekHelp={pack.whenToSeekHelp}
      />

      {/* Storage */}
      {pack.storageInstructions && (
        <section aria-label={t.patientPackStorage}>
          <h3 className="mb-1 text-lg font-semibold text-text-primary">
            {t.patientPackStorage}
          </h3>
          <p className="text-body text-text-secondary">
            {pack.storageInstructions}
          </p>
        </section>
      )}

      {/* Voice player */}
      <VoicePlayer
        audioUrl={audioUrl}
        onGenerate={handleGenerateVoice}
        isGenerating={isGeneratingVoice}
        onRegenerateInLanguage={handleRegenerateInLanguage}
      />
    </article>
  );
}

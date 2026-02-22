import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useVisitStore } from "../stores/visitStore";
import { usePrescriptionStore } from "../stores/prescriptionStore";
import { useTranslation } from "../i18n";
import { PageTransition } from "../components/PageTransition";
import { PatientSearchBar } from "../components/clinician/PatientSearchBar";
import { NotesCapture } from "../components/clinician/NotesCapture";
import { ExtractionPanel } from "../components/clinician/ExtractionPanel";
import { RecommendationPanel } from "../components/clinician/RecommendationPanel";
import { QrCodeModal } from "../components/drawing/QrCodeModal";
import { useAllergyDetection } from "../components/clinician/useAllergyDetection";
import { Card, Button } from "../shared";
import { processHandwritingOcr } from "../api/ocr";
import { validate as validatePrescriptions } from "../api/prescriptions";
import { finalizeVisit } from "../api/visits";
import { supabase } from "../lib/supabase";
import type { Patient } from "../api/patients";
import type { ExtractedData } from "../stores/visitStore";

export type OptionActionState = "pending" | "approved" | "rejected";

function generateChannelId(): string {
  return crypto.randomUUID();
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function AddVisitPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const visitStore = useVisitStore();
  const prescriptionStore = usePrescriptionStore();

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [notes, setNotes] = useState("");
  const [drawingPreview, setDrawingPreview] = useState<string | null>(null);
  const [transcribedText, setTranscribedText] = useState<string | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [extractionExpanded, setExtractionExpanded] = useState(false);
  const [showReRecBanner, setShowReRecBanner] = useState(false);
  const [optionStates, setOptionStates] = useState<OptionActionState[]>([]);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const channelId = visitStore.drawingChannelId;
  const isProcessingDrawing = visitStore.isProcessingDrawing;
  const announcerRef = useRef<HTMLDivElement>(null);
  const notesAtRecommendation = useRef<string>("");

  const announce = useCallback((msg: string) => {
    if (announcerRef.current) {
      announcerRef.current.textContent = msg;
    }
  }, []);

  // ── Section 11: Client-side quick allergy detection ──
  const detectedAllergies = useAllergyDetection(notes);
  const debouncedNotes = useDebounce(notes, 1500);
  const prevDetectedRef = useRef<string[]>([]);

  // When client-side allergies change and recommendations exist, re-validate
  useEffect(() => {
    if (detectedAllergies.length === 0) return;
    const prev = prevDetectedRef.current;
    const newAllergies = detectedAllergies.filter((a) => !prev.includes(a));
    prevDetectedRef.current = detectedAllergies;

    if (newAllergies.length === 0) return;

    // Merge detected allergies into form
    const currentAllergies = visitStore.form.allergies;
    const merged = Array.from(
      new Set([...currentAllergies, ...newAllergies]),
    );
    visitStore.setFormField("allergies", merged);

    // If recommendations exist, re-validate
    if (
      prescriptionStore.options.length > 0 &&
      selectedPatient &&
      visitStore.currentVisit
    ) {
      const drugs = prescriptionStore.options.map((opt) => ({
        drug_name: opt.primary.drugName,
        generic_name: opt.primary.genericName,
        dosage: opt.primary.dosage,
        frequency: opt.primary.frequency,
        duration: opt.primary.duration,
        route: opt.primary.route,
      }));

      validatePrescriptions({
        visit_id: visitStore.currentVisit.id,
        patient_id: selectedPatient.patientId,
        proposed_drugs: drugs,
      })
        .then((result) => {
          if (result.blocked) {
            announce("Safety check: prescription options updated.");
          }
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detectedAllergies]);

  // Section 11.2: Debounced re-extraction
  useEffect(() => {
    if (
      !debouncedNotes ||
      !visitStore.currentVisit ||
      visitStore.isExtracting
    ) {
      return;
    }
    // Only auto-extract if notes have meaningfully changed (>20 chars diff)
    const diff = Math.abs(
      debouncedNotes.length -
        (visitStore.currentVisit.notes?.length ?? 0),
    );
    if (diff > 20) {
      visitStore.extractDataFromNotes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedNotes]);

  // Sync optionStates when recommendation count changes
  useEffect(() => {
    const count = prescriptionStore.options.length;
    if (count > 0 && optionStates.length !== count) {
      setOptionStates(Array.from({ length: count }, () => "pending" as OptionActionState));
    }
  }, [prescriptionStore.options.length, optionStates.length]);

  // Section 11.4: Re-recommendation banner
  useEffect(() => {
    if (prescriptionStore.options.length === 0) return;
    const base = notesAtRecommendation.current;
    if (!base) return;
    const diff = Math.abs(notes.length - base.length);
    if (diff > 30) {
      setShowReRecBanner(true);
    }
  }, [notes, prescriptionStore.options.length]);

  // ── Supabase real-time subscription for drawing ──
  useEffect(() => {
    if (!channelId) return;
    const channel = supabase
      .channel(`drawing:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "drawing_updates",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          const base64 = (payload.new as { base64image?: string }).base64image;
          if (base64) {
            processDrawing(base64);
            setQrModalOpen(false);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  const processDrawing = useCallback(
    async (base64: string) => {
      visitStore.setProcessingDrawing(true);
      setDrawingPreview(`data:image/png;base64,${base64}`);
      try {
        const output = await processHandwritingOcr(base64);
        setTranscribedText(output.transcribedText);
        visitStore.appendToNotes(output.transcribedText);
        setNotes((prev) =>
          prev ? `${prev}\n${output.transcribedText}` : output.transcribedText,
        );
        if (output.structuredFields) {
          visitStore.mergeExtractedFields({
            allergies: output.structuredFields.allergies,
            currentMedications: output.structuredFields.currentMedications,
          });
        }
        announce("Drawing transcribed and added to notes.");
      } catch {
        announce("Failed to process drawing.");
      } finally {
        visitStore.setProcessingDrawing(false);
      }
    },
    [visitStore, announce],
  );

  const handleSelectPatient = useCallback(
    (patient: Patient) => {
      setSelectedPatient(patient);
      visitStore.setFormField("patientId", patient.patientId);
      visitStore.setFormField("allergies", patient.allergies);
    },
    [visitStore],
  );

  const handleClearPatient = useCallback(() => {
    setSelectedPatient(null);
    visitStore.resetVisitForm();
    prescriptionStore.reset();
    setNotes("");
    setDrawingPreview(null);
    setTranscribedText(null);
    visitStore.setDrawingChannelId(null);
    setShowReRecBanner(false);
    prevDetectedRef.current = [];
  }, [visitStore, prescriptionStore]);

  const handleNotesChange = useCallback(
    (value: string) => {
      setNotes(value);
      visitStore.setFormField("notes", value);
    },
    [visitStore],
  );

  const handleDrawRequest = useCallback(() => {
    const id = generateChannelId();
    visitStore.setDrawingChannelId(id);
    setQrModalOpen(true);
  }, [visitStore]);

  const handleExtract = useCallback(async () => {
    if (!visitStore.currentVisit) {
      const visitId = await visitStore.createVisit();
      if (visitId) {
        await visitStore.extractDataFromNotes();
      }
    } else {
      await visitStore.extractDataFromNotes();
    }
  }, [visitStore]);

  const handleGenerateRecommendations = useCallback(async () => {
    if (!selectedPatient) return;
    const form = visitStore.form;
    notesAtRecommendation.current = notes;
    setShowReRecBanner(false);

    // Ensure a visit exists before requesting recommendations
    let visitId = visitStore.currentVisit?.id;
    if (!visitId) {
      try {
        visitId = await visitStore.createVisit();
      } catch {
        return;
      }
      if (!visitId) return;
    }

    await prescriptionStore.fetchRecommendations({
      visitId,
      chiefComplaint: form.chiefComplaint || notes,
      patientId: selectedPatient.patientId,
      currentMedications: form.currentMedications,
      allergies: form.allergies,
      notes,
    });
    setOptionStates(
      prescriptionStore.options.map(() => "pending" as OptionActionState),
    );
  }, [selectedPatient, visitStore, prescriptionStore, notes]);

  const handleUpdateExtractedData = useCallback(
    (data: ExtractedData) => {
      visitStore.updateExtractedData(data);
    },
    [visitStore],
  );

  const handleApproveOption = useCallback(
    async (index: number, comment: string) => {
      const id = prescriptionStore.prescriptionId || "";
      try {
        await prescriptionStore.approveOption(id, true, comment);
        setOptionStates((prev) => {
          const next = [...prev];
          next[index] = "approved";
          return next;
        });
      } catch {
        // approvalError is already set in the store
      }
    },
    [prescriptionStore],
  );

  const handleRejectOption = useCallback(
    async (index: number, reason: string) => {
      const id = prescriptionStore.prescriptionId || "";
      try {
        await prescriptionStore.rejectOption(id, reason);
        setOptionStates((prev) => {
          const next = [...prev];
          next[index] = "rejected";
          return next;
        });
      } catch {
        // error is already set in the store
      }
    },
    [prescriptionStore],
  );

  // ── Part 13: Finalization logic ──
  const approvedCount = optionStates.filter((s) => s === "approved").length;
  // Finalize is enabled as soon as at least one option is approved, regardless
  // of whether remaining options are still pending (they are implicitly rejected)
  const canFinalize = optionStates.length > 0 && approvedCount > 0;

  const handleFinalize = useCallback(async () => {
    const visitId = visitStore.currentVisit?.id;
    if (!visitId || !canFinalize) return;
    setIsFinalizing(true);
    try {
      await finalizeVisit(visitId);
      const msg = t.finalizeSuccess.replace("{n}", String(approvedCount));
      setToastMessage(msg);
      announce(msg);
      setTimeout(() => {
        navigate(`/visit/${visitId}`);
      }, 1500);
    } catch {
      announce("Failed to finalize visit.");
    } finally {
      setIsFinalizing(false);
    }
  }, [visitStore.currentVisit?.id, canFinalize, approvedCount, t, announce, navigate]);

  const extractedData = visitStore.currentVisit?.extractedData ?? null;

  return (
    <PageTransition>
      <div className="p-4 lg:p-8">
        <div
          ref={announcerRef}
          role="status"
          aria-live="polite"
          className="sr-only"
        />

        <div className="mb-6">
          <h1 className="text-h1 text-text-heading">{t.cockpitTitle}</h1>
          <p className="mt-1 text-text-secondary">{t.pageNewVisit}</p>
        </div>

        <div className="mb-6">
          <PatientSearchBar
            selectedPatient={selectedPatient}
            onSelect={handleSelectPatient}
            onClear={handleClearPatient}
          />
        </div>

        {/* Re-recommendation banner */}
        {showReRecBanner && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-accent-amber/40 bg-accent-amber/10 px-4 py-3">
            <p className="text-sm text-text-primary">
              Notes have changed significantly since recommendations were
              generated.
            </p>
            <Button
              size="sm"
              onClick={handleGenerateRecommendations}
              loading={prescriptionStore.isLoading}
            >
              Re-generate
            </Button>
          </div>
        )}

        {/* Three-panel layout */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <div className="md:col-span-1">
            <Card
              header={
                <h2 className="text-h3 font-semibold text-text-heading">
                  {t.panelNotes}
                </h2>
              }
            >
              <NotesCapture
                notes={notes}
                onNotesChange={handleNotesChange}
                onDrawRequest={handleDrawRequest}
                drawingPreview={drawingPreview}
                transcribedText={transcribedText}
                isProcessingDrawing={isProcessingDrawing}
              />
            </Card>
          </div>

          <div className="hidden xl:block">
            <Card
              header={
                <h2 className="text-h3 font-semibold text-text-heading">
                  {t.panelExtraction}
                </h2>
              }
            >
              <ExtractionPanel
                extractedData={extractedData}
                isExtracting={visitStore.isExtracting}
                onExtract={handleExtract}
                patientAllergies={selectedPatient?.allergies}
                onUpdateExtractedData={handleUpdateExtractedData}
              />
            </Card>
          </div>

          <div className="md:col-span-1">
            <div className="mb-4 xl:hidden">
              <button
                type="button"
                onClick={() => setExtractionExpanded(!extractionExpanded)}
                className="flex w-full items-center justify-between rounded-lg border border-border-default bg-bg-card px-4 py-3 text-left transition-colors hover:bg-bg-elevated"
                aria-expanded={extractionExpanded}
              >
                <span className="text-sm font-semibold text-text-heading">
                  {t.panelExtraction}
                </span>
                <span
                  className={`text-text-secondary transition-transform ${extractionExpanded ? "rotate-180" : ""}`}
                >
                  ▾
                </span>
              </button>
              {extractionExpanded && (
                <Card className="mt-2">
                  <ExtractionPanel
                    extractedData={extractedData}
                    isExtracting={visitStore.isExtracting}
                    onExtract={handleExtract}
                    patientAllergies={selectedPatient?.allergies}
                    onUpdateExtractedData={handleUpdateExtractedData}
                  />
                </Card>
              )}
            </div>

            <Card
              header={
                <h2 className="text-h3 font-semibold text-text-heading">
                  {t.panelRecommendations}
                </h2>
              }
            >
              <RecommendationPanel
                recommendations={prescriptionStore.options}
                isLoading={prescriptionStore.isLoading}
                error={prescriptionStore.error}
                approvalError={prescriptionStore.approvalError}
                onGenerate={handleGenerateRecommendations}
                onRetry={handleGenerateRecommendations}
                onApprove={handleApproveOption}
                onReject={handleRejectOption}
                onSelectOption={prescriptionStore.selectOption}
                selectedIndex={prescriptionStore.selectedOptionIndex}
                hasPatient={!!selectedPatient}
                hasNotes={notes.length > 0}
                isDemoMode={prescriptionStore.isDemoMode}
              />
            </Card>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-border-default pt-4">
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={handleExtract}
              disabled={!notes || visitStore.isExtracting}
              loading={visitStore.isExtracting}
            >
              {t.extractFromNotes}
            </Button>
            <Button
              onClick={handleGenerateRecommendations}
              disabled={
                !selectedPatient || !notes || prescriptionStore.isLoading
              }
              loading={prescriptionStore.isLoading}
            >
              {t.generateRecommendations}
            </Button>
          </div>
          <Button
            onClick={handleFinalize}
            disabled={!canFinalize || isFinalizing}
            loading={isFinalizing}
          >
            {t.finalizeVisit}
          </Button>
        </div>

        {/* Success toast */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-accent-green/40 bg-accent-green/10 px-5 py-3 shadow-modal">
            <p className="text-sm font-medium text-accent-green">
              ✓ {toastMessage}
            </p>
          </div>
        )}

        {channelId && (
          <QrCodeModal
            channelId={channelId}
            isOpen={qrModalOpen}
            onClose={() => setQrModalOpen(false)}
            onDrawingReceived={() => setQrModalOpen(false)}
          />
        )}
      </div>
    </PageTransition>
  );
}

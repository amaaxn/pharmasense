import { useState, useCallback, useRef, useEffect } from "react";
import type { ExtractedData } from "../../stores/visitStore";
import { Button, Badge, LoadingSpinner, Card } from "../../shared";
import { useTranslation } from "../../i18n";

export interface ExtractionPanelProps {
  extractedData: ExtractedData | null;
  isExtracting: boolean;
  onExtract: () => void;
  patientAllergies?: string[];
  onUpdateExtractedData?: (data: ExtractedData) => void;
}

export function ExtractionPanel({
  extractedData,
  isExtracting,
  onExtract,
  patientAllergies = [],
  onUpdateExtractedData,
}: ExtractionPanelProps) {
  const { t } = useTranslation();
  const announcerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isExtracting && announcerRef.current) {
      announcerRef.current.textContent =
        "Extracting structured data from notes.";
    }
  }, [isExtracting]);

  if (isExtracting) {
    return (
      <>
        <div
          ref={announcerRef}
          role="status"
          aria-live="polite"
          className="sr-only"
        />
        <div className="flex flex-col items-center justify-center gap-3 py-12">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-text-secondary">
            Analyzing notes with AI...
          </p>
        </div>
      </>
    );
  }

  if (!extractedData) {
    return (
      <Card className="text-center">
        <p className="mb-4 text-text-secondary">{t.extractionEmpty}</p>
        <Button variant="secondary" onClick={onExtract}>
          {t.extractFromNotes}
        </Button>
      </Card>
    );
  }

  return (
    <ExtractedDataDisplay
      data={extractedData}
      patientAllergies={patientAllergies}
      onUpdate={onUpdateExtractedData}
      onReExtract={onExtract}
      t={t}
    />
  );
}

// ── Extracted data display with inline editing ────────────────────────

interface ExtractedDataDisplayProps {
  data: ExtractedData;
  patientAllergies: string[];
  onUpdate?: (data: ExtractedData) => void;
  onReExtract: () => void;
  t: ReturnType<typeof import("../../i18n").useTranslation>["t"];
}

type EditingSection =
  | "chiefComplaint"
  | "allergies"
  | "currentMedications"
  | "diagnosis"
  | null;

function ExtractedDataDisplay({
  data,
  patientAllergies,
  onUpdate,
  onReExtract,
  t,
}: ExtractedDataDisplayProps) {
  const [editing, setEditing] = useState<EditingSection>(null);
  const patientAllergySet = new Set(
    patientAllergies.map((a) => a.toLowerCase()),
  );

  const commitEdit = useCallback(
    (updated: ExtractedData) => {
      onUpdate?.(updated);
      setEditing(null);
    },
    [onUpdate],
  );

  return (
    <div className="space-y-4">
      {/* Chief Complaint */}
      <Section
        title={t.visitDiagnosis}
        isEditing={editing === "chiefComplaint"}
        onToggleEdit={() =>
          setEditing(editing === "chiefComplaint" ? null : "chiefComplaint")
        }
        showEdit={!!onUpdate}
      >
        {editing === "chiefComplaint" ? (
          <TextFieldEditor
            value={data.chiefComplaint}
            onSave={(val) =>
              commitEdit({ ...data, chiefComplaint: val })
            }
            onCancel={() => setEditing(null)}
          />
        ) : (
          <p className="text-sm text-text-primary">
            {data.chiefComplaint || "—"}
          </p>
        )}
      </Section>

      {/* Allergies */}
      <Section
        title={t.visitAllergies}
        isEditing={editing === "allergies"}
        onToggleEdit={() =>
          setEditing(editing === "allergies" ? null : "allergies")
        }
        showEdit={!!onUpdate}
      >
        {editing === "allergies" ? (
          <TagEditor
            tags={data.allergies}
            onSave={(tags) => commitEdit({ ...data, allergies: tags })}
            onCancel={() => setEditing(null)}
          />
        ) : data.allergies.length === 0 ? (
          <p className="text-sm text-text-secondary">None detected</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {data.allergies.map((allergy) => {
              const isNew = !patientAllergySet.has(allergy.toLowerCase());
              return (
                <span
                  key={allergy}
                  className="inline-flex items-center gap-1 rounded-full bg-accent-red/15 px-2.5 py-0.5 text-xs font-medium text-accent-red"
                >
                  {allergy}
                  {isNew && <Badge variant="safety-warn">NEW</Badge>}
                </span>
              );
            })}
          </div>
        )}
      </Section>

      {/* Current Medications */}
      <Section
        title={t.visitMedications}
        isEditing={editing === "currentMedications"}
        onToggleEdit={() =>
          setEditing(
            editing === "currentMedications" ? null : "currentMedications",
          )
        }
        showEdit={!!onUpdate}
      >
        {editing === "currentMedications" ? (
          <TagEditor
            tags={data.currentMedications}
            onSave={(tags) =>
              commitEdit({ ...data, currentMedications: tags })
            }
            onCancel={() => setEditing(null)}
          />
        ) : data.currentMedications.length === 0 ? (
          <p className="text-sm text-text-secondary">None detected</p>
        ) : (
          <ul className="list-inside list-disc space-y-1 text-sm text-text-primary">
            {data.currentMedications.map((med) => (
              <li key={med}>{med}</li>
            ))}
          </ul>
        )}
      </Section>

      {/* Diagnosis */}
      <Section
        title="Diagnosis"
        isEditing={editing === "diagnosis"}
        onToggleEdit={() =>
          setEditing(editing === "diagnosis" ? null : "diagnosis")
        }
        showEdit={!!onUpdate}
      >
        {editing === "diagnosis" ? (
          <TextFieldEditor
            value={data.diagnosis}
            onSave={(val) => commitEdit({ ...data, diagnosis: val })}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <p className="text-sm text-text-primary">{data.diagnosis || "—"}</p>
        )}
      </Section>

      <Button variant="secondary" size="sm" onClick={onReExtract}>
        Re-extract
      </Button>
    </div>
  );
}

// ── Section wrapper with edit toggle ─────────────────────────────────

function Section({
  title,
  children,
  isEditing,
  onToggleEdit,
  showEdit,
}: {
  title: string;
  children: React.ReactNode;
  isEditing: boolean;
  onToggleEdit: () => void;
  showEdit: boolean;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          {title}
        </h4>
        {showEdit && (
          <button
            type="button"
            onClick={onToggleEdit}
            className="rounded p-1 text-text-secondary hover:bg-bg-elevated hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            aria-label={isEditing ? `Cancel editing ${title}` : `Edit ${title}`}
          >
            {isEditing ? "✕" : "✎"}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Tag editor (add/remove) ──────────────────────────────────────────

function TagEditor({
  tags,
  onSave,
  onCancel,
}: {
  tags: string[];
  onSave: (tags: string[]) => void;
  onCancel: () => void;
}) {
  const [localTags, setLocalTags] = useState<string[]>([...tags]);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const addTag = useCallback(() => {
    const trimmed = inputValue.trim();
    if (trimmed && !localTags.includes(trimmed)) {
      setLocalTags((prev) => [...prev, trimmed]);
    }
    setInputValue("");
  }, [inputValue, localTags]);

  const removeTag = useCallback((tag: string) => {
    setLocalTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addTag();
      } else if (
        e.key === "Backspace" &&
        inputValue === "" &&
        localTags.length > 0
      ) {
        setLocalTags((prev) => prev.slice(0, -1));
      }
    },
    [addTag, inputValue, localTags],
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border-default bg-bg-input p-2">
        {localTags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-bg-elevated px-2 py-0.5 text-xs text-text-primary"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="text-text-secondary hover:text-text-primary"
              aria-label={`Remove ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (inputValue.trim()) addTag();
          }}
          placeholder="Type and press Enter"
          className="min-w-[120px] flex-1 border-0 bg-transparent px-1 py-0.5 text-sm text-text-primary outline-none placeholder:text-text-secondary/60"
        />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onSave(localTags)}>
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ── Simple text field editor ─────────────────────────────────────────

function TextFieldEditor({
  value,
  onSave,
  onCancel,
}: {
  value: string;
  onSave: (val: string) => void;
  onCancel: () => void;
}) {
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave(localValue);
          if (e.key === "Escape") onCancel();
        }}
        className="w-full rounded-lg border border-border-default bg-bg-input px-3 py-2 text-sm text-text-primary outline-none focus:border-border-focus focus:ring-1 focus:ring-border-focus"
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onSave(localValue)}>
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

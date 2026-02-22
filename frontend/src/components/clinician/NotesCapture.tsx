import { TextArea, Button, Badge } from "../../shared";
import { useTranslation } from "../../i18n";

export interface NotesCaptureProps {
  notes: string;
  onNotesChange: (value: string) => void;
  onDrawRequest: () => void;
  drawingPreview: string | null;
  transcribedText: string | null;
  isProcessingDrawing: boolean;
}

export function NotesCapture({
  notes,
  onNotesChange,
  onDrawRequest,
  drawingPreview,
  transcribedText,
  isProcessingDrawing,
}: NotesCaptureProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <TextArea
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        placeholder={t.notesPlaceholder}
        className="min-h-[300px] resize-y font-mono text-sm"
        aria-label={t.visitNotes}
      />

      {/* Drawing trigger */}
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={onDrawRequest}
          loading={isProcessingDrawing}
        >
          ✏️ Draw on Tablet
        </Button>
        {isProcessingDrawing && (
          <span className="text-xs text-text-secondary">
            Processing drawing...
          </span>
        )}
      </div>

      {/* Drawing preview */}
      {drawingPreview && (
        <div className="space-y-2">
          <img
            src={drawingPreview}
            alt="Drawing preview"
            className="max-h-[200px] rounded-lg border border-border-default"
          />
          {transcribedText && (
            <div className="rounded-lg border-l-2 border-accent-purple bg-accent-purple/10 p-3">
              <Badge variant="ai">Transcribed via AI</Badge>
              <p className="mt-2 text-sm text-text-primary">
                {transcribedText}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

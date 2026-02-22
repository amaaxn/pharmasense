import { useState, useRef, useCallback, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "../shared";
import { supabase } from "../lib/supabase";

const PRESET_COLORS = [
  { label: "Black", value: "#000000" },
  { label: "Blue", value: "#2563eb" },
  { label: "Red", value: "#dc2626" },
  { label: "Green", value: "#16a34a" },
  { label: "Purple", value: "#9333ea" },
  { label: "Gray", value: "#6b7280" },
];

interface Stroke {
  points: { x: number; y: number }[];
  color: string;
  size: number;
}

export function DrawingPage() {
  const { channelId } = useParams<{ channelId: string }>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [brushColor, setBrushColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(3);
  const [isErasing, setIsErasing] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  const strokesRef = useRef<Stroke[]>([]);
  const currentStrokeRef = useRef<Stroke | null>(null);

  const effectiveColor = isErasing ? "#ffffff" : brushColor;

  const getCanvasPoint = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    },
    [],
  );

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const stroke of strokesRef.current) {
      if (stroke.points.length < 2) continue;
      const first = stroke.points[0]!;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < stroke.points.length; i++) {
        const pt = stroke.points[i]!;
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
    }
  }, []);

  const startStroke = useCallback(
    (x: number, y: number) => {
      const point = getCanvasPoint(x, y);
      currentStrokeRef.current = {
        points: [point],
        color: effectiveColor,
        size: brushSize,
      };
      setIsDrawing(true);
    },
    [getCanvasPoint, effectiveColor, brushSize],
  );

  const continueStroke = useCallback(
    (x: number, y: number) => {
      if (!currentStrokeRef.current) return;
      const point = getCanvasPoint(x, y);
      currentStrokeRef.current.points.push(point);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const pts = currentStrokeRef.current.points;
      if (pts.length < 2) return;
      const prev = pts[pts.length - 2]!;
      ctx.beginPath();
      ctx.strokeStyle = currentStrokeRef.current.color;
      ctx.lineWidth = currentStrokeRef.current.size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    },
    [getCanvasPoint],
  );

  const endStroke = useCallback(() => {
    if (currentStrokeRef.current && currentStrokeRef.current.points.length > 1) {
      strokesRef.current.push(currentStrokeRef.current);
      setHasDrawn(true);
    }
    currentStrokeRef.current = null;
    setIsDrawing(false);
  }, []);

  // Mouse events
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => startStroke(e.clientX, e.clientY),
    [startStroke],
  );
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDrawing) return;
      continueStroke(e.clientX, e.clientY);
    },
    [isDrawing, continueStroke],
  );
  const handleMouseUp = useCallback(() => endStroke(), [endStroke]);

  // Touch events
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0]!;
      startStroke(touch.clientX, touch.clientY);
    },
    [startStroke],
  );
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 1 || !isDrawing) return;
      const touch = e.touches[0]!;
      continueStroke(touch.clientX, touch.clientY);
    },
    [isDrawing, continueStroke],
  );
  const handleTouchEnd = useCallback(() => endStroke(), [endStroke]);

  // Resize canvas to container
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const w = Math.min(container.clientWidth, 900);
      const h = window.innerHeight * 0.7;
      canvas.width = w * 2;
      canvas.height = h * 2;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      redrawCanvas();
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [redrawCanvas]);

  // Init white background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const handleUndo = useCallback(() => {
    strokesRef.current.pop();
    if (strokesRef.current.length === 0) setHasDrawn(false);
    redrawCanvas();
  }, [redrawCanvas]);

  const handleClear = useCallback(() => {
    strokesRef.current = [];
    setHasDrawn(false);
    redrawCanvas();
  }, [redrawCanvas]);

  const handleToggleEraser = useCallback(() => {
    setIsErasing((prev) => !prev);
  }, []);

  const handleSend = useCallback(async () => {
    if (!channelId || !canvasRef.current) return;
    setIsSending(true);

    try {
      const canvas = canvasRef.current;
      const offscreen = document.createElement("canvas");
      offscreen.width = canvas.width;
      offscreen.height = canvas.height;
      const offCtx = offscreen.getContext("2d");
      if (!offCtx) return;

      offCtx.fillStyle = "#ffffff";
      offCtx.fillRect(0, 0, offscreen.width, offscreen.height);
      offCtx.drawImage(canvas, 0, 0);

      const dataUrl = offscreen.toDataURL("image/png");
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");

      await supabase
        .from("drawing_updates")
        .insert({ channel_id: channelId, base64image: base64 });

      setSent(true);
    } catch {
      // allow retry
    } finally {
      setIsSending(false);
    }
  }, [channelId]);

  if (!channelId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-8">
        <p className="text-lg text-gray-600">Invalid drawing link.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-white p-4">
      {/* Landscape prompt (mobile) */}
      <p className="mb-2 text-xs text-gray-400 sm:hidden">
        Rotate to landscape for best experience.
      </p>

      <h1 className="mb-4 text-xl font-bold text-gray-900">
        Handwritten Notes
      </h1>

      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2">
        {/* Color picker */}
        <div className="flex items-center gap-1.5">
          {PRESET_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              title={c.label}
              onClick={() => {
                setBrushColor(c.value);
                setIsErasing(false);
              }}
              className={[
                "h-6 w-6 rounded-full border-2 transition-transform",
                brushColor === c.value && !isErasing
                  ? "scale-125 border-blue-500"
                  : "border-gray-300",
              ].join(" ")}
              style={{ backgroundColor: c.value }}
              aria-label={c.label}
            />
          ))}
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-300" />

        {/* Brush size */}
        <label className="flex items-center gap-2 text-xs text-gray-600">
          Size
          <input
            type="range"
            min={1}
            max={20}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-20"
          />
          <span className="w-5 text-center font-mono">{brushSize}</span>
        </label>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-300" />

        {/* Actions */}
        <button
          type="button"
          onClick={handleUndo}
          disabled={!hasDrawn}
          className="rounded px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-40"
        >
          ↩ Undo
        </button>
        <button
          type="button"
          onClick={handleClear}
          disabled={!hasDrawn}
          className="rounded px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-40"
        >
          🗑 Clear
        </button>
        <button
          type="button"
          onClick={handleToggleEraser}
          className={[
            "rounded px-2 py-1 text-xs font-medium transition-colors",
            isErasing
              ? "bg-blue-100 text-blue-700"
              : "text-gray-700 hover:bg-gray-200",
          ].join(" ")}
          aria-pressed={isErasing}
        >
          Eraser {isErasing ? "ON" : "OFF"}
        </button>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="w-full max-w-[900px]"
        style={{ touchAction: "none" }}
      >
        <canvas
          ref={canvasRef}
          className="cursor-crosshair rounded-lg border border-gray-300"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
      </div>

      {/* Send button */}
      <div className="mt-4">
        {sent ? (
          <div className="rounded-lg border border-green-200 bg-green-50 px-6 py-3 text-center">
            <p className="font-medium text-green-700">
              ✓ Drawing sent! You can close this tab.
            </p>
          </div>
        ) : (
          <Button
            onClick={handleSend}
            disabled={!hasDrawn || isSending}
            loading={isSending}
          >
            Send to Clinician
          </Button>
        )}
      </div>
    </div>
  );
}

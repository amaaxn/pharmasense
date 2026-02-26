import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, X, Volume2, Loader2 } from "lucide-react";
import { sendMessage, type ChatMessage } from "../api/chat";
import { textToSpeech } from "../api/voice";

type VoiceState = "idle" | "listening" | "processing" | "speaking";

interface TranscriptEntry {
  id: string;
  role: "user" | "ai";
  text: string;
}

interface VoiceChatPanelProps {
  visitId: string;
  onClose: () => void;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const SpeechRecognitionAPI =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    : null;

export function VoiceChatPanel({ visitId, onClose }: VoiceChatPanelProps) {
  const [state, setState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [interim, setInterim] = useState("");
  const [supported] = useState(() => !!SpeechRecognitionAPI);

  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const historyRef = useRef<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [transcript, interim]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }, []);

  const processUserMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) {
        setState("idle");
        return;
      }

      const userEntry: TranscriptEntry = { id: crypto.randomUUID(), role: "user", text: text.trim() };
      setTranscript((prev) => [...prev, userEntry]);
      setInterim("");
      setState("processing");

      try {
        const response = await sendMessage({
          visit_id: visitId,
          message: text.trim(),
          history: historyRef.current.slice(-10),
        });

        historyRef.current.push(
          { sender: "user", text: text.trim() },
          { sender: "assistant", text: response.reply },
        );

        const aiEntry: TranscriptEntry = { id: crypto.randomUUID(), role: "ai", text: response.reply };
        setTranscript((prev) => [...prev, aiEntry]);

        setState("speaking");

        try {
          const audioBlob = await textToSpeech(response.reply);
          if (audioBlob.size < 100) {
            console.warn("TTS returned very small audio blob:", audioBlob.size, "bytes");
            setState("idle");
            return;
          }
          const url = URL.createObjectURL(audioBlob);
          const audio = new Audio(url);
          audioRef.current = audio;

          audio.onended = () => {
            URL.revokeObjectURL(url);
            audioRef.current = null;
            setState("idle");
          };
          audio.onerror = (e) => {
            console.error("Audio playback error:", e);
            URL.revokeObjectURL(url);
            audioRef.current = null;
            setState("idle");
          };

          await audio.play();
        } catch (err) {
          console.error("TTS or playback failed:", err);
          setState("idle");
        }
      } catch {
        const errorEntry: TranscriptEntry = {
          id: crypto.randomUUID(),
          role: "ai",
          text: "Sorry, I couldn't process that. Please try again.",
        };
        setTranscript((prev) => [...prev, errorEntry]);
        setState("idle");
      }
    },
    [visitId],
  );

  const startListening = useCallback(() => {
    if (!SpeechRecognitionAPI) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const recognition = new (SpeechRecognitionAPI as any)();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]!;
        if (result.isFinal) {
          finalText += result[0]!.transcript;
        } else {
          interimText += result[0]!.transcript;
        }
      }
      if (interimText) setInterim(interimText);
      if (finalText) {
        setInterim("");
        processUserMessage(finalText);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== "aborted" && event.error !== "no-speech") {
        console.error("SpeechRecognition error:", event.error);
      }
      setInterim("");
      if (state === "listening") setState("idle");
    };

    recognition.onend = () => {
      if (state === "listening") {
        const currentInterim = interim;
        if (currentInterim) {
          processUserMessage(currentInterim);
        } else {
          setState("idle");
        }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setState("listening");
  }, [processUserMessage, state, interim]);

  const handleMicToggle = useCallback(() => {
    if (state === "listening") {
      stopListening();
      setState("idle");
    } else if (state === "idle") {
      startListening();
    } else if (state === "speaking") {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setState("idle");
      startListening();
    }
  }, [state, startListening, stopListening]);

  const stateLabel: Record<VoiceState, string> = {
    idle: "Tap microphone to speak",
    listening: "Listening…",
    processing: "Thinking…",
    speaking: "Speaking…",
  };

  if (!supported) {
    return (
      <Panel onClose={onClose}>
        <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
          <MicOff className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Voice chat is not supported in this browser. Please use Chrome, Edge, or Safari.
          </p>
        </div>
      </Panel>
    );
  }

  return (
    <Panel onClose={onClose}>
      {/* Transcript */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-1 py-2">
        {transcript.length === 0 && !interim && (
          <div className="flex h-full items-center justify-center text-center">
            <p className="text-sm text-muted-foreground">
              Ask about your prescription using your voice.
            </p>
          </div>
        )}
        {transcript.map((entry) => (
          <div
            key={entry.id}
            className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                entry.role === "user"
                  ? "bg-primary/15 text-foreground"
                  : "border-l-2 border-primary bg-secondary/40 text-foreground"
              }`}
            >
              {entry.role === "ai" && (
                <div className="mb-1 flex items-center gap-1 text-xs text-primary">
                  <Volume2 className="h-3 w-3" /> AI
                </div>
              )}
              <p className="whitespace-pre-wrap leading-relaxed">{entry.text}</p>
            </div>
          </div>
        ))}
        {interim && (
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-xl bg-primary/10 px-3 py-2 text-sm italic text-muted-foreground">
              {interim}…
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-2 border-t border-border/30 pt-4">
        <p className="text-xs text-muted-foreground">{stateLabel[state]}</p>
        <button
          onClick={handleMicToggle}
          disabled={state === "processing"}
          className={`relative flex h-14 w-14 items-center justify-center rounded-full transition-all ${
            state === "listening"
              ? "bg-destructive text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]"
              : state === "processing"
                ? "bg-secondary text-muted-foreground"
                : state === "speaking"
                  ? "bg-primary/20 text-primary"
                  : "bg-gradient-to-br from-ps-burgundy to-primary text-white shadow-glow-brand hover:opacity-90"
          }`}
          aria-label={state === "listening" ? "Stop listening" : "Start speaking"}
        >
          {state === "processing" ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : state === "listening" ? (
            <MicOff className="h-6 w-6" />
          ) : state === "speaking" ? (
            <Volume2 className="h-6 w-6 animate-pulse" />
          ) : (
            <Mic className="h-6 w-6" />
          )}
          {state === "listening" && (
            <span className="absolute inset-0 animate-ping rounded-full bg-destructive/30" />
          )}
        </button>
      </div>
    </Panel>
  );
}

function Panel({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
        className="fixed bottom-6 right-6 z-50 flex h-[480px] w-[360px] flex-col rounded-2xl glass-card shadow-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-ps-burgundy to-primary">
              <Mic className="h-3.5 w-3.5 text-white" />
            </div>
            <h3 className="font-display text-sm font-semibold text-foreground">Voice Chat</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground transition hover:bg-secondary/60 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col overflow-hidden px-3 pb-4">
          {children}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

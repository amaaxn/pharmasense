import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "../i18n";
import { useAuthStore } from "../stores/authStore";
import { PageTransition } from "../components/PageTransition";
import { Badge, Button, Card, LoadingSpinner } from "../shared";
import { sendMessage } from "../api/chat";
import type { ChatMessage } from "../api/chat";

interface DisplayMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  timestamp: Date;
}

const IDLE_TIMEOUT_MS = 30_000;

function highlightDrugNames(text: string): React.ReactNode[] {
  const drugPattern =
    /\b(amoxicillin|penicillin|ibuprofen|acetaminophen|aspirin|metformin|lisinopril|atorvastatin|simvastatin|omeprazole|losartan|amlodipine|hydrochlorothiazide|gabapentin|sertraline|fluoxetine|escitalopram|duloxetine|tramadol|codeine|morphine|oxycodone|prednisone|azithromycin|ciprofloxacin|doxycycline|cephalexin|clindamycin|levothyroxine|warfarin|clopidogrel|rosuvastatin|pantoprazole|albuterol|montelukast|insulin|metoprolol|carvedilol|furosemide|spironolactone)\b/gi;

  const severityPattern =
    /\b(MILD|MODERATE|SEVERE|CRITICAL)\b\s*(interaction|warning|risk|concern)/gi;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const combined = new RegExp(
    `(${drugPattern.source})|(${severityPattern.source})`,
    "gi",
  );

  let match: RegExpExecArray | null;
  while ((match = combined.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const fullMatch = match[0];
    const severityMatch = fullMatch.match(
      /\b(MILD|MODERATE|SEVERE|CRITICAL)\b/i,
    );

    if (severityMatch) {
      const severity = severityMatch[0].toUpperCase();
      const variant =
        severity === "SEVERE" || severity === "CRITICAL"
          ? "safety-fail"
          : severity === "MODERATE"
            ? "safety-warn"
            : "safety-pass";
      parts.push(
        <Badge key={match.index} variant={variant}>
          {fullMatch}
        </Badge>,
      );
    } else {
      parts.push(
        <span key={match.index} className="font-mono text-accent-cyan">
          {fullMatch}
        </span>,
      );
    }

    lastIndex = match.index + fullMatch.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

export function VisitChatPage() {
  const { id: visitId } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const announcerRef = useRef<HTMLDivElement>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastUserMessageRef = useRef<number>(0);

  const announce = useCallback((msg: string) => {
    if (announcerRef.current) {
      announcerRef.current.textContent = msg;
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  // Idle timer to re-show suggestions
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setShowSuggestions(true);
    }, IDLE_TIMEOUT_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  const suggestions = [
    t.chatSuggestRationale,
    t.chatSuggestCheapest,
    t.chatSuggestRisks,
    t.chatSuggestSimplify,
  ];

  const handleSend = useCallback(
    async (text: string) => {
      if (!text.trim() || !visitId) return;

      setError(null);

      const userMsg: DisplayMessage = {
        id: crypto.randomUUID(),
        role: "user",
        text: text.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsTyping(true);

      if (lastUserMessageRef.current === 0) {
        setShowSuggestions(false);
      }
      lastUserMessageRef.current = Date.now();
      resetIdleTimer();

      const history: ChatMessage[] = messages
        .slice(-10)
        .map((m) => ({
          sender: m.role === "user" ? "user" : "assistant",
          text: m.text,
        }));

      try {
        const response = await sendMessage({
          visit_id: visitId,
          message: text.trim(),
          history,
        });

        const aiMsg: DisplayMessage = {
          id: crypto.randomUUID(),
          role: "ai",
          text: response.reply,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, aiMsg]);
        announce(t.chatResponseReceived);
      } catch {
        setError(t.errorGeneric);
      } finally {
        setIsTyping(false);
        inputRef.current?.focus();
      }
    },
    [visitId, messages, announce, t, resetIdleTimer],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend(input);
      }
    },
    [handleSend, input],
  );

  return (
    <PageTransition>
      <div className="flex h-[calc(100vh-4rem)] flex-col p-4 lg:p-8">
        {/* Screen reader announcer */}
        <div
          ref={announcerRef}
          role="status"
          aria-live="polite"
          className="sr-only"
        />

        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-h2 text-text-heading">{t.chatTitle}</h1>
            <p className="mt-0.5 text-sm text-text-secondary">
              Visit {visitId}
              {user && (
                <span className="ml-2 text-text-secondary">
                  ({user.role})
                </span>
              )}
            </p>
          </div>
          <Link
            to={`/visit/${visitId}`}
            className="text-sm text-accent-cyan underline-offset-2 hover:underline"
          >
            ← Back to Visit
          </Link>
        </div>

        {/* Messages area */}
        <Card className="flex flex-1 flex-col overflow-hidden">
          <div
            className="flex-1 space-y-4 overflow-y-auto p-4"
            role="log"
            aria-label="Chat messages"
          >
            {messages.length === 0 && !isTyping && (
              <div className="flex h-full items-center justify-center text-center text-text-secondary">
                <p>
                  Ask a question about your prescription and get instant
                  AI-powered answers.
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-accent-cyan/15 text-text-primary"
                      : "border-l-2 border-accent-purple bg-bg-elevated text-text-primary"
                  }`}
                >
                  {msg.role === "ai" && (
                    <div className="mb-1.5">
                      <Badge variant="ai">AI</Badge>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {msg.role === "ai"
                      ? highlightDrugNames(msg.text)
                      : msg.text}
                  </div>
                  <p className="mt-1.5 text-xs text-text-secondary">
                    {msg.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-xl border-l-2 border-accent-purple bg-bg-elevated px-4 py-3">
                  <LoadingSpinner size="sm" />
                  <span className="text-sm text-text-secondary">
                    {t.chatTyping}
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {showSuggestions && (
            <div className="flex flex-wrap gap-2 border-t border-border-default px-4 py-3">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleSend(suggestion)}
                  className="rounded-full border border-accent-cyan/30 bg-accent-cyan/5 px-3 py-1.5 text-xs text-accent-cyan transition-colors hover:bg-accent-cyan/15"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="border-t border-accent-red/30 bg-accent-red/5 px-4 py-2">
              <p className="text-sm text-accent-red">{error}</p>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-border-default p-4">
            <div className="flex items-center gap-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t.chatInputPlaceholder}
                className="flex-1 rounded-lg border border-border-default bg-bg-input px-4 py-2.5 text-text-primary placeholder:text-text-secondary/60 focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
                aria-label={t.chatInputPlaceholder}
                disabled={isTyping}
              />
              <Button
                onClick={() => handleSend(input)}
                disabled={!input.trim() || isTyping}
                loading={isTyping}
              >
                {t.chatSend}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </PageTransition>
  );
}

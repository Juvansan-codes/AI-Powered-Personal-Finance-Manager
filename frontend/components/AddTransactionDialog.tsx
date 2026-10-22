"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Sparkles,
  Loader2,
  Mic,
  Square,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Volume2,
} from "lucide-react";
import { api } from "@/lib/api";
import type { TransactionCreate, VoiceExtractResponse } from "@/types";

const EXPENSE_CATEGORIES = [
  "Food",
  "Transportation",
  "Shopping",
  "Education",
  "Healthcare",
  "Utilities",
  "Entertainment",
  "Rent",
  "Other",
];

const INCOME_CATEGORIES = ["Salary", "Other Income"];

interface AddTransactionDialogProps {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
  startWithVoice?: boolean;
}

type VoiceStatus = "idle" | "recording" | "processing" | "success" | "error";

export default function AddTransactionDialog({
  open,
  onClose,
  onAdded,
  startWithVoice = false,
}: AddTransactionDialogProps) {
  // Form state
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Rule-based AI Suggestion
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<{
    category: string;
    confidence: string | number;
    method: string;
    requires_review: boolean;
  } | null>(null);

  // Real-time Anomaly Alert
  const [anomalyAlert, setAnomalyAlert] = useState<string | null>(null);

  // Voice recording state
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("idle");
  const [voiceError, setVoiceError] = useState("");
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [voiceClarification, setVoiceClarification] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize date on open
  useEffect(() => {
    if (open && !date) {
      setDate(new Date().toISOString().split("T")[0]);
    }
  }, [open, date]);

  // Cleanup audio & timer on unmount or close
  useEffect(() => {
    if (!open) {
      stopRecordingCleanup();
      resetForm();
    }
  }, [open]);

  // Automatically start voice if requested
  useEffect(() => {
    if (open && startWithVoice && voiceStatus === "idle") {
      startRecording();
    }
  }, [open, startWithVoice]);

  const stopRecordingCleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore if already stopped
      }
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
  };

  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  // Auto-suggest category when description changes manually
  useEffect(() => {
    if (description.length < 3 || voiceStatus === "processing") {
      setSuggestion(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSuggesting(true);
        const result = await api.categorize(description, type);
        setSuggestion({
          category: result.category,
          confidence: result.confidence,
          method: result.method,
          requires_review: result.requires_review ?? false,
        });
        // Auto-apply if not low confidence and no category selected yet
        const isLow = result.confidence === "low" || (typeof result.confidence === "number" && result.confidence < 0.5);
        if (!isLow && !category) {
          setCategory(result.category);
        }
      } catch {
        // Silently fail — AI suggestion is optional
      } finally {
        setSuggesting(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [description, type]);

  // Real-time anomaly check when amount and category change
  useEffect(() => {
    const amtNum = parseFloat(amount);
    if (!amtNum || amtNum <= 0 || !category || type !== "expense") {
      setAnomalyAlert(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await api.checkAnomaly(amtNum, category, description);
        if (res.is_anomaly && res.explanation) {
          setAnomalyAlert(res.explanation);
        } else {
          setAnomalyAlert(null);
        }
      } catch {
        setAnomalyAlert(null);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [amount, category, type, description]);

  const resetForm = () => {
    setDescription("");
    setAmount("");
    setType("expense");
    setCategory("");
    setDate(new Date().toISOString().split("T")[0]);
    setError("");
    setSuccess(false);
    setSuggestion(null);
    setAnomalyAlert(null);
    setVoiceStatus("idle");
    setVoiceError("");
    setRecordSeconds(0);
    setTranscript("");
    setVoiceClarification("");
  };

  // --- Voice Recording Flow ---

  const startRecording = async () => {
    setVoiceError("");
    setError("");
    setVoiceClarification("");

    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setVoiceStatus("error");
      setVoiceError("Audio recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Select supported audio MIME type
      let mimeType = "audio/webm;codecs=opus";
      if (typeof MediaRecorder !== "undefined") {
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          if (MediaRecorder.isTypeSupported("audio/webm")) {
            mimeType = "audio/webm";
          } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
            mimeType = "audio/mp4";
          } else {
            mimeType = ""; // Browser default
          }
        }
      }

      audioChunksRef.current = [];
      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop audio tracks
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(audioChunksRef.current, {
          type: mimeType || "audio/webm",
        });

        if (audioBlob.size === 0) {
          setVoiceStatus("error");
          setVoiceError("No audio was recorded. Please speak clearly and try again.");
          return;
        }

        await processAudio(audioBlob);
      };

      mediaRecorder.start(200);
      setVoiceStatus("recording");
      setRecordSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordSeconds((prev) => {
          if (prev >= 60) {
            // Auto-stop after 60 seconds
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      setVoiceStatus("error");
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError" ||
        err.message?.includes("Permission denied")
      ) {
        setVoiceError(
          "Microphone permission was denied. Please allow microphone access in your browser settings to use voice entry."
        );
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setVoiceError("No microphone found on your device.");
      } else {
        setVoiceError(err.message || "Failed to start microphone recording.");
      }
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setVoiceStatus("processing");
    }
  };

  const processAudio = async (blob: Blob) => {
    setVoiceStatus("processing");
    setVoiceError("");

    try {
      // 1. Transcribe audio with Groq Whisper
      const transcribeRes = await api.transcribeAudio(blob);
      const text = transcribeRes.text?.trim() || "";

      if (!text) {
        setVoiceStatus("error");
        setVoiceError(
          "No clear speech was detected in your recording. Please try speaking closer to the microphone."
        );
        return;
      }

      setTranscript(text);

      // 2. Extract transaction details with Groq LLM
      const todayIso = new Date().toISOString().split("T")[0];
      const extractRes: VoiceExtractResponse = await api.extractVoice(text, todayIso);

      if (extractRes.draft) {
        const draft = extractRes.draft;
        if (draft.description) setDescription(draft.description);
        if (draft.amount !== undefined && draft.amount !== null) {
          setAmount(draft.amount.toString());
        }
        if (draft.type === "income" || draft.type === "expense") {
          setType(draft.type);
        }
        if (draft.category) {
          setCategory(draft.category);
        }
        if (draft.date) {
          setDate(draft.date);
        }
      }

      if (!extractRes.is_complete && extractRes.clarification_needed) {
        setVoiceClarification(extractRes.clarification_needed);
      }

      setVoiceStatus("success");
    } catch (err: any) {
      setVoiceStatus("error");
      setVoiceError(err.message || "Voice processing failed. Please check your connection or try again.");
    }
  };

  // --- Manual / Confirmed Submit Flow ---

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    // Validate
    if (!description.trim()) {
      setError("Description is required.");
      return;
    }
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Amount must be a positive number.");
      return;
    }
    if (!category) {
      setError("Please select a category.");
      return;
    }
    if (!date) {
      setError("Date is required.");
      return;
    }

    try {
      setSaving(true);
      const data: TransactionCreate = {
        description: description.trim(),
        amount: amountNum,
        type,
        category,
        date,
      };
      await api.createTransaction(data);
      setSuccess(true);
      setTimeout(() => {
        resetForm();
        onAdded();
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message || "Failed to add transaction.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-border/80 max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-semibold text-foreground">
              Add Transaction
            </h2>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
              Voice AI Enabled
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Voice Assistant Panel */}
          <div className="rounded-xl border border-border/80 bg-[#fbfbfb] p-4 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    voiceStatus === "recording"
                      ? "bg-danger text-white animate-pulse"
                      : "bg-accent/10 text-accent"
                  }`}
                >
                  <Mic className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-foreground tracking-tight">
                    Voice-Powered Entry
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Powered by Groq Whisper & LLaMA AI
                  </p>
                </div>
              </div>

              {/* Recording Controls */}
              {voiceStatus === "idle" && (
                <button
                  type="button"
                  onClick={startRecording}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-dark text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
                  aria-label="Start voice recording"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Tap to Speak</span>
                </button>
              )}

              {voiceStatus === "recording" && (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-danger hover:bg-danger/90 text-white rounded-lg text-xs font-medium transition-colors shadow-sm animate-pulse"
                  aria-label="Stop recording"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop ({formatSeconds(recordSeconds)})</span>
                </button>
              )}

              {voiceStatus === "processing" && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted text-muted-foreground rounded-lg text-xs font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
                  <span>Processing speech…</span>
                </div>
              )}

              {(voiceStatus === "success" || voiceStatus === "error") && (
                <button
                  type="button"
                  onClick={startRecording}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                  title="Record again"
                  aria-label="Record again"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Speak Again</span>
                </button>
              )}
            </div>

            {/* Hint & Example */}
            {voiceStatus === "idle" && (
              <p className="text-xs text-muted-foreground/90 bg-white border border-border/60 rounded-lg p-2.5">
                💡 <span className="font-medium text-foreground">Try saying:</span>{" "}
                <span className="italic">
                  “I spent 250 rupees on lunch yesterday”
                </span>{" "}
                or{" "}
                <span className="italic">
                  “Received 5000 rupees freelance payment”
                </span>
              </p>
            )}

            {/* Active Recording Waveform Indicator */}
            {voiceStatus === "recording" && (
              <div className="flex items-center gap-3 p-3 bg-danger-light/30 border border-danger/20 rounded-lg">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-5 bg-danger rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-8 bg-danger rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-6 bg-danger rounded-full animate-bounce" />
                  <span className="w-1.5 h-4 bg-danger rounded-full animate-bounce [animation-delay:-0.2s]" />
                </div>
                <div className="flex-1 text-xs">
                  <p className="font-medium text-danger">Listening to your speech…</p>
                  <p className="text-[11px] text-muted-foreground">
                    State amount, item or purpose, and when it occurred. Click Stop when done.
                  </p>
                </div>
                <span className="text-xs font-mono font-medium text-danger">
                  {formatSeconds(recordSeconds)}
                </span>
              </div>
            )}

            {/* Processing State */}
            {voiceStatus === "processing" && (
              <div className="flex items-center gap-2.5 p-3 bg-accent/5 border border-accent/20 rounded-lg text-xs text-foreground">
                <Loader2 className="w-4 h-4 animate-spin text-accent shrink-0" />
                <div>
                  <p className="font-medium">Transcribing and extracting transaction details…</p>
                  <p className="text-[11px] text-muted-foreground">
                    Using Groq Whisper STT & LLaMA entity recognition.
                  </p>
                </div>
              </div>
            )}

            {/* Voice Success / Extracted State */}
            {voiceStatus === "success" && transcript && (
              <div className="space-y-2">
                <div className="p-3 bg-white border border-border rounded-lg text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1 font-medium text-foreground">
                      <Volume2 className="w-3.5 h-3.5 text-accent" /> Heard Transcript:
                    </span>
                    <span className="flex items-center gap-1 text-success font-medium">
                      <CheckCircle2 className="w-3 h-3" /> Extracted by AI
                    </span>
                  </div>
                  <p className="font-mono text-foreground/90 bg-muted/40 p-2 rounded border border-border/50 text-[11.5px] leading-relaxed">
                    &ldquo;{transcript}&rdquo;
                  </p>
                </div>

                {voiceClarification && (
                  <div className="flex items-start gap-2 p-2.5 bg-accent/10 border border-accent/30 rounded-lg text-xs text-accent-dark">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{voiceClarification}</span>
                  </div>
                )}
              </div>
            )}

            {/* Voice Error State */}
            {voiceStatus === "error" && voiceError && (
              <div className="flex items-start gap-2 p-3 bg-danger-light border border-danger/20 rounded-lg text-xs text-danger">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">Voice Entry Error</p>
                  <p className="text-[11px] text-danger/90 mt-0.5">{voiceError}</p>
                </div>
              </div>
            )}
          </div>

          {/* Form Fields */}
          <form id="transaction-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Type Toggle */}
            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                Transaction Type
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setType("expense");
                    setCategory("");
                    setSuggestion(null);
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all border ${
                    type === "expense"
                      ? "bg-danger text-white border-danger shadow-sm"
                      : "bg-white text-muted-foreground border-border hover:border-foreground/20"
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setType("income");
                    setCategory("");
                    setSuggestion(null);
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all border ${
                    type === "income"
                      ? "bg-success text-white border-success shadow-sm"
                      : "bg-white text-muted-foreground border-border hover:border-foreground/20"
                  }`}
                >
                  Income
                </button>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Lunch at college canteen"
                className="w-full px-3.5 py-2.5 rounded-lg border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
              />

              {/* AI Suggestion */}
              {suggesting && (
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Suggesting category…</span>
                </div>
              )}
              {suggestion && !suggesting && (
                <div className="mt-1.5 space-y-1">
                  <button
                    type="button"
                    onClick={() => setCategory(suggestion.category)}
                    className="flex items-center gap-1.5 text-xs text-accent hover:text-accent-dark transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>
                      Suggested: <strong>{suggestion.category}</strong>{" "}
                      <span className="text-muted-foreground">
                        ({typeof suggestion.confidence === "number"
                          ? `${Math.round(suggestion.confidence * 100)}%`
                          : suggestion.confidence}{" "}
                        confidence)
                      </span>
                    </span>
                    <span
                      className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${
                        suggestion.method === "ml"
                          ? "bg-accent/10 text-accent border border-accent/20"
                          : "bg-muted text-muted-foreground border border-border"
                      }`}
                    >
                      {suggestion.method === "ml" ? "ML" : "Rules"}
                    </span>
                  </button>
                  {suggestion.requires_review && (
                    <p className="text-[11px] text-amber-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Low confidence — please verify the suggested category
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Amount & Category 2-Column Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors font-mono"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors bg-white"
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Real-time Unusual Spending Notice */}
            {anomalyAlert && (
              <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200/80 rounded-lg text-xs text-amber-900 animate-in fade-in duration-200">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-900">Spending Anomaly Notice</p>
                  <p className="text-amber-800 text-[11.5px] mt-0.5 leading-relaxed">{anomalyAlert}</p>
                  <p className="text-[10.5px] text-amber-700/80 mt-1">
                    You can still confirm and save if this expense was intentional.
                  </p>
                </div>
              </div>
            )}

            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
              />
            </div>

            {/* Error Banner */}
            {error && (
              <div className="flex items-center gap-2 px-3.5 py-2.5 bg-danger-light border border-danger/20 rounded-lg text-xs text-danger">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Success Banner */}
            {success && (
              <div className="flex items-center gap-2 px-3.5 py-2.5 bg-success-light border border-success/20 rounded-lg text-xs text-success">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Transaction confirmed and saved!</span>
              </div>
            )}
          </form>
        </div>

        {/* Footer / Confirmation Action */}
        <div className="px-6 py-4 border-t border-border bg-[#fafafa] flex items-center justify-between gap-3 sticky bottom-0 z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            form="transaction-form"
            disabled={saving || success || voiceStatus === "recording" || voiceStatus === "processing"}
            className="flex-1 sm:flex-initial py-2.5 px-6 bg-accent hover:bg-accent-dark text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving…</span>
              </>
            ) : success ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmed ✓</span>
              </>
            ) : (
              "Confirm & Save Transaction"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

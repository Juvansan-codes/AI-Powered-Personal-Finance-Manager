"use client";

import { useState, useEffect, useRef } from "react";
import {
  Bot,
  User,
  Send,
  Sparkles,
  Mic,
  Square,
  Volume2,
  VolumeX,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Wrench,
  Loader2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "@/lib/api";
import type { AssistantChatMessage, AssistantSuggestionItem } from "@/types";

const INITIAL_MESSAGE: AssistantChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hello! I'm your **FinanceFlow AI Assistant**, powered by Groq. I can directly inspect your income, spending breakdowns, category budgets, and run **what-if purchase simulations** using live data. What would you like to explore today?",
  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
};

export default function AssistantChat() {
  const [messages, setMessages] = useState<AssistantChatMessage[]>([INITIAL_MESSAGE]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AssistantSuggestionItem[]>([]);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch quick prompt suggestions on mount
  useEffect(() => {
    async function loadSuggestions() {
      try {
        const items = await api.getAssistantSuggestions();
        setSuggestions(items);
      } catch (err) {
        console.warn("Could not load assistant suggestions:", err);
      }
    }
    loadSuggestions();
  }, []);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Handle Text-to-Speech (TTS)
  const toggleSpeech = (msgId: string, text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Speech synthesis is not supported on your browser.");
      return;
    }

    if (speakingMessageId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    // Clean markdown asterisks and hashtags for smoother speech
    const cleanSpeech = text
      .replace(/\*\*/g, "")
      .replace(/₹/g, "rupees ")
      .replace(/[#*_`]/g, "");

    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);

    setSpeakingMessageId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Voice recording handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const options = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? { mimeType: "audio/webm;codecs=opus" }
        : undefined;

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        if (audioBlob.size > 0) {
          try {
            setLoading(true);
            const res = await api.transcribeAudio(audioBlob);
            if (res.text && res.text.trim()) {
              sendMessage(res.text.trim());
            }
          } catch (err: any) {
            console.error("Audio transcription failed:", err);
          } finally {
            setLoading(false);
          }
        }
      };

      recorder.start(250);
      setIsRecording(true);
      setVoiceSeconds(0);

      timerRef.current = setInterval(() => {
        setVoiceSeconds((sec) => sec + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Mic access denied or error:", err);
      alert("Microphone permission was denied or not found.");
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // Submit chat message
  const sendMessage = async (text: string) => {
    const prompt = text.trim();
    if (!prompt || loading) return;

    const userMsg: AssistantChatMessage = {
      id: `usr_${Date.now()}`,
      role: "user",
      content: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newThread = [...messages, userMsg];
    setMessages(newThread);
    setInputValue("");
    setLoading(true);

    try {
      // Build conversation history for context
      const historyPayload = newThread
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await api.askAssistant(prompt, historyPayload);

      const assistantMsg: AssistantChatMessage = {
        id: `ast_${Date.now()}`,
        role: "assistant",
        content: res.reply,
        tools_used: res.tools_used,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: AssistantChatMessage = {
        id: `err_${Date.now()}`,
        role: "assistant",
        content:
          err.message ||
          "Sorry, I had trouble connecting to the AI service. Please ensure the Groq API key is valid.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const clearChat = () => {
    if (speakingMessageId && typeof window !== "undefined") {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
    }
    setMessages([INITIAL_MESSAGE]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] bg-white rounded-xl border border-border shadow-sm overflow-hidden">
      {/* Assistant Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-white shadow-sm">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">Financial Assistant</h2>
              <span className="px-2 py-0.5 text-[11px] font-medium bg-accent/10 text-accent rounded-full border border-accent/20">
                Groq LLM + Tools
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Deterministic calculations • Real Supabase/SQLite data • Purchase simulation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={clearChat}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors border border-border"
            title="Reset conversation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-3xl ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-semibold ${
                  isUser
                    ? "bg-foreground text-background"
                    : "bg-accent/10 text-accent border border-accent/20"
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div className="space-y-1.5 max-w-[85%]">
                <div
                  className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    isUser
                      ? "bg-accent text-white rounded-tr-none shadow-sm"
                      : "bg-[#f8f9fa] border border-border text-foreground rounded-tl-none"
                  }`}
                >
                  {/* Tool Badges */}
                  {msg.tools_used && msg.tools_used.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1.5 pb-2.5 border-b border-border/60">
                      {msg.tools_used.map((tool, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 bg-white border border-border rounded-md text-muted-foreground font-mono"
                        >
                          <Wrench className="w-3 h-3 text-accent" />
                          <span>{tool.tool_name.replace(/_/g, " ")}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Message Text — full markdown */}
                  <div className="prose-chat">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>

                {/* Footer details: Timestamp & Speech button */}
                <div
                  className={`flex items-center gap-2 text-[11px] text-muted-foreground px-1 ${
                    isUser ? "justify-end" : "justify-start"
                  }`}
                >
                  <span>{msg.timestamp}</span>
                  {!isUser && (
                    <button
                      onClick={() => toggleSpeech(msg.id, msg.content)}
                      className={`p-1 rounded hover:bg-muted transition-colors ${
                        speakingMessageId === msg.id ? "text-accent font-medium" : ""
                      }`}
                      title={speakingMessageId === msg.id ? "Stop voice reading" : "Read aloud (TTS)"}
                    >
                      {speakingMessageId === msg.id ? (
                        <VolumeX className="w-3.5 h-3.5" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex gap-3 max-w-xl mr-auto">
            <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center bg-accent/10 text-accent border border-accent/20">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3.5 rounded-2xl rounded-tl-none bg-[#f8f9fa] border border-border text-sm text-muted-foreground flex items-center gap-2.5">
              <Loader2 className="w-4 h-4 animate-spin text-accent" />
              <span>Analyzing financial data with Groq...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompt Chips */}
      {suggestions.length > 0 && (
        <div className="px-6 py-2.5 bg-muted/20 border-t border-border flex items-center gap-2 overflow-x-auto no-scrollbar">
          <Sparkles className="w-3.5 h-3.5 text-accent flex-shrink-0" />
          <span className="text-xs font-medium text-muted-foreground flex-shrink-0">Try asking:</span>
          <div className="flex items-center gap-1.5 flex-nowrap">
            {suggestions.map((item) => (
              <button
                key={item.id}
                onClick={() => sendMessage(item.prompt)}
                disabled={loading}
                className="text-xs px-3 py-1 bg-white hover:bg-accent/5 hover:border-accent/40 border border-border rounded-full text-foreground whitespace-nowrap transition-colors shadow-2xs disabled:opacity-50"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Box & Voice Bar */}
      <div className="p-4 border-t border-border bg-white">
        {isRecording ? (
          <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-medium text-red-900">
                Listening... {voiceSeconds}s
              </span>
              <span className="text-xs text-red-700">
                (Transcribing with Groq Whisper on release)
              </span>
            </div>
            <button
              onClick={stopRecording}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
              <span>Done</span>
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(inputValue);
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask anything (e.g. 'What is my balance?' or 'Can I afford ₹3,000 for dinner?')..."
              disabled={loading}
              className="flex-1 px-4 py-2.5 text-sm bg-muted/40 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all text-foreground placeholder:text-muted-foreground disabled:opacity-50"
            />

            <button
              type="button"
              onClick={startRecording}
              disabled={loading}
              className="p-2.5 border border-border hover:bg-accent/10 hover:border-accent/40 text-muted-foreground hover:text-accent rounded-xl transition-colors disabled:opacity-50"
              title="Speak your question using microphone"
            >
              <Mic className="w-4 h-4" />
            </button>

            <button
              type="submit"
              disabled={!inputValue.trim() || loading}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-accent hover:bg-accent-dark text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState, useRef, useCallback } from "react";
import { ArrowUp, Loader2, Sparkles, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type { ChatMessage } from "@/lib/types";

const SUGGESTIONS = [
  { text: "What do my latest blood test results mean?", icon: "🩸" },
  { text: "Are any of my metrics trending upward?", icon: "📈" },
  { text: "Give me a summary of my health this month", icon: "📋" },
  { text: "What should I ask my doctor next visit?", icon: "👨‍⚕️" },
];

export default function ChatPage() {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const msgCounter = useRef(0);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await api.get<{ data: ChatMessage[] }>("/chat/history?limit=50", token);
        setMessages((res.data || []).reverse());
      } catch {
        console.error("Failed to fetch chat history");
      } finally {
        setLoading(false);
      }
    };
    loadHistory();
  }, [getToken]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSend = useCallback(async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || sending) return;
    setInput("");
    setSending(true);

    msgCounter.current += 1;
    const userMsg: ChatMessage = {
      id: `temp-${msgCounter.current}`,
      userId: "",
      role: "user",
      content: msg,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const token = await getToken();
      if (!token) return;
      const res = await api.post<{ data: { reply: string } }>("/chat/send", { message: msg }, token);
      msgCounter.current += 1;
      const assistantMsg: ChatMessage = {
        id: `temp-${msgCounter.current}`,
        userId: "",
        role: "assistant",
        content: res.data.reply,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev.slice(0, -1), userMsg, assistantMsg]);
    } catch {
      msgCounter.current += 1;
      const errorMsg: ChatMessage = {
        id: `temp-${msgCounter.current}`,
        userId: "",
        role: "assistant",
        content: "Something went wrong. Please try again.",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev.slice(0, -1), userMsg, errorMsg]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [input, sending, getToken]);

  const handleClear = useCallback(async () => {
    if (!confirm("Clear all chat history?")) return;
    try {
      const token = await getToken();
      if (!token) return;
      await api.delete("/chat/history", token);
      setMessages([]);
    } catch {
      console.error("Failed to clear chat");
    }
  }, [getToken]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] lg:h-[calc(100vh-4rem)]">
      {/* Scrollable messages / empty state area */}
      <div className={`flex-1 min-h-0 ${hasMessages ? "overflow-y-auto scrollbar-thin" : "overflow-hidden"}`}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 text-slate-300 animate-spin" />
          </div>
        ) : !hasMessages ? (
          <div className="flex flex-col items-center justify-center h-full px-4">
            {/* Hero icon */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-navy to-blue flex items-center justify-center mb-6 shadow-lg shadow-navy/15">
              <Sparkles className="w-7 h-7 text-white" />
            </div>

            {/* Title */}
            <h1 className="text-[1.5rem] font-bold text-slate-900 mb-2 tracking-tight">
              CareDesk AI
            </h1>
            <p className="text-sm text-slate-500 mb-10 text-center max-w-sm leading-relaxed">
              Your AI health assistant. Ask anything about your medical reports, metrics, or health trends.
            </p>

            {/* Suggestion cards — centered grid, no overlap */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-lg">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.text}
                  onClick={() => handleSend(s.text)}
                  className="group text-left px-4 py-3.5 text-[13px] text-slate-600 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm hover:scale-[1.01] transition-all duration-200 leading-snug"
                >
                  <span className="mr-1.5">{s.icon}</span>
                  {s.text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Messages stream */
          <div className="max-w-3xl mx-auto space-y-5 py-4 px-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] ${msg.role === "user" ? "order-2" : ""}`}>
                  {msg.role === "assistant" && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-5 h-5 rounded-md bg-gradient-to-br from-navy to-blue flex items-center justify-center">
                        <Sparkles className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-xs font-medium text-slate-400">CareDesk AI</span>
                    </div>
                  )}
                  <div
                    className={`px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-navy text-white rounded-2xl rounded-tr-md"
                        : "text-slate-700"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="max-w-[80%]">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-5 h-5 rounded-md bg-gradient-to-br from-navy to-blue flex items-center justify-center">
                      <Sparkles className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-xs font-medium text-slate-400">CareDesk AI</span>
                  </div>
                  <div className="px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Sticky input bar — never overlaps, always pinned bottom */}
      <div className="flex-none border-t border-slate-100 bg-white/80 backdrop-blur-md p-3 lg:p-4">
        <div className="max-w-3xl mx-auto">
          {hasMessages && (
            <div className="flex items-center justify-end mb-2">
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Clear chat
              </button>
            </div>
          )}
          <div className="relative bg-white border border-slate-200 rounded-2xl shadow-sm focus-within:border-slate-300 focus-within:shadow-md transition-all duration-200">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your health..."
              rows={1}
              className="w-full resize-none px-4 pr-12 py-3.5 text-sm bg-transparent focus:outline-none placeholder:text-slate-400"
              disabled={sending}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || sending}
              className="absolute right-2 bottom-2 w-9 h-9 flex items-center justify-center bg-navy text-white rounded-xl hover:bg-navy-light disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" strokeWidth={2.5} />}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 text-center mt-2">
            AI can make mistakes. Consult a healthcare professional for medical advice.
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import Image from "next/image";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Markdown from "@/components/Markdown";
import { IMAGE_PATHS } from "@/lib/constants";
import {
  ChatHistoryItem,
  fetchRecommendedQuestions,
  sendChatbotMessage,
} from "@/lib/api";
import styles from "./psaiTalk.module.css";

type Author = "user" | "assistant";

type Message = {
  id: number;
  author: Author;
  text: string;
};

const FALLBACK_PROMPTS = [
  "What is PSA Singapore's core business?",
  "How does PSA describe its culture?",
  "Which digital initiatives is PSA prioritising?",
];

const INTRO_MESSAGE =
  "Hi, I'm Sara, your AI partner. I'm here to help you navigate everything you need to know about PSA. Just ask!";

export default function PsaiTalkPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [history, setHistory] = useState<ChatHistoryItem[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>(FALLBACK_PROMPTS);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const inputBarRef = useRef<HTMLFormElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const threadRef = useRef<HTMLElement | null>(null);
  const historyRef = useRef<ChatHistoryItem[]>([]);

  const searchParams = useSearchParams();

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    let isMounted = true;
    fetchRecommendedQuestions()
      .then((items) => {
        if (isMounted && items.length) {
          setSuggestions(items.slice(0, 6));
        }
      })
      .catch(() => {
        /* keep fallback prompts */
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const sendPrompt = (prompt: string) => {
    setDraft(prompt);
    const el = textareaRef.current;
    if (el) {
      el.focus();
    }
  };

  const appendMessage = (message: Message) => {
    setMessages((prev) => [...prev, message]);
  };

  const submitMessage = async () => {
    const trimmed = draft.trim();
    if (!trimmed || isSending) return;

    setDraft("");
    setError(null);

    const baseId = Date.now();
    const userMessage: Message = { id: baseId, author: "user", text: trimmed };
    appendMessage(userMessage);

    const payloadHistory = historyRef.current;
    setIsSending(true);

    try {
      const answer = await sendChatbotMessage(trimmed, payloadHistory);
      const assistantMessage: Message = {
        id: baseId + 1,
        author: "assistant",
        text: answer.trim(),
      };
      appendMessage(assistantMessage);
      setHistory((prev) => [
        ...prev,
        { role: "user", content: trimmed },
        { role: "assistant", content: answer },
      ]);
    } catch (err) {
      const fallback =
        "Sara couldn't reach the knowledge base just now. Please try again in a moment.";
      appendMessage({ id: baseId + 1, author: "assistant", text: fallback });
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unable to reach PSAiTalk at the moment.");
      }
    } finally {
      setIsSending(false);
      const el = textareaRef.current;
      if (el) {
        el.style.height = "auto";
        el.style.overflowY = "hidden";
      }
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitMessage();
  };

  const hasConversation = messages.length > 0;

  const updateBarHeight = useCallback(() => {
    const bar = inputBarRef.current;
    const container = containerRef.current;
    if (!bar || !container) return;
    const h = bar.offsetHeight;
    container.style.setProperty("--input-bar-height", `${h}px`);
  }, []);

  const autosize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const cs = window.getComputedStyle(el);
    const lh = parseFloat(cs.lineHeight) || 20;
    const pt = parseFloat(cs.paddingTop) || 0;
    const pb = parseFloat(cs.paddingBottom) || 0;
    const bt = parseFloat(cs.borderTopWidth) || 0;
    const bb = parseFloat(cs.borderBottomWidth) || 0;
    const max = lh * 3 + pt + pb + bt + bb;
    const next = Math.min(el.scrollHeight, max);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
    updateBarHeight();
  }, [updateBarHeight]);

  useEffect(() => {
    autosize();
  }, [autosize, draft]);

  useEffect(() => {
    updateBarHeight();
    const ro = new ResizeObserver(() => updateBarHeight());
    if (inputBarRef.current) ro.observe(inputBarRef.current);
    const onResize = () => updateBarHeight();
    window.addEventListener("resize", onResize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [updateBarHeight]);

  useEffect(() => {
    const resetFlag = searchParams.get("reset");
    if (resetFlag !== null) {
      setMessages([]);
      setDraft("");
      setHistory([]);
      setError(null);
      const el = textareaRef.current;
      if (el) {
        el.style.height = "auto";
        el.style.overflowY = "hidden";
      }
    }
  }, [searchParams]);

  useEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const formDisabled = isSending || !draft.trim();
  const promptChoices = useMemo(() => suggestions.slice(0, 6), [suggestions]);

  return (
    <div className={styles.wrapper} ref={containerRef}>
      {!hasConversation && (
        <section className={styles.intro}>
          <div className={styles.avatar}>
            <Image src={IMAGE_PATHS.psaTalk} alt="Sara avatar" width={96} height={96} />
          </div>
          <h1 className={styles.title}>Sara</h1>
          <p className={styles.subtitle}>{INTRO_MESSAGE}</p>
          <div className={styles.prompts}>
            {promptChoices.map((prompt, index) => (
              <button
                type="button"
                key={`${prompt}-${index}`}
                className={styles.promptCard}
                onClick={() => sendPrompt(prompt)}
              >
                <span className={styles.promptNumber}>{String(index + 1).padStart(2, "0")}</span>
                <p>{prompt}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {hasConversation && (
        <section className={styles.thread} aria-live="polite" ref={threadRef}>
          {messages.map((message) => {
            const isAssistant = message.author === "assistant";
            return (
              <div
                key={message.id}
                className={`${styles.message} ${isAssistant ? styles.messageAssistant : styles.messageUser}`}
              >
                {isAssistant ? <Markdown>{message.text}</Markdown> : <p>{message.text}</p>}
                {isAssistant && (
                  <div className={styles.messageActions}>
                    <button type="button" aria-label="Like response">👍</button>
                    <button type="button" aria-label="Dislike response">👎</button>
                    <button
                      type="button"
                      aria-label="Copy response"
                      onClick={() => navigator.clipboard?.writeText(message.text).catch(() => undefined)}
                    >
                      ⧉
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      <form className={styles.inputBar} onSubmit={handleSubmit} ref={inputBarRef}>
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder="Ask me anything about PSA"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          aria-label="Ask Sara"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void submitMessage();
            }
          }}
        />
        <button type="submit" disabled={formDisabled}>
          {isSending ? "Sending…" : "Send"}
        </button>
      </form>

      {error && <p className={styles.errorBanner}>{error}</p>}
    </div>
  );
}

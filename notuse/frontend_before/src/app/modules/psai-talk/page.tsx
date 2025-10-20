"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ChatMessage,
  RecommendedQuestion,
  askChatbot,
  fetchRecommendedQuestions,
} from "@/lib/api";
import { IMAGE_PATHS } from "@/lib/constants";
import styles from "./psaiTalk.module.css";

type Message = {
  id: number;
  author: "user" | "sara";
  text: string;
};

const INTRO_MESSAGE =
  "Hi, I'm Sara, your AI partner. I'm here to help you navigate everything you need to know about PSA. Just ask!";

export default function PsaiTalkPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [suggestions, setSuggestions] = useState<RecommendedQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecommendedQuestions()
      .then((response) => setSuggestions(response.questions.slice(0, 3)))
      .catch(() => undefined);
  }, []);

  const hasConversation = messages.length > 0;

  const historyPayload: ChatMessage[] = useMemo(
    () =>
      messages.map((message) => ({
        role: message.author === "sara" ? "assistant" : "user",
        content: message.text,
      })),
    [messages],
  );

  const sendPrompt = (prompt: string) => {
    setDraft(prompt);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;

    const userMessage: Message = {
      id: Date.now(),
      author: "user",
      text: trimmed,
    };

    setMessages((previous) => [...previous, userMessage]);
    setDraft("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await askChatbot(trimmed, historyPayload);
      setMessages((previous) => [
        ...previous,
        {
          id: Date.now() + 1,
          author: "sara",
          text: response.answer,
        },
      ]);
    } catch (err) {
      setError((err as Error).message);
      setMessages((previous) => [
        ...previous,
        {
          id: Date.now() + 2,
          author: "sara",
          text: "I’m sorry, something went wrong retrieving information. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      {!hasConversation && (
        <section className={styles.intro}>
          <div className={styles.avatar}>
            <Image src={IMAGE_PATHS.psaTalk} alt="Sara avatar" width={96} height={96} />
          </div>
          <h1 className={styles.title}>Sara</h1>
          <p className={styles.subtitle}>{INTRO_MESSAGE}</p>
          <div className={styles.prompts}>
            {(suggestions.length ? suggestions.map((item) => item.question) : [
              "What is PSA Singapore's core business and global role?",
              "How does PSA Singapore describe its team culture?",
              "What services does PSA Singapore offer in supply chain orchestration?",
            ]).map((prompt, index) => (
              <button
                type="button"
                key={prompt}
                className={styles.promptCard}
                onClick={() => sendPrompt(prompt)}
              >
                <span className={styles.promptNumber}>0{index + 1}</span>
                <p>{prompt}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {hasConversation && (
        <section className={styles.thread} aria-live="polite">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`${styles.message} ${
                message.author === "user" ? styles.messageUser : styles.messageSara
              }`}
            >
              <p>{message.text}</p>
              {message.author === "sara" && (
                <div className={styles.messageActions}>
                  <button type="button" aria-label="Like response">
                    👍
                  </button>
                  <button type="button" aria-label="Dislike response">
                    👎
                  </button>
                  <button type="button" aria-label="Copy response">
                    ⧉
                  </button>
                </div>
              )}
            </div>
          ))}
          {error && <p className={styles.error}>{error}</p>}
        </section>
      )}

      <form className={styles.inputBar} onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Ask me anything about PSA"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          aria-label="Ask Sara"
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Thinking…" : "Send"}
        </button>
      </form>
    </div>
  );
}

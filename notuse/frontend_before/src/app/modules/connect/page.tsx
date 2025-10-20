"use client";

import Image from "next/image";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CommunityPost, fetchCommunity, polishCommunity } from "@/lib/api";
import styles from "./connect.module.css";

type BoardKey = "psa-events" | "alongside";

type PostState = Record<BoardKey, CommunityPost[]>;

const POLISH_STYLES = ["Professional", "Friendly", "Concise", "Humorous"] as const;

const BOARD_BANNERS: Record<
  BoardKey,
  { src: string; alt: string; label: string }
> = {
  "psa-events": {
    src: "/images/banner-psa-events.png",
    alt: "PSA Events updates banner",
    label: "PSA Events",
  },
  alongside: {
    src: "/images/banner-alongside.png",
    alt: "Alongside community banner",
    label: "Alongside",
  },
};

const BOARD_SEQUENCE: BoardKey[] = ["psa-events", "alongside"];

export default function ConnectPage() {
  const [activeBoard, setActiveBoard] = useState<BoardKey>("psa-events");
  const [posts, setPosts] = useState<PostState>({ "psa-events": [], alongside: [] });
  const [draft, setDraft] = useState("");
  const [selectedStyle, setSelectedStyle] =
    useState<(typeof POLISH_STYLES)[number]>("Professional");
  const [polishedPreview, setPolishedPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentPosts = useMemo(() => posts[activeBoard] ?? [], [posts, activeBoard]);

  const loadPosts = useCallback(async (board: BoardKey) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchCommunity(board);
      setPosts((previous) => ({
        ...previous,
        [board]: response.items,
      }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts(activeBoard).catch(() => undefined);
  }, [activeBoard, loadPosts]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;

    const fallbackPreview = `${trimmed}\n\n— Refined in a ${selectedStyle.toLowerCase()} tone ready for the ${
      activeBoard === "psa-events" ? "PSA Events" : "Alongside"
    } board.`;
    const polished = polishedPreview || fallbackPreview;

    const localPost: CommunityPost = {
      title: polished.slice(0, 120),
      description: polished,
      time: "Just now",
      posted_by: "You",
      board: activeBoard,
    };

    setPosts((previous) => ({
      ...previous,
      [activeBoard]: [localPost, ...(previous[activeBoard] ?? [])],
    }));
    setDraft("");
    setPolishedPreview("");
  };

  const handlePolish = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    try {
      const response = await polishCommunity(trimmed, selectedStyle);
      setPolishedPreview(response.polished_content);
    } catch (err) {
      setPolishedPreview(
        `${trimmed}\n\n— Refined in a ${selectedStyle.toLowerCase()} tone ready for the ${
          activeBoard === "psa-events" ? "PSA Events" : "Alongside"
        } board.`,
      );
      setError((err as Error).message);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.boardTabs}>
        {BOARD_SEQUENCE.map((boardKey) => {
          const banner = BOARD_BANNERS[boardKey];
          const isActive = activeBoard === boardKey;
          return (
            <button
              type="button"
              key={boardKey}
              className={`${styles.bannerButton} ${isActive ? styles.bannerActive : ""}`}
              onClick={() => setActiveBoard(boardKey)}
            >
              <Image
                src={banner.src}
                alt={banner.alt}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className={styles.bannerImage}
                priority={boardKey === "psa-events"}
              />
              <span className={styles.bannerMask} aria-hidden="true" />
              <span className="visually-hidden">{banner.label}</span>
            </button>
          );
        })}
      </div>
      <section className={styles.posts} aria-live="polite">
        {loading && <p className={styles.meta}>Loading posts…</p>}
        {error && <p className={styles.meta}>Unable to load posts: {error}</p>}
        {currentPosts.map((post) => (
          <article key={`${post.title}-${post.time}`} className={styles.postCard}>
            <div>
              <h2>{post.title}</h2>
              <p className={styles.meta}>
                {post.posted_by} · {post.time}
              </p>
            </div>
            <div className={styles.engagement}>
              <span aria-hidden="true">❤️</span>
              <span aria-hidden="true">💬</span>
            </div>
          </article>
        ))}
        {polishedPreview && (
          <div className={styles.polishPreview}>
            <h3>Polished suggestion</h3>
            <p>{polishedPreview}</p>
          </div>
        )}
      </section>
      <form className={styles.composer} onSubmit={handleSubmit}>
        <textarea
          placeholder="Share what is happening in PSA…"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={3}
          aria-label="Compose a new post"
        />
        <div className={styles.composerActions}>
          <div className={styles.polishControls}>
            <label htmlFor="polish-style" className={styles.polishLabel}>
              Style
            </label>
            <select
              id="polish-style"
              value={selectedStyle}
              onChange={(event) =>
                setSelectedStyle(event.target.value as (typeof POLISH_STYLES)[number])
              }
            >
              {POLISH_STYLES.map((style) => (
                <option key={style} value={style}>
                  {style}
                </option>
              ))}
            </select>
            <button type="button" onClick={handlePolish} disabled={!draft.trim()}>
              Polish
            </button>
          </div>
          <button type="submit" className={styles.sendButton} disabled={!draft.trim()}>
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

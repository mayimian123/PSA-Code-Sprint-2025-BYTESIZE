"use client";

import Image from "next/image";
import {
  FormEvent,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import Markdown from "@/components/Markdown";
import {
  CommunityPost,
  fetchCommunityPosts,
  polishCommunityContent,
} from "@/lib/api";
import styles from "./connect.module.css";

type BoardKey = "psa-events" | "alongside";

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
  return (
    <Suspense fallback={<div className={styles.statusMessage}>Loading connect feed…</div>}>
      <ConnectContent />
    </Suspense>
  );
}

function ConnectContent() {
  const [activeBoard, setActiveBoard] = useState<BoardKey>("psa-events");
  const [posts, setPosts] = useState<Record<BoardKey, CommunityPost[]>>({
    "psa-events": [],
    alongside: [],
  });
  const [loadingBoards, setLoadingBoards] = useState<Record<BoardKey, boolean>>({
    "psa-events": false,
    alongside: false,
  });
  const [boardErrors, setBoardErrors] = useState<Record<BoardKey, string | null>>({
    "psa-events": null,
    alongside: null,
  });
  const [draft, setDraft] = useState("");
  const [selectedStyle, setSelectedStyle] =
    useState<(typeof POLISH_STYLES)[number]>("Professional");
  const [polishedPreview, setPolishedPreview] = useState("");
  const [polishError, setPolishError] = useState<string | null>(null);
  const [isPolishing, setIsPolishing] = useState(false);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLFormElement | null>(null);
  const postsRef = useRef<HTMLElement | null>(null);
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const searchParams = useSearchParams();

  const currentPosts = useMemo(() => posts[activeBoard], [posts, activeBoard]);
  const boardError = boardErrors[activeBoard];
  const boardLoading = loadingBoards[activeBoard];

  const loadBoard = useCallback(
    async (board: BoardKey) => {
      setLoadingBoards((prev) => ({ ...prev, [board]: true }));
      setBoardErrors((prev) => ({ ...prev, [board]: null }));
      try {
        const data = await fetchCommunityPosts(board);
        setPosts((prev) => ({ ...prev, [board]: data }));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to load community posts.";
        setBoardErrors((prev) => ({ ...prev, [board]: message }));
      } finally {
        setLoadingBoards((prev) => ({ ...prev, [board]: false }));
      }
    },
    [],
  );

  useEffect(() => {
    void loadBoard("psa-events");
  }, [loadBoard]);

  useEffect(() => {
    if (!currentPosts.length && !boardLoading && !boardError) {
      void loadBoard(activeBoard);
    }
  }, [activeBoard, currentPosts.length, boardLoading, boardError, loadBoard]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;

    const content = polishedPreview || trimmed;
    const [firstLine, ...rest] = content.split("\n");
    const description = rest.join("\n").trim();

    const newPost: CommunityPost = {
      title: firstLine || "New post",
      description: description || content,
      time: "Just now",
      postedBy: "You",
    };

    setPosts((previous) => ({
      ...previous,
      [activeBoard]: [newPost, ...previous[activeBoard]],
    }));
    setDraft("");
    setPolishedPreview("");
    setPolishError(null);

    requestAnimationFrame(() => {
      postsRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const handlePolish = async () => {
    const trimmed = draft.trim();
    if (!trimmed || isPolishing) return;
    setIsPolishing(true);
    setPolishError(null);
    try {
      const polished = await polishCommunityContent(trimmed, selectedStyle);
      setPolishedPreview(polished.trim());
    } catch (error) {
      setPolishError(
        error instanceof Error
          ? error.message
          : "Sara couldn't polish this post right now."
      );
    } finally {
      setIsPolishing(false);
    }
  };

  useEffect(() => {
    const updateLayout = () => {
      const composer = composerRef.current;
      const wrapper = wrapperRef.current;
      const list = postsRef.current;
      const tabs = tabsRef.current;
      if (!composer || !wrapper) return;
      const composerHeight = composer.offsetHeight;
      wrapper.style.setProperty("--composer-height", `${composerHeight}px`);

      if (list) {
        const available = wrapper.clientHeight - composerHeight - (tabs?.offsetHeight ?? 0) - 20;
        list.style.setProperty("max-height", `${Math.max(160, available)}px`);
      }
    };

    updateLayout();
    const observers: ResizeObserver[] = [];
    if (composerRef.current) {
      const ro = new ResizeObserver(updateLayout);
      ro.observe(composerRef.current);
      observers.push(ro);
    }
    if (postsRef.current) {
      const ro = new ResizeObserver(updateLayout);
      ro.observe(postsRef.current);
      observers.push(ro);
    }
    if (tabsRef.current) {
      const ro = new ResizeObserver(updateLayout);
      ro.observe(tabsRef.current);
      observers.push(ro);
    }
    window.addEventListener("resize", updateLayout);
    return () => {
      observers.forEach((observer) => observer.disconnect());
      window.removeEventListener("resize", updateLayout);
    };
  }, []);

  useEffect(() => {
    const flag = searchParams.get("reset");
    if (flag !== null) {
      setActiveBoard("psa-events");
      setDraft("");
      setPolishedPreview("");
      setPolishError(null);
      postsRef.current?.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [searchParams]);

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <div className={styles.boardTabs} ref={tabsRef}>
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

      <section className={styles.posts} aria-live="polite" ref={postsRef}>
        {boardLoading && !currentPosts.length && (
          <p className={styles.statusMessage}>Loading posts…</p>
        )}
        {boardError && (
          <p className={styles.statusMessage} role="alert">
            {boardError}
          </p>
        )}
        {!boardLoading && !boardError && currentPosts.map((post, index) => (
          <article key={`${post.title}-${index}`} className={styles.postCard}>
            <div>
              <h2>{post.title}</h2>
              <p className={styles.meta}>
                {post.postedBy} · {post.time}
              </p>
              {post.description && <p className={styles.description}>{post.description}</p>}
            </div>
          </article>
        ))}
        {polishedPreview && (
          <div className={styles.polishPreview}>
            <h3>Polished suggestion</h3>
            <Markdown>{polishedPreview}</Markdown>
          </div>
        )}
      </section>

      <form className={styles.composer} onSubmit={handleSubmit} ref={composerRef}>
        <textarea
          placeholder="Share what is happening in PSA..."
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={3}
          aria-label="Compose a new post"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (draft.trim()) {
                (event.currentTarget.form as HTMLFormElement | null)?.requestSubmit();
              }
            }
          }}
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
            <button type="button" onClick={() => void handlePolish()} disabled={!draft.trim() || isPolishing}>
              {isPolishing ? "Polishing…" : "Polish"}
            </button>
          </div>
          <button type="submit" className={styles.sendButton} disabled={!draft.trim()}>
            Post
          </button>
        </div>
        {polishError && (
          <p className={styles.statusMessage} role="alert">
            {polishError}
          </p>
        )}
      </form>
    </div>
  );
}

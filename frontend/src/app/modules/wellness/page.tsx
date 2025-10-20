"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { MotionDiv, MotionProvider, useScrollValues } from "@/components/motion";
import { fetchWellnessEvents, WellnessEvent } from "@/lib/api";
import styles from "./wellness.module.css";

type MoodKey = "relaxed" | "stressed" | "tired" | "motivated" | "confused";

const MOODS: Record<MoodKey, { label: string; emoji: string }> = {
  relaxed: { label: "Relaxed and Calm", emoji: "😌" },
  stressed: { label: "Stressed and Anxious", emoji: "😟" },
  tired: { label: "Tired and Fatigued", emoji: "😴" },
  motivated: { label: "Motivated and Energetic", emoji: "💪" },
  confused: { label: "Confused and Overwhelmed", emoji: "😕" },
};

const EVENT_IMAGES: Record<string, string> = {
  music: "/images/wellness/music-relax.png",
  "health screening": "/images/wellness/health-screen.png",
  fitness: "/images/wellness/fitness-flow.png",
  workshops: "/images/wellness/wellness-talks.png",
};

function getEventImage(category: string) {
  const key = category.toLowerCase();
  return EVENT_IMAGES[key] ?? "/images/wellness/wellness-talks.png";
}

export default function WellnessPage() {
  const [selectedMood, setSelectedMood] = useState<MoodKey | undefined>();
  const [events, setEvents] = useState<WellnessEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLElement | null>(null);
  const { headerScale, headerY, moodOpacity, moodY } = useScrollValues(listRef);

  useEffect(() => {
    let cancelled = false;
    fetchWellnessEvents()
      .then((data) => {
        if (!cancelled) setEvents(data);
      })
      .catch((err) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Unable to load wellness events.";
          setError(message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <MotionProvider>
      <div className={styles.wrapper}>
        <MotionDiv
          as="section"
          className={styles.profile}
          style={{
            y: headerY,
            scale: headerScale,
          }}
        >
          <div className={styles.userRow}>
            <h1 className={styles.userName}>Welcome back</h1>
            <div className={styles.avatar} aria-hidden="true">
              <Image src="/images/icon-account.png" alt="User avatar" fill sizes="48px" />
            </div>
          </div>
          <p className={styles.encourage}>
            Keep breathing and keep believing. Small resets power big breakthroughs.
          </p>
          <MotionDiv
            className={styles.moodPicker}
            style={{
              opacity: moodOpacity,
              y: moodY,
            }}
          >
            {Object.entries(MOODS).map(([key, value]) => {
              const moodKey = key as MoodKey;
              const isSelected = selectedMood === moodKey;
              return (
                <button
                  type="button"
                  key={moodKey}
                  className={`${styles.moodButton} ${isSelected ? styles.moodSelected : ""}`}
                  onClick={() => setSelectedMood(isSelected ? undefined : moodKey)}
                  aria-pressed={isSelected}
                >
                  <span aria-hidden="true" className={styles.moodEmoji}>
                    {value.emoji}
                  </span>
                  <span className={styles.moodLabel}>{value.label}</span>
                </button>
              );
            })}
          </MotionDiv>
        </MotionDiv>
        <section className={styles.activities} ref={listRef} aria-live="polite">
          {error && <p className={styles.statusMessage} role="alert">{error}</p>}
          {!error && loading && <p className={styles.statusMessage}>Loading wellness events…</p>}
          {!loading && !error && events.map((event) => (
            <article key={`${event.category}-${event.title}`} className={styles.card}>
              <div className={styles.cardImage}>
                <Image src={getEventImage(event.category)} alt={`${event.category} artwork`} fill />
              </div>
              <div className={styles.cardContent}>
                <span className={styles.category}>{event.category}</span>
                <h2>{event.title}</h2>
                <p>{event.description}</p>
                <p className={styles.time}>{event.dateTime}</p>
                <p className={styles.location}>{event.location}</p>
              </div>
            </article>
          ))}
        </section>
      </div>
    </MotionProvider>
  );
}

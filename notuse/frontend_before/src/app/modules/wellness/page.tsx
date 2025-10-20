"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { WellnessEvent, fetchWellnessEvents } from "@/lib/api";
import styles from "./wellness.module.css";

type MoodKey = "relaxed" | "stressed" | "tired" | "motivated" | "confused";

const CATEGORY_IMAGE: Record<string, string> = {
  music: "/images/wellness/music-relax.png",
  "health screening": "/images/wellness/health-screen.png",
  fitness: "/images/wellness/fitness-flow.png",
  workshops: "/images/wellness/wellness-talks.png",
  mindfulness: "/images/wellness/music-relax.png",
};

const MOODS: Record<MoodKey, { label: string; emoji: string }> = {
  relaxed: { label: "Relaxed and Calm", emoji: "😌" },
  stressed: { label: "Stressed and Anxious", emoji: "😟" },
  tired: { label: "Tired and Fatigued", emoji: "😴" },
  motivated: { label: "Motivated and Energetic", emoji: "💪" },
  confused: { label: "Confused and Overwhelmed", emoji: "😕" },
};

export default function WellnessPage() {
  const [selectedMood, setSelectedMood] = useState<MoodKey | undefined>();
  const [events, setEvents] = useState<WellnessEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWellnessEvents()
      .then((response) => setEvents(response.events))
      .catch((err) => setError((err as Error).message));
  }, []);

  return (
    <div className={styles.wrapper}>
      <section className={styles.profile}>
        <div className={styles.profileInfo}>
          <h1 className={styles.userName}>Jamie Lee</h1>
          <p className={styles.encourage}>
            “Keep breathing and keep believing. Small resets power big breakthroughs.”
          </p>
        </div>
        <div className={styles.moodPicker}>
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
        </div>
      </section>
      <section className={styles.activities}>
        {error && <p className={styles.category}>Unable to load wellness events: {error}</p>}
        {events.map((activity) => (
          <article key={`${activity.category}-${activity.title}`} className={styles.card}>
            <div className={styles.cardImage}>
              <Image
                src={
                  CATEGORY_IMAGE[
                    activity.category.toLowerCase()
                  ] ?? CATEGORY_IMAGE.music
                }
                alt={`${activity.category} artwork`}
                fill
              />
            </div>
            <div className={styles.cardContent}>
              <span className={styles.category}>{activity.category}</span>
              <h2>{activity.title}</h2>
              <p>{activity.description}</p>
              <p className={styles.time}>{activity.date_time}</p>
              <p className={styles.time}>{activity.location}</p>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

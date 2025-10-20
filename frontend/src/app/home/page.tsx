"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { IMAGE_PATHS } from "@/lib/constants";
import styles from "./home.module.css";

type ImgBox = { left: number; top: number; width: number; height: number } | null;

export default function HomePage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [imgBox, setImgBox] = useState<ImgBox>(null);

  const recalc = useCallback(() => {
    if (!containerRef.current || !natural) return;
    const box = containerRef.current.getBoundingClientRect();
    const cw = box.width;
    const ch = box.height;
    const iw = natural.w;
    const ih = natural.h;
    const imageRatio = iw / ih;
    const containerRatio = cw / ch;

    let width = cw;
    let height = cw / imageRatio;
    let left = 0;
    let top = 0;

    if (containerRatio > imageRatio) {
      // limited by height
      height = ch;
      width = ch * imageRatio;
      left = (cw - width) / 2;
      top = 0;
    } else {
      // limited by width
      width = cw;
      height = cw / imageRatio;
      left = 0;
      top = (ch - height) / 2;
    }
    setImgBox({ left, top, width, height });
  }, [natural]);

  useEffect(() => {
    recalc();
    if (!containerRef.current) return;
    const obs = new ResizeObserver(() => recalc());
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [recalc]);

  const pos = (xPct: number, yPct: number) => {
    if (!imgBox) return { left: `${xPct * 100}%`, top: `${yPct * 100}%` };
    const left = imgBox.left + imgBox.width * xPct;
    const top = imgBox.top + imgBox.height * yPct;
    return { left: `${left}px`, top: `${top}px` };
  };

  return (
    <div className={styles.wrapper} ref={containerRef}>
      <Image
        src={IMAGE_PATHS.homeMap}
        alt="oPSAra home navigation map"
        fill
        priority
        className={styles.backgroundImage}
        onLoadingComplete={(img) => {
          setNatural({ w: img.naturalWidth, h: img.naturalHeight });
          // run after first paint to ensure container sizes are known
          requestAnimationFrame(recalc);
        }}
      />
      <header className={styles.header}>
        <p className={styles.welcome}>
          Welcome to{" "}
          <span className={styles.inlineLogo} aria-hidden="true">
            <Logo className={styles.inlineLogoImage} />
          </span>
          <span className="visually-hidden">oPSAra</span>
        </p>
        <p className={styles.guidance}>
          Choose a beacon on the map to continue your growth journey.
        </p>
      </header>
      <section className={styles.hotspots}>
        {/* Octopus → PSAiTalk */}
        <Link
          href="/modules/psai-talk"
          className={styles.marker}
          style={pos(0.22, 0.28)}
          aria-label="Open PSAiTalk"
        >
          <span className={styles.markerPulse} aria-hidden="true" />
          <span className={styles.markerLabel}>PSAiTalk</span>
        </Link>

        {/* Crane with containers → Learning Hub */}
        <Link
          href="/modules/learning-hub"
          className={styles.marker}
          style={pos(0.30, 0.68)}
          aria-label="Open Learning Hub"
        >
          <span className={styles.markerPulse} aria-hidden="true" />
          <span className={styles.markerLabel}>Learning Hub</span>
        </Link>

        {/* Ship → Connect@PSA */}
        <Link
          href="/modules/connect"
          className={styles.marker}
          style={pos(0.50, 0.48)}
          aria-label="Open Connect@PSA"
        >
          <span className={styles.markerPulse} aria-hidden="true" />
          <span className={styles.markerLabel}>Connect@PSA</span>
        </Link>

        {/* Lighthouse → Career Navigator */}
        <Link
          href="/modules/career-navigator"
          className={styles.marker}
          style={pos(0.78, 0.30)}
          aria-label="Open Career Navigator"
        >
          <span className={styles.markerPulse} aria-hidden="true" />
          <span className={styles.markerLabel}>Career Navigator</span>
        </Link>

        {/* People group → Wellness */}
        <Link
          href="/modules/wellness"
          className={styles.marker}
          style={pos(0.72, 0.70)}
          aria-label="Open Wellness"
        >
          <span className={styles.markerPulse} aria-hidden="true" />
          <span className={styles.markerLabel}>Wellness</span>
        </Link>
      </section>
    </div>
  );
}

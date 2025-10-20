"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import styles from "./modulesLayout.module.css";

const SIDEBAR_WIDTH = 240; // match AppSidebar max-width

export default function ModulesLayout({ children }: { children: ReactNode }) {
  const [isNarrow, setIsNarrow] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1080px)");
    const update = () => {
      setIsNarrow(mq.matches);
      // Auto-collapse when entering narrow; keep open state when returning to wide
      if (mq.matches) setIsOpen(false);
    };
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const shellClass = styles.shell;
  const mainClass = useMemo(() => {
    return isNarrow ? styles.main : `${styles.main} ${styles.mainWithSidebar}`;
  }, [isNarrow]);

  return (
    <div className={shellClass}>
      {/* Sidebar host: fixed on wide, slide-in overlay on narrow */}
      <div
        className={
          !isNarrow
            ? styles.sidebarHostFixed
            : isOpen
            ? `${styles.sidebarHost} ${styles.sidebarHostOpen}`
            : `${styles.sidebarHost} ${styles.sidebarHostHidden}`
        }
        style={!isNarrow ? { width: SIDEBAR_WIDTH } : undefined}
      >
        <AppSidebar variant={isNarrow ? "overlay" : "fixed"} />
      </div>

      {/* Overlay backdrop when open on narrow */}
      {isNarrow && isOpen ? (
        <button
          aria-label="Close sidebar"
          className={styles.overlay}
          onClick={() => setIsOpen(false)}
        />
      ) : null}

      {/* Toggle button on narrow screens */}
      {isNarrow && !isOpen ? (
        <button
          type="button"
          aria-label="Open navigation"
          className={styles.sidebarToggle}
          onClick={() => setIsOpen(true)}
        >
          ☰
        </button>
      ) : null}

      <main className={mainClass}>{children}</main>
    </div>
  );
}

import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { NotificationBar } from "@/components/NotificationBar";
import { IMAGE_PATHS } from "@/lib/constants";
import styles from "./home.module.css";

const MARKERS = [
  {
    key: "psai-talk",
    label: "PSAiTalk",
    path: "/modules/psai-talk",
    top: "28%",
    left: "22%",
  },
  {
    key: "learning-hub",
    label: "Learning Hub",
    path: "/modules/learning-hub",
    top: "68%",
    left: "30%",
  },
  {
    key: "connect",
    label: "Connect@PSA",
    path: "/modules/connect",
    top: "48%",
    left: "50%",
  },
  {
    key: "career-navigator",
    label: "Career Navigator",
    path: "/modules/career-navigator",
    top: "30%",
    left: "78%",
  },
  {
    key: "wellness",
    label: "Wellness",
    path: "/modules/wellness",
    top: "70%",
    left: "72%",
  },
];

export default function HomePage() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.map}>
        <Image
          src={IMAGE_PATHS.homeMap}
          alt="oPSAra home navigation map"
          fill
          priority
          className={styles.mapImage}
        />
      </div>
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
      <main className={styles.main}>
        <section className={styles.mapArea}>
          {MARKERS.map((marker) => (
            <Link
              key={marker.key}
              href={marker.path}
              className={styles.marker}
              style={{ top: marker.top, left: marker.left }}
            >
              <span className={styles.markerPulse} aria-hidden="true" />
              <span className={styles.markerLabel}>{marker.label}</span>
            </Link>
          ))}
        </section>
        <NotificationBar />
      </main>
    </div>
  );
}

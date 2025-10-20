import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { IMAGE_PATHS } from "@/lib/constants";
import styles from "./landing.module.css";

export default function LandingPage() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.background}>
        <Image
          src={IMAGE_PATHS.landingBackground}
          alt="Landing background"
          fill
          priority
          className={styles.backgroundImage}
        />
      </div>
      <header className={styles.brand}>
        <Logo variant="psa" />
      </header>
      <div className={styles.taglineBlock}>
        <p className={styles.tagline}>
          <span className={styles.taglineLine}>Empower Every Employee</span>
          <span className={styles.taglineLine}>to Design Their Future in PSA</span>
        </p>
      </div>
      <Link href="/login" className={styles.cta}>
        Start My Journey
      </Link>
    </div>
  );
}

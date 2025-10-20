import Image from "next/image";
import Link from "next/link";
import { IMAGE_PATHS, LEARNING_HUB_FIELDS } from "@/lib/constants";
import styles from "./learningHub.module.css";

export default function LearningHubOverviewPage() {
  return (
    <section className={styles.overview}>
      <div className={styles.background}>
        <Image
          src={IMAGE_PATHS.learningBackdrop}
          alt="Learning Hub sky"
          fill
          className={styles.backgroundImage}
        />
      </div>
      <h1 className={styles.heading}>Discover a space curated for your next learning leap.</h1>
      <div className={styles.contentScroll}>
        <div className={styles.fieldsGrid}>
          {LEARNING_HUB_FIELDS.map((field) => (
            <Link
              key={field}
              href={`/modules/learning-hub/content?category=${encodeURIComponent(field)}`}
              className={styles.fieldCard}
            >
              <span>{field}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

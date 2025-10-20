import Image from "next/image";
import Link from "next/link";
import { IMAGE_PATHS, LEARNING_HUB_FIELDS } from "@/lib/constants";
import styles from "./learningHub.module.css";

const FIELD_POSITIONS = [
  { top: "24%", left: "24%" },
  { top: "18%", left: "50%" },
  { top: "24%", left: "76%" },
  { top: "64%", left: "38%" },
  { top: "60%", left: "66%" },
];

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
      <div className={styles.fields}>
        {LEARNING_HUB_FIELDS.map((field, index) => (
          <Link
            key={field}
            href={`/modules/learning-hub/content?category=${encodeURIComponent(field)}`}
            className={styles.field}
            style={FIELD_POSITIONS[index]}
          >
            <span>{field}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

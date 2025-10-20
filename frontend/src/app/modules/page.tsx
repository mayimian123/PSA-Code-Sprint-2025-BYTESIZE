import Link from "next/link";
import { MODULE_ROUTES } from "@/lib/constants";
import styles from "./modulesIndex.module.css";

export default function ModulesIndexPage() {
  return (
    <section className={styles.wrapper}>
      <div className={styles.intro}>
        <h1>Select a module to continue</h1>
        <p>
          Use the sidebar or pick an area below to dive straight into conversations, community,
          learning, or wellbeing tools.
        </p>
      </div>
      <div className={styles.grid}>
        {MODULE_ROUTES.map((module) => (
          <Link key={module.key} href={module.path} className={styles.card}>
            <span className={styles.label}>{module.label}</span>
            <span className={styles.path}>{module.path.replace("/modules/", "")}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

